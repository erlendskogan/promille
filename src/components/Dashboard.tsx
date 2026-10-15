import { useEffect, useMemo, useState } from 'react'
import { Camera, ImageIcon, Plus } from 'lucide-react'
import { analyze, type Entry } from '../lib/bac'
import type { Other } from './BacChart'
import type { Store } from '../lib/store'
import { useFeed } from '../lib/feed'
import { Composer, Feed, PhotoInputs } from './Feed'
import { Friends } from './Friends'
import { LogDrawer } from './LogDrawer'
import { ChartPanel, EntryList, Hero, History, Stats } from './Overview'
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

type Tab = 'meg' | 'venner' | 'feed'

export function Dashboard({ store }: { store: Store }) {
  const user = store.user!
  const now = useNow()
  const [tab, setTab] = useState<Tab>(() => (sessionStorage.getItem('promille:tab') as Tab) || 'meg')
  const [logOpen, setLogOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const feed = useFeed(store.token, user.key, store.fail)
  const [photo, setPhoto] = useState<File | null>(null)
  const [toast, setToast] = useState<{ text: string; undo?: Entry; id: number } | null>(null)

  useEffect(() => {
    try {
      sessionStorage.setItem('promille:tab', tab)
    } catch {
      /* ignore */
    }
  }, [tab])

  // everything visible in the feed counts as seen
  const { markSeen, posts } = feed
  useEffect(() => {
    if (tab === 'feed') markSeen()
  }, [tab, posts, markSeen])

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

  const [overlay, setOverlay] = useState(() => {
    try {
      return localStorage.getItem('promille:overlay') === '1'
    } catch {
      return false
    }
  })
  const toggleOverlay = (on: boolean) => {
    setOverlay(on)
    try {
      localStorage.setItem('promille:overlay', on ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  const others = useMemo<Other[]>(
    () =>
      store.members
        .filter((m) => m.key !== user.key)
        .map((m) => ({ key: m.key, name: m.name, a: analyze(m.entries, m, minute * 60_000) }))
        .filter((o) => o.a.active && o.a.curve.some((p) => p.v > 0))
        .map((o) => ({ key: o.key, name: o.name, curve: o.a.curve })),
    [store.members, user.key, minute],
  )

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
        <button className={tab === 'feed' ? 'on' : ''} onClick={() => setTab('feed')}>
          Feed
          {feed.unseen > 0 && tab !== 'feed' && <span className="badge">{feed.unseen}</span>}
        </button>
      </nav>

      <main className="content" key={tab}>
        {tab === 'meg' ? (
          <>
            <Hero a={a} />
            <ChartPanel
              a={a}
              now={now}
              others={others}
              overlay={{ on: overlay, set: toggleOverlay, count: others.length }}
            />
            {a.active ? (
              <>
                <Stats a={a} now={now} />
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
                <h2>Klar for kvelden?</h2>
                <p className="muted">
                  Trykk på knappen under hver gang du tar noe å drikke. Grafen og estimatene oppdateres fortløpende.
                </p>
              </section>
            )}
            <History a={a} />
          </>
        ) : tab === 'venner' ? (
          <Friends members={store.members} me={user.key} now={now} />
        ) : (
          <Feed feed={feed} members={store.members} me={user.key} now={now} />
        )}

        <p className="fineprint">
          Beregnet med Widmarks formel og en forbrenning på 0,15 ‰ i timen. Faktisk promille varierer med mat, tempo og
          kropp. Kjør aldri bil etter å ha drukket.
        </p>
      </main>

      <div className="dock">
        {tab === 'feed' ? (
          <div className="dock-row">
            <label htmlFor="photo-any" className="btn btn-secondary btn-xl dock-side" aria-label="Velg fra bilder">
              <ImageIcon size={22} />
            </label>
            <label htmlFor="photo-camera" className="btn btn-primary btn-xl">
              <Camera size={22} strokeWidth={2.2} /> Ta bilde
            </label>
          </div>
        ) : (
          <button className="btn btn-primary btn-xl" onClick={() => setLogOpen(true)}>
            <Plus size={22} strokeWidth={2.4} /> Logg drikke
          </button>
        )}
      </div>

      <PhotoInputs onPick={setPhoto} />
      <Composer
        file={photo}
        promille={a.v}
        onClose={() => setPhoto(null)}
        onShare={async (caption) => {
          const ok = photo ? await feed.create(photo, caption, a.v) : false
          if (ok) setToast({ text: 'Bildet er delt', id: Date.now() })
          return ok
        }}
      />

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
