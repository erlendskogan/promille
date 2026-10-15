import { useEffect, useMemo, useState } from 'react'
import { Drawer } from 'vaul'
import { Check, Minus, Plus, X } from 'lucide-react'
import { PRESETS, drinkFor } from '../data/drinks'
import { fmtAmount, fmtNum, fmtPromille, fmtTime, promilleOf, units, type Entry, type Profile } from '../lib/bac'
import { DrinkArt } from './DrinkArt'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  profile: Profile
  entries: Entry[]
  onAdd: (e: Omit<Entry, 'id'>) => void
}

const WHEN = [
  { label: 'Nå', min: 0 },
  { label: '15 min', min: 15 },
  { label: '30 min', min: 30 },
  { label: '1 t', min: 60 },
  { label: '2 t', min: 120 },
]

// Amount slider is quadratic so small amounts (shots) are as easy to hit as large ones
const ML_MIN = 10
const ML_MAX = 1000
const toSlider = (ml: number) => Math.sqrt((Math.min(ML_MAX, Math.max(ML_MIN, ml)) - ML_MIN) / (ML_MAX - ML_MIN)) * 100
const fromSlider = (x: number) => {
  const ml = ML_MIN + (ML_MAX - ML_MIN) * (x / 100) ** 2
  return ml < 100 ? Math.round(ml / 5) * 5 : Math.round(ml / 10) * 10
}

const pct = (v: number) => `${fmtNum(v, Number.isInteger(v) ? 0 : 1)} %`

