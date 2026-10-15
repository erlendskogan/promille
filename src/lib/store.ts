import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Entry, Profile } from './bac'
import { supabase } from './supabase'

export interface Person extends Profile {
  key: string
}

export interface Member extends Person {
  entries: Entry[]
}

interface UserRow {
  key: string
  name: string
  weight: number
  sex: 'm' | 'f'
}

interface EntryRow {
  id: string
  user_key: string
  drink_id: string
  name: string
  ml: number
  abv: number
  count: number
  time: string
}

type Owned = Entry & { userKey: string }

const CURRENT = 'promille:current'
const LEGACY = 'promille:v1'
const DAY = 86_400_000

export const userKey = (name: string) => name.trim().toLowerCase()

const toPerson = (r: UserRow): Person => ({ key: r.key, name: r.name, weight: r.weight, sex: r.sex })
const toEntry = (r: EntryRow): Owned => ({
  id: r.id,
  userKey: r.user_key,
  drinkId: r.drink_id,
  name: r.name,
  ml: r.ml,
  abv: r.abv,
  count: r.count,
  time: Date.parse(r.time),
})
const toRow = (e: Owned): EntryRow => ({
  id: e.id,
  user_key: e.userKey,
  drink_id: e.drinkId,
  name: e.name,
  ml: e.ml,
  abv: e.abv,
  count: e.count,
  time: new Date(e.time).toISOString(),
})

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10)

