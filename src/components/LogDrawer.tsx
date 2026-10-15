import { useEffect, useMemo, useRef, useState } from 'react'
import { Drawer } from 'vaul'
import { Check, ChevronLeft, Minus, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { CATEGORIES, CUSTOM, DRINKS, DRINK_BY_ID, type Category, type Drink } from '../data/drinks'
import { fmtAmount, fmtNum, fmtPromille, fmtTime, promilleOf, units, type Entry, type Profile } from '../lib/bac'
import { DrinkArt } from './DrinkArt'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  profile: Profile
  entries: Entry[]
  onAdd: (e: Omit<Entry, 'id'>) => void
}

interface Draft {
  drink: Drink
  ml: number
  abv: number
}

type Filter = 'alle' | 'nylig' | Category

export function LogDrawer({ open, onOpenChange, profile, entries, onAdd }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('alle')

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setDraft(null)
        setQuery('')
      }, 300)
      return () => clearTimeout(t)
    }
  }, [open])

  const recent = useMemo(() => {
    const seen = new Set<string>()
    const out: Draft[] = []
    for (const e of [...entries].sort((a, b) => b.time - a.time)) {
      const key = `${e.drinkId}|${e.ml}|${e.abv}`
      const drink = DRINK_BY_ID[e.drinkId]
      if (!drink || seen.has(key)) continue
      seen.add(key)
      out.push({ drink, ml: e.ml, abv: e.abv })
      if (out.length >= 8) break
    }
    return out
  }, [entries])

  const pick = (d: Drink) => setDraft({ drink: d, ml: d.sizes[d.defaultSize].ml, abv: d.abv })

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="overlay" />
        <Drawer.Content className="sheet" aria-describedby={undefined}>
          <div className="sheet-handle" />
          {draft ? (
            <Detail
              key={draft.drink.id}
              draft={draft}
              profile={profile}
              onBack={() => setDraft(null)}
              onAdd={(e) => {
                onAdd(e)
                onOpenChange(false)
              }}
            />
          ) : (
            <Picker
              query={query}
              setQuery={setQuery}
              filter={filter}
              setFilter={setFilter}
              recent={recent}
              onPick={pick}
              onPickRecent={setDraft}
              onClose={() => onOpenChange(false)}
            />
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

function Picker(props: {
  query: string
  setQuery: (q: string) => void
  filter: Filter
  setFilter: (f: Filter) => void
  recent: Draft[]
  onPick: (d: Drink) => void
  onPickRecent: (d: Draft) => void
  onClose: () => void
}) {
  const { query, setQuery, filter, setFilter, recent, onPick, onPickRecent, onClose } = props
  const q = query.trim().toLowerCase()
  const list = DRINKS.filter((d) => {
    if (q) return d.name.toLowerCase().includes(q) || (d.note ?? '').toLowerCase().includes(q)
    return filter === 'alle' || d.category === filter
  })

  const filters: { id: Filter; label: string }[] = [
    { id: 'alle', label: 'Alle' },
    ...(recent.length ? [{ id: 'nylig' as const, label: 'Nylig' }] : []),
    ...CATEGORIES,
  ]

  const grouped = filter === 'alle' && !q

  return (
    <>
      <div className="sheet-head">
        <Drawer.Title className="sheet-title">Logg drikke</Drawer.Title>
        <button className="icon-btn ghost" onClick={onClose} aria-label="Lukk">
          <X size={20} />
        </button>
      </div>
      <div className="search">
        <Search size={17} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Søk etter drikke" />
        {query && (
          <button className="clear" onClick={() => setQuery('')} aria-label="Tøm">
            <X size={15} />
          </button>
        )}
      </div>
      {!q && (
        <div className="filters" data-vaul-no-drag>
          {filters.map((f) => (
            <button key={f.id} className={`pill ${filter === f.id ? 'on' : ''}`} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div className="sheet-scroll">
        {!q && filter !== 'nylig' && (
          <button className="custom-row" onClick={() => onPick(CUSTOM)}>
            <span className="custom-icon">
              <SlidersHorizontal size={18} />
            </span>
            <span>
              <strong>Egendefinert</strong>
              <small>Oppgi mengde og alkoholprosent selv</small>
            </span>
          </button>
        )}

        {filter === 'nylig' && !q ? (
          <div className="grid">
            {recent.map((r) => (
              <Card
                key={`${r.drink.id}${r.ml}${r.abv}`}
                drink={r.drink}
                sub={`${fmtAmount(r.ml)} · ${fmtNum(r.abv)} %`}
                onClick={() => onPickRecent(r)}
              />
            ))}
          </div>
        ) : grouped ? (
          <>
            {recent.length > 0 && (
              <section>
                <h3 className="group-title">Nylig</h3>
                <div className="recent-row" data-vaul-no-drag>
                  {recent.slice(0, 6).map((r) => (
                    <Card
                      key={`${r.drink.id}${r.ml}${r.abv}`}
                      drink={r.drink}
                      sub={`${fmtAmount(r.ml)} · ${fmtNum(r.abv)} %`}
                      onClick={() => onPickRecent(r)}
                    />
                  ))}
                </div>
              </section>
            )}
            {CATEGORIES.map((c) => (
              <section key={c.id}>
                <h3 className="group-title">{c.label}</h3>
                <div className="grid">
                  {DRINKS.filter((d) => d.category === c.id).map((d) => (
                    <Card key={d.id} drink={d} onClick={() => onPick(d)} />
                  ))}
                </div>
              </section>
            ))}
          </>
        ) : (
          <div className="grid">
            {list.map((d) => (
              <Card key={d.id} drink={d} onClick={() => onPick(d)} />
            ))}
            {!list.length && (
              <div className="empty-search">
                Fant ingen treff på «{query}».{' '}
                <button className="link" onClick={() => onPick(CUSTOM)}>
                  Legg inn egendefinert
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function Card({ drink, sub, onClick }: { drink: Drink; sub?: string; onClick: () => void }) {
  return (
    <button className="card-drink" onClick={onClick} style={{ ['--tint' as string]: drink.liquid }}>
      <span className="card-art">
        <DrinkArt vessel={drink.vessel} liquid={drink.liquid} accent={drink.accent} size={58} />
      </span>
      <span className="card-name">{drink.name}</span>
      <span className="card-sub">{sub ?? `${fmtNum(drink.abv)} %`}</span>
    </button>
  )
}

const WHEN = [
  { label: 'Nå', min: 0 },
  { label: '15 min', min: 15 },
  { label: '30 min', min: 30 },
  { label: '1 t', min: 60 },
  { label: '2 t', min: 120 },
]

function Detail({
  draft,
  profile,
  onBack,
  onAdd,
}: {
  draft: Draft
  profile: Profile
  onBack: () => void
  onAdd: (e: Omit<Entry, 'id'>) => void
}) {
  const { drink } = draft
  const custom = drink.id === 'custom'
  const [ml, setMl] = useState(draft.ml)
  const [abv, setAbv] = useState(draft.abv)
  const [count, setCount] = useState(1)
  const [ago, setAgo] = useState<number | null>(0)
  const [clock, setClock] = useState('')
  const timeRef = useRef<HTMLInputElement>(null)

  const range =
    drink.unit === 'spirit'
      ? { min: 10, max: 200, step: 5 }
      : drink.category === 'vin'
        ? { min: 20, max: 750, step: 10 }
        : custom
          ? { min: 10, max: 1000, step: 10 }
          : { min: 100, max: 1000, step: 10 }

  const time = (() => {
    if (ago !== null) return Date.now() - ago * 60_000
    const [h, m] = clock.split(':').map(Number)
    const d = new Date()
    d.setHours(h || 0, m || 0, 0, 0)
    if (d.getTime() > Date.now() + 60_000) d.setDate(d.getDate() - 1)
    return d.getTime()
  })()

  const u = units({ ml, abv, count })
  const add = promilleOf(u * 12, profile)
  const amountLabel = drink.unit === 'spirit' ? (drink.category === 'drinker' ? 'Sprit i drinken' : 'Mengde') : 'Mengde'

  return (
    <>
      <div className="sheet-head">
        <button className="back" onClick={onBack}>
          <ChevronLeft size={18} /> Alle drikker
        </button>
      </div>
      <div className="sheet-scroll detail">
        <div className="detail-hero" style={{ ['--tint' as string]: drink.liquid }}>
          <DrinkArt vessel={drink.vessel} liquid={drink.liquid} accent={drink.accent} size={96} />
          <div>
            <Drawer.Title className="detail-name">{drink.name}</Drawer.Title>
            <p className="muted">
              {custom ? 'Velg mengde og styrke' : `${fmtNum(abv)} % alkohol`}
              {drink.note ? ` · ${drink.note}` : ''}
            </p>
          </div>
        </div>

        <div className="block">
          <div className="block-head">
            <span className="eyebrow">{amountLabel}</span>
            <span className="value">{fmtAmount(ml)}</span>
          </div>
          {!custom && (
            <div className="chips">
              {drink.sizes.map((s) => (
                <button key={s.label} className={`chip ${ml === s.ml ? 'on' : ''}`} onClick={() => setMl(s.ml)}>
                  {s.label}
                  <small>{fmtAmount(s.ml)}</small>
                </button>
              ))}
            </div>
          )}
          <input
            data-vaul-no-drag
            type="range"
            className="range"
            min={range.min}
            max={range.max}
            step={range.step}
            value={ml}
            onChange={(e) => setMl(+e.target.value)}
            style={{ ['--p' as string]: `${((ml - range.min) / (range.max - range.min)) * 100}%` }}
          />
        </div>

        {custom && (
          <div className="block">
            <div className="block-head">
              <span className="eyebrow">Alkoholprosent</span>
              <span className="value">{fmtNum(abv)} %</span>
            </div>
            <div className="chips">
              {[4.7, 12, 20, 37.5, 40].map((v) => (
                <button key={v} className={`chip ${abv === v ? 'on' : ''}`} onClick={() => setAbv(v)}>
                  {fmtNum(v)} %
                </button>
              ))}
            </div>
            <input
              data-vaul-no-drag
              type="range"
              className="range"
              min={0.5}
              max={70}
              step={0.5}
              value={abv}
              onChange={(e) => setAbv(+e.target.value)}
              style={{ ['--p' as string]: `${((abv - 0.5) / 69.5) * 100}%` }}
            />
          </div>
        )}

        <div className="block row">
          <span className="eyebrow">Antall</span>
          <div className="stepper">
            <button className="icon-btn" onClick={() => setCount((c) => Math.max(1, c - 1))} disabled={count <= 1} aria-label="Færre">
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
                ref={timeRef}
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
          onClick={() => onAdd({ drinkId: drink.id, name: drink.name, ml, abv, count, time })}
        >
          <Check size={18} /> Legg til
        </button>
      </div>
    </>
  )
}
