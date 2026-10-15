export type Sex = 'm' | 'f'

export interface Profile {
  name: string
  weight: number
  sex: Sex
}

export interface Entry {
  id: string
  drinkId: string
  name: string
  /** ml of the measured liquid (whole serving, or spirit content) */
  ml: number
  abv: number
  count: number
  time: number
}

const ETHANOL_DENSITY = 0.789
/** Norsk alkoholenhet ≈ 12 g ren alkohol */
export const GRAMS_PER_UNIT = 12
/** Typisk forbrenning, promille per time */
export const ELIMINATION = 0.15
/** Minutter fra drikken er drukket til den er tatt opp */
const ABSORPTION_MIN = 45
const MIN = 60_000

export const grams = (e: Pick<Entry, 'ml' | 'abv' | 'count'>) =>
  e.ml * (e.abv / 100) * ETHANOL_DENSITY * e.count

export const units = (e: Pick<Entry, 'ml' | 'abv' | 'count'>) => grams(e) / GRAMS_PER_UNIT

const widmarkR = (p: Profile) => (p.sex === 'm' ? 0.68 : 0.55)

/** Peak contribution of a set of grams, ignoring elimination */
export const promilleOf = (g: number, p: Profile) => g / (p.weight * widmarkR(p))

export interface Session {
  entries: Entry[]
  start: number
  /** When BAC reaches zero again */
  end: number
  peak: number
  peakAt: number
}

/**
 * Minute-by-minute Widmark simulation with linear absorption.
 * Returns samples from `from` until BAC is back at 0 (and at least `until`).
 */
export function simulate(entries: Entry[], p: Profile, from: number, until = from) {
  const r = p.weight * widmarkR(p)
  const step = MIN
  const burn = ELIMINATION / 60
  const out: { t: number; v: number }[] = []
  let v = 0
  const last = Math.max(...entries.map((e) => e.time), from)
  for (let t = from; ; t += step) {
    let absorbed = 0
    for (const e of entries) {
      const dt = (t - e.time) / MIN
      if (dt <= 0 || dt > ABSORPTION_MIN) continue
      absorbed += grams(e) / ABSORPTION_MIN
    }
    v = Math.max(0, v + absorbed / r - burn)
    out.push({ t, v })
    const absorbing = t <= last + ABSORPTION_MIN * MIN
    if (!absorbing && v <= 0 && t >= until) break
    if (out.length > 60 * 72) break
  }
  return out
}

/** Split all entries into drinking sessions (separated by a return to 0 ‰). */
export function sessions(all: Entry[], p: Profile): Session[] {
  const sorted = [...all].sort((a, b) => a.time - b.time)
  const result: Session[] = []
  let cur: Entry[] = []
  const close = () => {
    if (!cur.length) return
    const curve = simulate(cur, p, cur[0].time)
    let peak = 0
    let peakAt = cur[0].time
    for (const s of curve) if (s.v > peak) ((peak = s.v), (peakAt = s.t))
    result.push({ entries: cur, start: cur[0].time, end: curve[curve.length - 1].t, peak, peakAt })
  }
  for (const e of sorted) {
    if (cur.length) {
      const curve = simulate(cur, p, cur[0].time)
      if (e.time > curve[curve.length - 1].t) {
        close()
        cur = []
      }
    }
    cur.push(e)
  }
  close()
  return result
}

export function bacAt(curve: { t: number; v: number }[], t: number) {
  if (!curve.length || t < curve[0].t) return 0
  const i = Math.min(curve.length - 1, Math.floor((t - curve[0].t) / MIN))
  return curve[i].v
}

/** First time at/after `from` where BAC is at or below `limit` and stays there. */
export function timeBelow(curve: { t: number; v: number }[], limit: number, from: number) {
  for (let i = curve.length - 1; i >= 0; i--) {
    if (curve[i].v > limit) {
      const t = curve[Math.min(i + 1, curve.length - 1)].t
      return t <= from ? null : t
    }
  }
  return null
}

export function describe(v: number) {
  if (v < 0.01) return 'Edru'
  if (v < 0.3) return 'Så vidt påvirket'
  if (v < 0.6) return 'Lett beruset'
  if (v < 1.0) return 'Beruset'
  if (v < 1.5) return 'Godt beruset'
  if (v < 2.0) return 'Kraftig beruset'
  return 'Svært beruset'
}

export const fmtPromille = (v: number) => v.toFixed(2).replace('.', ',')
export const fmtNum = (v: number, d = 1) => v.toFixed(d).replace('.', ',')
export const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
export const fmtAmount = (ml: number) =>
  ml >= 1000 ? `${fmtNum(ml / 1000, 2)} l` : ml % 10 === 0 ? `${ml / 10} cl` : `${fmtNum(ml / 10)} cl`

const HOUR = 3_600_000

export type Analysis = ReturnType<typeof analyze>

/** Everything the UI needs about one person at time `now`. */
export function analyze(entries: Entry[], p: Profile, now: number) {
  const all = sessions(entries, p)
  const last = all[all.length - 1]
  const active = last && now - last.end < 6 * HOUR ? last : null
  const past = (active ? all.slice(0, -1) : all).slice(-10).reverse()
  const curve = active ? simulate(active.entries, p, active.start, now) : []
  const v = active ? bacAt(curve, now) : 0
  return {
    active,
    past,
    curve,
    v,
    sober: active ? timeBelow(curve, 0, now) : null,
    drive: active ? timeBelow(curve, 0.2, now) : null,
    units: active ? active.entries.reduce((s, e) => s + units(e), 0) : 0,
    drinks: active ? active.entries.reduce((s, e) => s + e.count, 0) : 0,
    rising: active ? bacAt(curve, now + 5 * 60_000) > v + 0.001 : false,
    lastEntry: entries.length ? entries[entries.length - 1] : null,
  }
}

export const level = (v: number) => (v < 0.01 ? 'sober' : v < 0.6 ? 'low' : v < 1.2 ? 'mid' : 'high')

export function duration(ms: number) {
  const m = Math.max(0, Math.round(ms / 60_000))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (!h) return `${r} min`
  return r ? `${h} t ${r} min` : `${h} t`
}