const storage = {
  get(k: string) {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set(k: string, v: string | null) {
    try {
      if (v === null) localStorage.removeItem(k)
      else localStorage.setItem(k, v)
    } catch {
      /* ignore */
    }
  },
}

/** Entries saved by the first, local-only version of the app */
function legacyEntries(key: string): Entry[] {
  try {
    const s = JSON.parse(storage.get(LEGACY) ?? 'null')
    return s?.users?.[key]?.entries ?? []
  } catch {
    return []
  }
}

const byId = <T extends { id: string }>(list: T[]) => Object.fromEntries(list.map((x) => [x.id, x]))
const without = <T,>(rec: Record<string, T>, drop: (k: string, v: T) => boolean) =>
  Object.fromEntries(Object.entries(rec).filter(([k, v]) => !drop(k, v)))

export function useStore() {
  const [people, setPeople] = useState<Record<string, Person>>({})
  const [entries, setEntries] = useState<Record<string, Owned>>({})
  const [current, setCurrent] = useState<string | null>(() => storage.get(CURRENT))
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const currentRef = useRef(current)
  useEffect(() => {
    currentRef.current = current
  }, [current])

  const fail = useCallback(() => setError('Fikk ikke lagret. Sjekk nettforbindelsen.'), [])

  const setMe = useCallback((key: string | null) => {
    currentRef.current = key
    setCurrent(key)
    storage.set(CURRENT, key)
  }, [])

  const loadOwn = useCallback(async (key: string) => {
    const { data, error } = await supabase.from('entries').select('*').eq('user_key', key).order('time').limit(5000)
    if (error || !data) return
    setEntries((s) => ({ ...s, ...byId((data as EntryRow[]).map(toEntry)) }))
  }, [])

  const load = useCallback(async () => {
    const since = Date.now() - 2 * DAY
    const [u, e] = await Promise.all([
      supabase.from('users').select('key,name,weight,sex'),
      supabase.from('entries').select('*').gte('time', new Date(since).toISOString()).order('time').limit(5000),
    ])
    if (u.error || e.error) {
      setStatus((s) => (s === 'ready' ? s : 'error'))
      return
    }
    const ppl = Object.fromEntries((u.data as UserRow[]).map((r) => [r.key, toPerson(r)]))
    setPeople(ppl)
    setEntries((s) => ({
      // keep older own history, replace the recent window
      ...without(s, (_, x) => x.time >= since),
      ...byId((e.data as EntryRow[]).map(toEntry)),
    }))
    setStatus('ready')
    const me = currentRef.current
    if (me && !ppl[me]) setMe(null)
  }, [setMe])

  useEffect(() => {
    load()
    const vis = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', vis)
    return () => document.removeEventListener('visibilitychange', vis)
  }, [load])

  useEffect(() => {
    if (current && status === 'ready') loadOwn(current)
  }, [current, status, loadOwn])

  // Live updates from everyone
  useEffect(() => {
    const channel = supabase
      .channel('promille')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, (p) => {
        if (p.eventType === 'DELETE') {
          const id = (p.old as Partial<EntryRow>).id
          if (id) setEntries((s) => without(s, (k) => k === id))
        } else {
          const e = toEntry(p.new as EntryRow)
          setEntries((s) => ({ ...s, [e.id]: e }))
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (p) => {
        if (p.eventType === 'DELETE') {
          const key = (p.old as Partial<UserRow>).key
          if (!key) return
          setPeople((s) => without(s, (k) => k === key))
          setEntries((s) => without(s, (_, e) => e.userKey === key))
        } else {
          const r = toPerson(p.new as UserRow)
          setPeople((s) => ({ ...s, [r.key]: r }))
        }
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const members = useMemo<Member[]>(() => {
    const grouped: Record<string, Entry[]> = {}
    for (const e of Object.values(entries)) (grouped[e.userKey] ??= []).push(e)
    return Object.values(people).map((p) => ({ ...p, entries: (grouped[p.key] ?? []).sort((a, b) => a.time - b.time) }))
  }, [people, entries])

  const user = (current && members.find((m) => m.key === current)) || null

  const login = useCallback((name: string) => setMe(userKey(name)), [setMe])

  const register = useCallback(
    async (p: Profile) => {
      const key = userKey(p.name)
      const row: UserRow = { key, name: p.name.trim(), weight: p.weight, sex: p.sex }
      const { error } = await supabase.from('users').upsert(row)
      if (error) {
        fail()
        return false
      }
      setPeople((s) => ({ ...s, [key]: toPerson(row) }))
      const old = legacyEntries(key).map((e) => ({ ...e, userKey: key }))
      if (old.length) {
        const res = await supabase.from('entries').upsert(old.map(toRow))
        if (!res.error) setEntries((s) => ({ ...s, ...byId(old) }))
      }
      setMe(key)
      return true
    },
    [fail, setMe],
  )

  const logout = useCallback(() => setMe(null), [setMe])

  const addEntry = useCallback(
    async (e: Omit<Entry, 'id'>) => {
      const me = currentRef.current
      if (!me) return
      const full: Owned = { ...e, id: newId(), userKey: me }
      setEntries((s) => ({ ...s, [full.id]: full }))
      const { error } = await supabase.from('entries').insert(toRow(full))
      if (error) {
        setEntries((s) => without(s, (k) => k === full.id))
        fail()
      }
    },
    [fail],
  )

  const removeEntry = useCallback(
    async (entry: Entry) => {
      setEntries((s) => without(s, (k) => k === entry.id))
      const { error } = await supabase.from('entries').delete().eq('id', entry.id)
      if (error) {
        const me = currentRef.current
        if (me) setEntries((s) => ({ ...s, [entry.id]: { ...entry, userKey: me } }))
        fail()
      }
    },
    [fail],
  )

  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const pending = useRef<Partial<Profile>>({})
  const updateProfile = useCallback(
    (p: Partial<Profile>) => {
      const me = currentRef.current
      if (!me) return
      setPeople((s) => ({ ...s, [me]: { ...s[me], ...p } }))
      pending.current = { ...pending.current, ...p }
      const w = pending.current.weight
      if (w !== undefined && (w < 30 || w > 250)) return // half-typed; saved on blur
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        const patch = pending.current
        pending.current = {}
        const { error } = await supabase.from('users').update(patch).eq('key', me)
        if (error) fail()
      }, 600)
    },
    [fail],
  )

  const clearEntries = useCallback(async () => {
    const me = currentRef.current
    if (!me) return
    setEntries((s) => without(s, (_, e) => e.userKey === me))
    const { error } = await supabase.from('entries').delete().eq('user_key', me)
    if (error) fail()
  }, [fail])

  const deleteUser = useCallback(async () => {
    const me = currentRef.current
    if (!me) return
    const { error } = await supabase.from('users').delete().eq('key', me)
    if (error) return fail()
    setPeople((s) => without(s, (k) => k === me))
    setMe(null)
  }, [fail, setMe])

  return {
    status,
    error,
    clearError: useCallback(() => setError(null), []),
    reload: load,
    hasSession: current !== null,
    user,
    members,
    exists: (n: string) => !!people[userKey(n)],
    login,
    register,
    logout,
    addEntry,
    removeEntry,
    updateProfile,
    clearEntries,
    deleteUser,
  }
}

export type Store = ReturnType<typeof useStore>
