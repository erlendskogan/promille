import { Trash2 } from 'lucide-react'
import { DRINK_BY_ID } from '../data/drinks'
import {
  duration,
  fmtAmount,
  fmtNum,
  fmtPromille,
  fmtTime,
  level,
  statusText,
  units,
  type Analysis,
  type Entry,
} from '../lib/bac'
import { BacChart, type Other } from './BacChart'
import { DrinkArt } from './DrinkArt'

export function Hero({ a, label = 'Promille nå' }: { a: Analysis; label?: string }) {
  const [int, dec] = fmtPromille(a.v).split(',')
  return (
    <section className={`hero lvl-${level(a.v)}`}>
      <span className="eyebrow">{label}</span>
      <div className="hero-num">
        <span className="hero-int">{int}</span>
        <span className="hero-dec">,{dec}</span>
        <span className="hero-unit">‰</span>
      </div>
      <div className="hero-meta">
        <span className="status">
          <i />
          {statusText(a)}
          {a.rising && a.v >= 0.01 && <em> · stiger</em>}
        </span>
        <span className="muted">
          {a.sober ? `Edru ca. kl. ${fmtTime(a.sober)}` : a.active ? 'Alkoholen er forbrent' : 'Ingen drikke logget'}
        </span>
      </div>
    </section>
  )
}

export function ChartPanel({
  a,
  now,
  others,
  overlay,
}: {
  a: Analysis
  now: number
  others?: Other[]
  overlay?: { on: boolean; set: (v: boolean) => void; count: number }
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{a.active ? 'Kvelden' : 'Promille'}</h2>
        {overlay ? (
          <label className="switch-row">
            <span className="muted">Venner{overlay.count ? ` (${overlay.count})` : ''}</span>
            <button
              type="button"
              role="switch"
              aria-checked={overlay.on}
              aria-label="Vis vennenes grafer"
              className={`switch ${overlay.on ? 'on' : ''}`}
              onClick={() => overlay.set(!overlay.on)}
            >
              <i />
            </button>
          </label>
        ) : (
          a.active && <span className="muted">Fra kl. {fmtTime(a.active.start)}</span>
        )}
      </div>
      <BacChart
        curve={a.curve}
        drinks={a.active ? a.active.entries.map((e) => e.time) : []}
        now={now}
        others={overlay?.on ? others : undefined}
      />
      {overlay?.on && !overlay.count && <p className="chart-note muted">Ingen venner har promille akkurat nå.</p>}
    </section>
  )
}

export function Stats({ a, now }: { a: Analysis; now: number }) {
  if (!a.active) return null
  return (
    <section className="stats">
      <div className="stat">
        <span className="eyebrow">Topp</span>
        <strong>{fmtPromille(a.active.peak)} ‰</strong>
        <span className="muted">kl. {fmtTime(a.active.peakAt)}</span>
      </div>
      <div className="stat">
        <span className="eyebrow">Enheter</span>
        <strong>{fmtNum(a.units)}</strong>
        <span className="muted">{a.drinks} drikker</span>
      </div>
      <div className="stat">
        <span className="eyebrow">Under 0,2 ‰</span>
        <strong>{a.drive ? fmtTime(a.drive) : 'Nå'}</strong>
        <span className="muted">{a.drive ? `om ${duration(a.drive - now)}` : 'Fortsatt ikke kjør'}</span>
      </div>
      <div className="stat">
        <span className="eyebrow">Helt edru</span>
        <strong>{a.sober ? fmtTime(a.sober) : 'Nå'}</strong>
        <span className="muted">{a.sober ? `om ${duration(a.sober - now)}` : '0,00 ‰'}</span>
      </div>
    </section>
  )
}

export function EntryList({ entries, onRemove }: { entries: Entry[]; onRemove?: (e: Entry) => void }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Logget</h2>
        <span className="muted">{entries.length} registreringer</span>
      </div>
      <ul className="entries">
        {[...entries].reverse().map((e) => {
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
              {onRemove && (
                <button className="icon-btn ghost sm" aria-label={`Fjern ${e.name}`} onClick={() => onRemove(e)}>
                  <Trash2 size={16} />
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function History({ a }: { a: Analysis }) {
  if (!a.past.length) return null
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Tidligere kvelder</h2>
      </div>
      <ul className="history">
        {a.past.map((s) => (
          <li key={s.start}>
            <span>
              <strong>
                {capitalize(new Date(s.start).toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' }))}
              </strong>
              <small>
                {fmtTime(s.start)}–{fmtTime(s.end)} · {fmtNum(s.entries.reduce((x, e) => x + units(e), 0))} enheter
              </small>
            </span>
            <span className="history-peak">
              {fmtPromille(s.peak)} <small>‰ topp</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
