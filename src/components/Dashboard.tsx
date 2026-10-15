import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { analyze, type Entry } from '../lib/bac'
import type { Store } from '../lib/store'
import { DrinkArt } from './DrinkArt'
import { Friends } from './Friends'
import { LogDrawer } from './LogDrawer'
import { EntryList, Evening, Hero, History } from './Overview'
import { ProfileSheet } from './ProfileSheet'

function useNow() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 20_000)
    const vis = () => setNow(Date.now())
    document.addEventListener('visibilitychange', vis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [])
  return now
}

type Tab = 'meg' | 'venner'

export function Dashboard({ store }: { store: Store }) {
  const user = store.user!
  const now = useNow()
  const [tab, setTab] = useState<Tab>(() => (sessionStorage.getItem('promille:tab') as Tab) || 'meg')
  const [logOpen, setLogOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [toast, setToast] = useState<{ text: string; undo?: Entry; id: number } | null>(null)

  useEffect(() => {
    try {
      sessionStorage.setItem('promille:tab', tab)
    } catch {
      /* ignore */
    }
  }, [tab])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (store.error) {
      setToast({ text: store.error, id: Date.now() })
      store.clearError()
    }
  }, [store])

  const minute = Math.floor(now / 60_000)
  const a = useMemo(() => analyze(user.entries, user, now), [user, minute]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeFriends = useMemo(
    () => store.members.filter((m) => m.key !== user.key && m.entries.some((e) => now - e.time < 12 * 3_600_000)).length,
    [store.members, user.key, minute], // eslint-disable-line react-hooks/exhaustive-deps
  )

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="brand-mark" />
          Promille
        </div>
        <button className="profile-btn" onClick={() => setProfileOpen(true)}>
          <span>{user.name}</span>
          <span className="avatar">{user.name[0]?.toUpperCase()}</span>
        </button>
      </header>

      <nav className="tabs" aria-label="Visning">
        <button className={tab === 'meg' ? 'on' : ''} onClick={() => setTab('meg')}>
          Meg
        </button>
        <button className={tab === 'venner' ? 'on' : ''} onClick={() => setTab('venner')}>
          Venner
          {activeFriends > 0 && <span className="badge">{activeFriends}</span>}
        </button>
      </nav>

      <main className="content" key={tab}>
        {tab === 'meg' ? (
          <>
            <Hero a={a} />
            {a.active ? (
              <>
                <Evening a={a} now={now} />
                <EntryList
                  entries={a.active.entries}
                  onRemove={(e) => {
                    store.removeEntry(e)
                    setToast({ text: `${e.name} fjernet`, undo: e, id: Date.now() })
                  }}
                />
              </>
            ) : (
              <section className="panel empty">
                <div className="empty-art">
                  <DrinkArt vessel="wine-glass" liquid="#3A3A42" accent="#3A3A42" size={56} />
                </div>
                <h2>Klar for kvelden?</h2>
                <p className="muted">
                  Trykk på knappen under hver gang du tar noe å drikke. Grafen og estimatene oppdateres fortløpende.
                </p>
              </section>
            )}
            <History a={a} />
          </>
        ) : (
          <Friends members={store.members} me={user.key} now={now} />
        )}

        <p className="fineprint">
          Beregnet med Widmarks formel og en forbrenning på 0,15 ‰ i timen. Faktisk promille varierer med mat, tempo og
          kropp. Kjør aldri bil etter å ha drukket.
        </p>
      </main>

      <div className="dock">
        <button className="btn btn-primary btn-xl" onClick={() => setLogOpen(true)}>
          <Plus size={22} strokeWidth={2.4} /> Logg drikke
        </button>
      </div>

      {toast && (
        <div className="toast" role="status" key={toast.id}>
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              onClick={() => {
                const { id: _id, ...rest } = toast.undo!
                store.addEntry(rest)
                setToast(null)
              }}
            >
              Angre
            </button>
          )}
        </div>
      )}

      <LogDrawer
        open={logOpen}
        onOpenChange={setLogOpen}
        profile={user}
        entries={user.entries}
        onAdd={(e) => {
          store.addEntry(e)
          setToast({ text: `${e.count > 1 ? `${e.count}× ` : ''}${e.name} lagt til`, id: Date.now() })
        }}
      />
      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} store={store} />
    </div>
  )
}
