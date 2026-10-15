import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { DRINK_BY_ID } from '../data/drinks'
import {
  bacAt,
  describe,
  fmtAmount,
  fmtNum,
  fmtPromille,
  fmtTime,
  sessions,
  simulate,
  timeBelow,
  units,
  type Entry,
} from '../lib/bac'
import type { Store } from '../lib/store'
import { BacChart } from './BacChart'
import { DrinkArt } from './DrinkArt'
import { LogDrawer } from './LogDrawer'
import { ProfileSheet } from './ProfileSheet'

const HOUR = 3_600_000

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

const level = (v: number) => (v < 0.01 ? 'sober' : v < 0.6 ? 'low' : v < 1.2 ? 'mid' : 'high')

export function Dashboard({ store }: { store: Store }) {
  const user = store.user!
  const now = useNow()
  const [logOpen, setLogOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [toast, setToast] = useState<{ text: string; undo?: Entry } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const all = useMemo(() => sessions(user.entries, user), [user])
  const last = all[all.length - 1]
  const active = last && (now <= last.end || now - last.end < 6 * HOUR) ? last : null
  const past = (active ? all.slice(0, -1) : all).slice(-10).reverse()

  const curve = useMemo(
    () => (active ? simulate(active.entries, user, active.start, now) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active, user, Math.floor(now / 60_000)],
  )

  const v = active ? bacAt(curve, now) : 0
  const sober = active ? timeBelow(curve, 0, now) : null
  const drive = active ? timeBelow(curve, 0.2, now) : null
  const totalUnits = active ? active.entries.reduce((s, e) => s + units(e), 0) : 0
  const rising = active && curve.length ? bacAt(curve, now + 5 * 60_000) > v + 0.001 : false

  const [int, dec] = fmtPromille(v).split(',')

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

      <main className="content">
        <section className={`hero lvl-${level(v)}`}>
          <span className="eyebrow">Promille nå</span>
          <div className="hero-num">
            <span className="hero-int">{int}</span>
            <span className="hero-dec">,{dec}</span>
            <span className="hero-unit">‰</span>
          </div>
          <div className="hero-meta">
            <span className="status">
              <i />
              {describe(v)}
              {rising && <em> · stiger</em>}
            </span>
            <span className="muted">
              {sober ? `Edru ca. kl. ${fmtTime(sober)}` : active ? 'Alkoholen er forbrent' : 'Ingen drikke logget'}
            </span>
          </div>
        </section>

        {active ? (
          <>
            <section className="panel">
              <div className="panel-head">
                <h2>Kvelden</h2>
                <span className="muted">Fra kl. {fmtTime(active.start)}</span>
              </div>
              <BacChart curve={curve} drinks={active.entries.map((e) => e.time)} now={now} />
            </section>

            <section className="stats">
              <div className="stat">
                <span className="eyebrow">Topp</span>
                <strong>{fmtPromille(active.peak)} ‰</strong>
                <span className="muted">kl. {fmtTime(active.peakAt)}</span>
              </div>
              <div className="stat">
                <span className="eyebrow">Enheter</span>
                <strong>{fmtNum(totalUnits)}</strong>
                <span className="muted">
                  {active.entries.reduce((s, e) => s + e.count, 0)} drikker
                </span>
              </div>
              <div className="stat">
                <span className="eyebrow">Under 0,2 ‰</span>
                <strong>{drive ? fmtTime(drive) : 'Nå'}</strong>
                <span className="muted">{drive ? `om ${duration(drive - now)}` : 'Fortsatt ikke kjør'}</span>
              </div>
              <div className="stat">
                <span className="eyebrow">Helt edru</span>
                <strong>{sober ? fmtTime(sober) : 'Nå'}</strong>
                <span className="muted">{sober ? `om ${duration(sober - now)}` : '0,00 ‰'}</span>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Logget</h2>
                <span className="muted">{active.entries.length} registreringer</span>
              </div>
              <ul className="entries">
                {[...active.entries].reverse().map((e) => {
                  const d = DRINK_BY_ID[e.drinkId]
                  return (
                    <li key={e.id}>
                      <span className="entry-art" style={{ ['--tint' as string]: d?.liquid ?? '#888' }}>
                        {d && <DrinkArt vessel={d.vessel} liquid={d.liquid} accent={d.accent} size={30} />}
                      </span>
                      <span className="entry-main">
                        <strong>
                          {e.count > 1 && <span className="count">{e.count}×</span>}
                          {e.name}
                        </strong>
                        <small>
                          {fmtAmount(e.ml)}
                          {d?.unit === 'spirit' && d.category === 'drinker' ? ' sprit' : ''} · {fmtNum(e.abv)} % ·{' '}
                          {fmtNum(units(e))} enh.
                        </small>
                      </span>
                      <span className="entry-time">{fmtTime(e.time)}</span>
                      <button
                        className="icon-btn ghost sm"
                        aria-label={`Fjern ${e.name}`}
                        onClick={() => {
                          store.removeEntry(e.id)
                          setToast({ text: `${e.name} fjernet`, undo: e })
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          </>
        ) : (
          <section className="panel empty">
            <div className="empty-art">
              <DrinkArt vessel="wine-glass" liquid="#3A3A42" accent="#3A3A42" size={56} />
            </div>
            <h2>Klar for kvelden?</h2>
            <p className="muted">Trykk på knappen under hver gang du tar noe å drikke. Grafen og estimatene oppdateres fortløpende.</p>
          </section>
        )}

        {past.length > 0 && (
          <section className="panel">
            <div className="panel-head">
              <h2>Tidligere kvelder</h2>
            </div>
            <ul className="history">
              {past.map((s) => (
                <li key={s.start}>
                  <span>
                    <strong>{capitalize(new Date(s.start).toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' }))}</strong>
                    <small>
                      {fmtTime(s.start)}–{fmtTime(s.end)} · {fmtNum(s.entries.reduce((a, e) => a + units(e), 0))} enheter
                    </small>
                  </span>
                  <span className="history-peak">
                    {fmtPromille(s.peak)} <small>‰ topp</small>
                  </span>
                </li>
              ))}
            </ul>
          </section>
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
        <div className="toast" role="status" key={toast.text + now}>
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
          setToast({ text: `${e.count > 1 ? `${e.count}× ` : ''}${e.name} lagt til` })
        }}
      />
      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} store={store} />
    </div>
  )
}

function duration(ms: number) {
  const m = Math.max(0, Math.round(ms / 60_000))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (!h) return `${r} min`
  return r ? `${h} t ${r} min` : `${h} t`
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
