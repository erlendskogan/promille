import { useCallback, useEffect, useState } from 'react'
import type { Entry, Profile } from './bac'

interface User extends Profile {
  entries: Entry[]
}

interface State {
  users: Record<string, User>
  current: string | null
}

const KEY = 'promille:v1'

const load = (): State => {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return { users: {}, current: null }
}

export const userKey = (name: string) => name.trim().toLowerCase()

export function useStore() {
  const [state, setState] = useState<State>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  const user = state.current ? state.users[state.current] ?? null : null

  const login = useCallback((name: string) => {
    setState((s) => ({ ...s, current: userKey(name) }))
  }, [])

  const register = useCallback((p: Profile) => {
    const k = userKey(p.name)
    setState((s) => ({
      current: k,
      users: { ...s.users, [k]: { ...p, entries: s.users[k]?.entries ?? [] } },
    }))
  }, [])

  const logout = useCallback(() => setState((s) => ({ ...s, current: null })), [])

  const updateUser = useCallback((fn: (u: User) => User) => {
    setState((s) => {
      if (!s.current || !s.users[s.current]) return s
      return { ...s, users: { ...s.users, [s.current]: fn(s.users[s.current]) } }
    })
  }, [])

  const addEntry = useCallback(
    (e: Omit<Entry, 'id'>) =>
      updateUser((u) => ({ ...u, entries: [...u.entries, { ...e, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }] })),
    [updateUser],
  )

  const removeEntry = useCallback(
    (id: string) => updateUser((u) => ({ ...u, entries: u.entries.filter((e) => e.id !== id) })),
    [updateUser],
  )

  const updateProfile = useCallback(
    (p: Partial<Profile>) => updateUser((u) => ({ ...u, ...p })),
    [updateUser],
  )

  const clearEntries = useCallback(() => updateUser((u) => ({ ...u, entries: [] })), [updateUser])

  const deleteUser = useCallback(() => {
    setState((s) => {
      if (!s.current) return s
      const users = { ...s.users }
      delete users[s.current]
      return { users, current: null }
    })
  }, [])

  const known = Object.values(state.users).map((u) => u.name)

  return { user, known, exists: (n: string) => !!state.users[userKey(n)], login, register, logout, addEntry, removeEntry, updateProfile, clearEntries, deleteUser }
}

export type Store = ReturnType<typeof useStore>
