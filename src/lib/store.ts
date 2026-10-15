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

const SESSION = 'promille:session'
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

const rowFor = (e: Entry) => {
  const { user_key: _k, ...row } = toRow({ ...e, userKey: '' })
  return row
}

export type LoginResult =
  | { ok: true }
  | { ok: false; error: 'wrong_pin' | 'locked' | 'no_user' | 'name_taken' | 'bad_pin' | 'network'; left?: number; until?: string }

interface Session {
  key: string
  token: string
}

const readSession = (): Session | null => {
  try {
    const s = JSON.parse(storage.get(SESSION) ?? 'null')
    return s?.key && s?.token ? s : null
  } catch {
    return null
  }
}

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
  const [session, setSession] = useState<Session | null>(readSession)
  const current = session?.key ?? null
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const sessionRef = useRef(session)
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const setMe = useCallback((s: Session | null) => {
    sessionRef.current = s
    setSession(s)
    storage.set(SESSION, s ? JSON.stringify(s) : null)
  }, [])

  const fail = useCallback(
    (err?: { code?: string } | null) => {
      if (err?.code === '28000') {
        setMe(null)
        setError('Du er logget ut. Logg inn med PIN-koden din igjen.')
      } else setError('Fikk ikke lagret. Sjekk nettforbindelsen.')
    },
    [setMe],
  )

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
    const me = sessionRef.current
    if (me) {
      const who = await supabase.rpc('promille_whoami', { p_token: me.token })
      if (!who.error && who.data !== me.key) setMe(null)
    }
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

  /** Upload entries saved by the first, local-only version of the app */
  const migrate = useCallback(async (token: string, key: string) => {
    const old = legacyEntries(key)
    if (!old.length) return
    const res = await supabase.rpc('promille_add_entries', { p_token: token, p_entries: old.map(rowFor) })
    if (!res.error) setEntries((s) => ({ ...s, ...byId(old.map((e) => ({ ...e, userKey: key }))) }))
  }, [])

  const finish = useCallback(
    async (data: unknown): Promise<LoginResult> => {
      const r = data as { token?: string; key?: string; error?: string; left?: number; until?: string }
      if (!r?.token || !r.key) return { ok: false, error: (r?.error as 'wrong_pin') ?? 'network', left: r?.left, until: r?.until }
      setMe({ key: r.key, token: r.token })
      await load()
      migrate(r.token, r.key)
      return { ok: true }
    },
    [setMe, load, migrate],
  )

  const login = useCallback(
    async (name: string, pin: string): Promise<LoginResult> => {
      const { data, error } = await supabase.rpc('promille_login', { p_name: name, p_pin: pin })
      if (error) return { ok: false, error: 'network' }
      return finish(data)
    },
    [finish],
  )

  const register = useCallback(
    async (p: Profile, pin: string): Promise<LoginResult> => {
      const { data, error } = await supabase.rpc('promille_register', {
        p_name: p.name,
        p_weight: p.weight,
        p_sex: p.sex,
        p_pin: pin,
      })
      if (error) return { ok: false, error: 'network' }
      return finish(data)
    },
    [finish],
  )

  const hasPin = useCallback(async (name: string) => {
    const { data } = await supabase.rpc('promille_has_pin', { p_name: name })
    return data !== false
  }, [])

  const changePin = useCallback(
    async (pin: string) => {
      const me = sessionRef.current
      if (!me) return false
      const { error } = await supabase.rpc('promille_change_pin', { p_token: me.token, p_pin: pin })
      if (error) fail(error)
      return !error
    },
    [fail],
  )

  const logout = useCallback(() => {
    const me = sessionRef.current
    if (me) supabase.rpc('promille_logout', { p_token: me.token })
    setMe(null)
  }, [setMe])

  const addEntry = useCallback(
    async (e: Omit<Entry, 'id'>) => {
      const me = sessionRef.current
      if (!me) return
      const full: Owned = { ...e, id: newId(), userKey: me.key }
      setEntries((s) => ({ ...s, [full.id]: full }))
      const { error } = await supabase.rpc('promille_add_entries', { p_token: me.token, p_entries: [rowFor(full)] })
      if (error) {
        setEntries((s) => without(s, (k) => k === full.id))
        fail(error)
      }
    },
    [fail],
  )

  const removeEntry = useCallback(
    async (entry: Entry) => {
      const me = sessionRef.current
      if (!me) return
      setEntries((s) => without(s, (k) => k === entry.id))
      const { error } = await supabase.rpc('promille_delete_entry', { p_token: me.token, p_id: entry.id })
      if (error) {
        setEntries((s) => ({ ...s, [entry.id]: { ...entry, userKey: me.key } }))
        fail(error)
      }
    },
    [fail],
  )

  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const pending = useRef<Partial<Profile>>({})
  const updateProfile = useCallback(
    (p: Partial<Profile>) => {
      const me = sessionRef.current
      if (!me) return
      setPeople((s) => ({ ...s, [me.key]: { ...s[me.key], ...p } }))
      pending.current = { ...pending.current, ...p }
      const w = pending.current.weight
      if (w !== undefined && (w < 30 || w > 250)) return // half-typed; saved on blur
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        const patch = pending.current
        pending.current = {}
        const { error } = await supabase.rpc('promille_update_profile', {
          p_token: me.token,
          p_weight: patch.weight ?? null,
          p_sex: patch.sex ?? null,
        })
        if (error) fail(error)
      }, 600)
    },
    [fail],
  )

  const clearEntries = useCallback(async () => {
    const me = sessionRef.current
    if (!me) return
    setEntries((s) => without(s, (_, e) => e.userKey === me.key))
    const { error } = await supabase.rpc('promille_clear_entries', { p_token: me.token })
    if (error) fail(error)
  }, [fail])

  const deleteUser = useCallback(async () => {
    const me = sessionRef.current
    if (!me) return
    const { error } = await supabase.rpc('promille_delete_user', { p_token: me.token })
    if (error) return fail(error)
    setPeople((s) => without(s, (k) => k === me.key))
    setMe(null)
  }, [fail, setMe])

  return {
    status,
    error,
    clearError: useCallback(() => setError(null), []),
    reload: load,
    hasSession: current !== null,
    token: session?.token ?? null,
    fail,
    user,
    members,
    exists: (n: string) => !!people[userKey(n)],
    login,
    register,
    hasPin,
    changePin,
    logout,
    addEntry,
    removeEntry,
    updateProfile,
    clearEntries,
    deleteUser,
  }
}

export type Store = ReturnType<typeof useStore>