export function LogDrawer({ open, onOpenChange, profile, entries, onAdd }: Props) {
  const [ml, setMl] = useState(500)
  const [abv, setAbv] = useState(4.7)
  const [count, setCount] = useState(1)
  const [ago, setAgo] = useState<number | null>(0)
  const [clock, setClock] = useState('')

  // Start each time from the last thing logged, or a halvliter
  useEffect(() => {
    if (!open) return
    const last = entries[entries.length - 1]
    setMl(last?.ml ?? 500)
    setAbv(last?.abv ?? 4.7)
    setCount(1)
    setAgo(0)
    setClock('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const recent = useMemo(() => {
    const seen = new Set<string>(PRESETS.map((p) => `${p.sizes[0].ml}|${p.abv}`))
    const out: { ml: number; abv: number }[] = []
    for (const e of [...entries].sort((a, b) => b.time - a.time)) {
      const key = `${e.ml}|${e.abv}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ ml: e.ml, abv: e.abv })
      if (out.length >= 4) break
    }
    return out
  }, [entries])

  const time = (() => {
    if (ago !== null) return Date.now() - ago * 60_000
    const [h, m] = clock.split(':').map(Number)
    const d = new Date()
    d.setHours(h || 0, m || 0, 0, 0)
    if (d.getTime() > Date.now() + 60_000) d.setDate(d.getDate() - 1)
    return d.getTime()
  })()

  const drink = drinkFor(ml, abv)
  const u = units({ ml, abv, count })
  const add = promilleOf(u * 12, profile)

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="overlay" />
        <Drawer.Content className="sheet" aria-describedby={undefined}>
          <div className="sheet-handle" />
          <div className="sheet-head">
            <Drawer.Title className="sheet-title">Logg drikke</Drawer.Title>
            <button className="icon-btn ghost" onClick={() => onOpenChange(false)} aria-label="Lukk">
              <X size={20} />
            </button>
          </div>

          <div className="sheet-scroll detail">
            <div className="amounts">
              <div className="amount">
                <span className="eyebrow">Mengde</span>
                <NumberField label="Mengde i cl" value={ml} onChange={setMl} suffix="cl" scale={10} max={300} />
                <input
                  data-vaul-no-drag
                  type="range"
                  className="range"
                  aria-label="Mengde"
                  min={0}
                  max={100}
                  step={0.5}
                  value={toSlider(ml)}
                  onChange={(e) => setMl(fromSlider(+e.target.value))}
                  style={{ ['--p' as string]: `${toSlider(ml)}%` }}
                />
              </div>
              <div className="amount">
                <span className="eyebrow">Prosent</span>
                <NumberField label="Alkoholprosent" value={abv} onChange={setAbv} suffix="%" max={96} />
                <input
                  data-vaul-no-drag
                  type="range"
                  className="range"
                  aria-label="Prosent"
                  min={0.5}
                  max={60}
                  step={0.1}
                  value={Math.min(60, abv)}
                  onChange={(e) => setAbv(Math.round(+e.target.value * 10) / 10)}
                  style={{ ['--p' as string]: `${((Math.min(60, abv) - 0.5) / 59.5) * 100}%` }}
                />
              </div>
            </div>

            <section>
              <h3 className="group-title">Vanlige</h3>
              <div className="presets">
                {PRESETS.map((p) => {
                  const on = p.sizes[0].ml === ml && p.abv === abv
                  return (
                    <button
                      key={p.id}
                      className={`preset ${on ? 'on' : ''}`}
                      style={{ ['--tint' as string]: p.liquid }}
                      onClick={() => {
                        setMl(p.sizes[0].ml)
                        setAbv(p.abv)
                      }}
                    >
                      <span className="preset-art">
                        <DrinkArt vessel={p.vessel} liquid={p.liquid} accent={p.accent} size={34} />
                      </span>
                      <span className="preset-text">
                        <strong>{p.name}</strong>
                        <small>
                          {fmtAmount(p.sizes[0].ml)} · {pct(p.abv)}
                        </small>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            {recent.length > 0 && (
              <section>
                <h3 className="group-title">Nylig</h3>
                <div className="chips">
                  {recent.map((r) => (
                    <button
                      key={`${r.ml}|${r.abv}`}
                      className={`chip ${r.ml === ml && r.abv === abv ? 'on' : ''}`}
                      onClick={() => {
                        setMl(r.ml)
                        setAbv(r.abv)
                      }}
                    >
                      {fmtAmount(r.ml)}
                      <small>{pct(r.abv)}</small>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <div className="block row">
              <span className="eyebrow">Antall</span>
              <div className="stepper">
                <button
                  className="icon-btn"
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                  disabled={count <= 1}
                  aria-label="Færre"
                >
                  <Minus size={18} />
                </button>
                <span className="value">{count}</span>
                <button className="icon-btn" onClick={() => setCount((c) => Math.min(20, c + 1))} aria-label="Flere">
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div className="block">
              <div className="block-head">
                <span className="eyebrow">Når</span>
                <span className="value">{ago === 0 ? 'Akkurat nå' : fmtTime(time)}</span>
              </div>
              <div className="chips">
                {WHEN.map((w) => (
                  <button
                    key={w.label}
                    className={`chip ${ago === w.min ? 'on' : ''}`}
                    onClick={() => {
                      setAgo(w.min)
                      setClock('')
                    }}
                  >
                    {w.min === 0 ? w.label : `${w.label} siden`}
                  </button>
                ))}
                <label className={`chip time-chip ${ago === null ? 'on' : ''}`}>
                  {ago === null && clock ? clock : 'Velg klokkeslett'}
                  <input
                    type="time"
                    value={clock}
                    onChange={(e) => {
                      setClock(e.target.value)
                      setAgo(e.target.value ? null : 0)
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="sheet-foot">
            <div className="summary">
              <span>
                <strong>{fmtNum(u)}</strong> {u >= 0.95 && u < 1.05 ? 'enhet' : 'enheter'}
              </span>
              <span className="muted">opptil +{fmtPromille(add)} ‰</span>
            </div>
            <button
              className="btn btn-primary btn-lg"
              disabled={!(ml > 0 && abv > 0)}
              onClick={() => {
                onAdd({ drinkId: drink.id, name: drink.name, ml, abv, count, time })
                onOpenChange(false)
              }}
            >
              <Check size={18} /> Legg til
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

/** Text input for a number, accepting comma decimals */
function NumberField({
  value,
  onChange,
  suffix,
  scale = 1,
  max,
  label,
}: {
  value: number
  onChange: (v: number) => void
  suffix: string
  scale?: number
  max: number
  label: string
}) {
  const show = (v: number) => fmtNum(v / scale, Number.isInteger(v / scale) ? 0 : 1)
  const [text, setText] = useState(show(value))
  const [focused, setFocused] = useState(false)
  // follow outside changes (slider, presets) while the field isn't being typed in
  if (!focused && text !== show(value)) setText(show(value))
  return (
    <label className="num-field big">
      <input
        aria-label={label}
        inputMode="decimal"
        value={text}
        onFocus={(e) => {
          setFocused(true)
          e.target.select()
        }}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d.,]/g, '')
          setText(t)
          const n = parseFloat(t.replace(',', '.'))
          if (Number.isFinite(n) && n > 0 && n <= max) onChange(Math.round(n * scale * 10) / 10)
        }}
        onBlur={() => {
          setFocused(false)
          setText(show(value))
        }}
      />
      <span>{suffix}</span>
    </label>
  )
}
