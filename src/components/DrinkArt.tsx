import { useId, type ReactNode } from 'react'
import type { Vessel } from '../data/drinks'

interface Props {
  vessel: Vessel
  liquid: string
  accent: string
  size?: number
}

const GLASS = 'rgba(255,255,255,0.06)'
const EDGE = 'rgba(255,255,255,0.38)'
const SHINE = 'rgba(255,255,255,0.22)'

/** Lighten/darken a hex color */
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number) => Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt))
  const r = mix(n >> 16)
  const g = mix((n >> 8) & 255)
  const b = mix(n & 255)
  return `rgb(${r},${g},${b})`
}

export function DrinkArt({ vessel, liquid, accent, size = 64 }: Props) {
  const uid = useId().replace(/:/g, '')
  const liq = `liq${uid}`
  const met = `met${uid}`
  const clip = `clip${uid}`

  const defs = (
    <defs>
      <linearGradient id={liq} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={shade(liquid, 0.18)} />
        <stop offset="1" stopColor={shade(liquid, -0.22)} />
      </linearGradient>
      <linearGradient id={met} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={shade(accent, -0.25)} />
        <stop offset="0.35" stopColor={shade(accent, 0.12)} />
        <stop offset="0.7" stopColor={accent} />
        <stop offset="1" stopColor={shade(accent, -0.35)} />
      </linearGradient>
    </defs>
  )

  const L = `url(#${liq})`
  const M = `url(#${met})`

  // Glass with liquid clipped inside, from y=level downwards
  const glass = (d: string, level: number, extra?: ReactNode) => (
    <>
      <clipPath id={clip}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={GLASS} />
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y={level} width="80" height="100" fill={L} />
        {extra}
      </g>
      <path d={d} fill="none" stroke={EDGE} strokeWidth="1.5" strokeLinejoin="round" />
    </>
  )

  const ice = (x: number, y: number, r = 0) => (
    <rect x={x} y={y} width="10" height="10" rx="2" fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" transform={`rotate(${r} ${x + 5} ${y + 5})`} />
  )

  let body: ReactNode
  switch (vessel) {
    case 'can':
    case 'can-tall': {
      const tall = vessel === 'can-tall'
      const top = tall ? 14 : 24
      const h = 88 - top
      body = (
        <>
          <rect x="23" y={top + 2} width="34" height={h} rx="5" fill={M} />
          <rect x="25" y={top - 2} width="30" height="6" rx="2.5" fill="#C9CDD3" />
          <rect x="25" y={top + h - 2} width="30" height="4" rx="2" fill="#AEB3BA" />
          <rect x="23" y={top + h * 0.38} width="34" height={h * 0.3} fill="rgba(255,255,255,0.12)" />
          <rect x="23" y={top + h * 0.38} width="34" height="1.5" fill={shade(liquid, 0.1)} opacity="0.9" />
          <rect x="23" y={top + h * 0.68 - 1.5} width="34" height="1.5" fill={shade(liquid, 0.1)} opacity="0.9" />
          <rect x="27" y={top + 6} width="3" height={h - 10} rx="1.5" fill={SHINE} />
        </>
      )
      break
    }
    case 'bottle': {
      const d = 'M35 12 h10 v14 c0 6 9 9 9 18 v42 a4 4 0 0 1 -4 4 h-20 a4 4 0 0 1 -4 -4 v-42 c0 -9 9 -12 9 -18 z'
      body = (
        <>
          <path d={d} fill={L} opacity="0.92" />
          <path d={d} fill="none" stroke={EDGE} strokeWidth="1.2" />
          <rect x="34" y="8" width="12" height="6" rx="1.5" fill={M} />
          <rect x="26" y="52" width="28" height="20" rx="1.5" fill={M} />
          <rect x="26" y="52" width="28" height="20" rx="1.5" fill="rgba(255,255,255,0.15)" />
          <rect x="30" y="30" width="2.5" height="54" rx="1.2" fill={SHINE} />
        </>
      )
      break
    }
    case 'wine-bottle': {
      const d = 'M35 6 h10 v22 c0 6 11 8 11 18 v44 a4 4 0 0 1 -4 4 h-24 a4 4 0 0 1 -4 -4 v-44 c0 -10 11 -12 11 -18 z'
      body = (
        <>
          <path d={d} fill={L} />
          <path d={d} fill="none" stroke={EDGE} strokeWidth="1.2" />
          <rect x="34.5" y="5" width="11" height="13" rx="1.5" fill={M} />
          <rect x="24" y="56" width="32" height="22" rx="1" fill="#EDE7DA" />
          <rect x="30" y="62" width="20" height="2" rx="1" fill={shade(accent, -0.1)} />
          <rect x="33" y="67" width="14" height="1.5" rx="0.75" fill="rgba(0,0,0,0.25)" />
          <rect x="28" y="34" width="2.5" height="56" rx="1.2" fill={SHINE} />
        </>
      )
      break
    }
    case 'liquor': {
      const d = 'M35 8 h10 v12 c0 3 4 4 9 6 a4 4 0 0 1 3 4 v56 a5 5 0 0 1 -5 5 h-24 a5 5 0 0 1 -5 -5 v-56 a4 4 0 0 1 3 -4 c5 -2 9 -3 9 -6 z'
      body = (
        <>
          <path d={d} fill={GLASS} />
          <clipPath id={clip}>
            <path d={d} />
          </clipPath>
          <g clipPath={`url(#${clip})`}>
            <rect x="0" y="34" width="80" height="70" fill={L} opacity="0.95" />
          </g>
          <path d={d} fill="none" stroke={EDGE} strokeWidth="1.4" />
          <rect x="34" y="4" width="12" height="7" rx="1.5" fill={M} />
          <rect x="27" y="52" width="26" height="24" rx="2" fill="rgba(245,242,235,0.92)" />
          <rect x="31" y="59" width="18" height="2.5" rx="1" fill={accent} />
          <rect x="34" y="65" width="12" height="1.5" rx="0.75" fill="rgba(0,0,0,0.3)" />
          <rect x="27" y="30" width="2.5" height="58" rx="1.2" fill={SHINE} />
        </>
      )
      break
    }
    case 'pint': {
      const d = 'M24 14 h32 l-3.5 74 a3 3 0 0 1 -3 3 h-19 a3 3 0 0 1 -3 -3 z'
      body = glass(
        d,
        26,
        <>
          <rect x="0" y="16" width="80" height="11" fill="#F6EFDF" />
          <circle cx="36" cy="54" r="1" fill="rgba(255,255,255,0.5)" />
          <circle cx="44" cy="66" r="0.8" fill="rgba(255,255,255,0.5)" />
          <circle cx="40" cy="78" r="1" fill="rgba(255,255,255,0.45)" />
        </>,
      )
      body = (
        <>
          {body}
          <rect x="28" y="20" width="2.5" height="62" rx="1.2" fill={SHINE} />
        </>
      )
      break
    }
    case 'wine-glass': {
      const d = 'M23 12 h34 c1 22 -4 38 -17 38 c-13 0 -18 -16 -17 -38 z'
      body = (
        <>
          {glass(d, 30)}
          <path d="M40 50 v32" stroke={EDGE} strokeWidth="2" />
          <ellipse cx="40" cy="85" rx="14" ry="3" fill="none" stroke={EDGE} strokeWidth="1.5" />
          <path d="M28 18 c-1 10 0 18 3 23" stroke={SHINE} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      )
      break
    }
    case 'flute': {
      const d = 'M32 8 h16 c1 26 -1 42 -8 42 c-7 0 -9 -16 -8 -42 z'
      body = (
        <>
          {glass(
            d,
            16,
            <>
              <circle cx="38" cy="28" r="0.9" fill="rgba(255,255,255,0.7)" />
              <circle cx="42" cy="36" r="0.8" fill="rgba(255,255,255,0.7)" />
              <circle cx="39" cy="42" r="0.7" fill="rgba(255,255,255,0.7)" />
            </>,
          )}
          <path d="M40 50 v32" stroke={EDGE} strokeWidth="2" />
          <ellipse cx="40" cy="85" rx="12" ry="3" fill="none" stroke={EDGE} strokeWidth="1.5" />
          <path d="M35 14 c0 12 0 20 2 28" stroke={SHINE} strokeWidth="2" strokeLinecap="round" fill="none" />
        </>
      )
      break
    }
    case 'shot': {
      const d = 'M27 46 h26 l-3 40 a2 2 0 0 1 -2 2 h-16 a2 2 0 0 1 -2 -2 z'
      body = glass(d, 56, <rect x="0" y="80" width="80" height="10" fill="rgba(255,255,255,0.25)" />)
      break
    }
    case 'rocks': {
      const d = 'M21 40 h38 l-3 46 a3 3 0 0 1 -3 3 h-26 a3 3 0 0 1 -3 -3 z'
      body = (
        <>
          {glass(d, 56, <>{ice(30, 52, 12)}{ice(42, 58, -8)}</>)}
          <rect x="25" y="46" width="2.5" height="36" rx="1.2" fill={SHINE} />
          <circle cx="54" cy="44" r="6" fill="none" stroke="#E9A23B" strokeWidth="2" />
        </>
      )
      break
    }
    case 'highball': {
      const d = 'M27 18 h26 l-2 68 a3 3 0 0 1 -3 3 h-16 a3 3 0 0 1 -3 -3 z'
      body = (
        <>
          <path d="M46 6 l-6 60" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          {glass(d, 30, <>{ice(30, 34, 10)}{ice(40, 46, -12)}{ice(31, 58, 6)}</>)}
          <path d="M50 22 a8 8 0 0 1 8 8 h-16 a8 8 0 0 1 8 -8 z" fill="#B7D86B" transform="rotate(-30 50 26)" />
          <rect x="30" y="24" width="2.5" height="58" rx="1.2" fill={SHINE} />
        </>
      )
      break
    }
    case 'martini': {
      const d = 'M18 22 h44 l-22 28 z'
      body = (
        <>
          {glass(d, 28)}
          <path d="M40 50 v32" stroke={EDGE} strokeWidth="2" />
          <ellipse cx="40" cy="85" rx="13" ry="3" fill="none" stroke={EDGE} strokeWidth="1.5" />
          <path d="M30 12 l14 26" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" />
          <circle cx="40" cy="31" r="4" fill={accent} stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
        </>
      )
      break
    }
    case 'coupe': {
      const d = 'M20 28 h40 c0 14 -8 22 -20 22 c-12 0 -20 -8 -20 -22 z'
      body = (
        <>
          {glass(d, 33)}
          <path d="M40 50 v32" stroke={EDGE} strokeWidth="2" />
          <ellipse cx="40" cy="85" rx="13" ry="3" fill="none" stroke={EDGE} strokeWidth="1.5" />
          <path d="M55 30 a6 6 0 1 1 0 0.1" fill="none" stroke="#C7D86B" strokeWidth="2" />
        </>
      )
      break
    }
    case 'mug': {
      body = (
        <>
          <path d="M54 46 h5 a7 7 0 0 1 7 7 v14 a7 7 0 0 1 -7 7 h-5" fill="none" stroke={M} strokeWidth="4" />
          <rect x="22" y="36" width="34" height="54" rx="4" fill={M} />
          <rect x="22" y="36" width="34" height="4" rx="2" fill={shade(accent, 0.3)} />
          <rect x="26" y="42" width="3" height="42" rx="1.5" fill={SHINE} />
          <path d="M46 24 a7 7 0 0 1 7 7 h-14 a7 7 0 0 1 7 -7 z" fill="#B7D86B" transform="rotate(20 46 28)" />
        </>
      )
      break
    }
    case 'hurricane': {
      const d = 'M29 12 h22 c0 10 -5 16 -5 26 c0 8 9 14 9 27 c0 11 -7 19 -15 19 c-8 0 -15 -8 -15 -19 c0 -13 9 -19 9 -27 c0 -10 -5 -16 -5 -26 z'
      body = (
        <>
          {glass(d, 30, <rect x="0" y="66" width="80" height="30" fill={accent} opacity="0.55" />)}
          <path d="M40 84 v4" stroke={EDGE} strokeWidth="2.5" />
          <ellipse cx="40" cy="90" rx="11" ry="2.5" fill="none" stroke={EDGE} strokeWidth="1.5" />
          <path d="M33 34 c-3 8 -6 14 -6 24" stroke={SHINE} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <circle cx="52" cy="16" r="6" fill="#F2C94C" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
        </>
      )
      break
    }
    case 'custom': {
      const d = 'M26 30 h28 l-3 56 a3 3 0 0 1 -3 3 h-16 a3 3 0 0 1 -3 -3 z'
      body = (
        <>
          {glass(d, 52)}
          <path d="M33 66 h14 M40 59 v14" stroke="rgba(0,0,0,0.45)" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )
      break
    }
  }

  return (
    <svg viewBox="0 0 80 100" width={size} height={size * 1.25} aria-hidden="true">
      {defs}
      <ellipse cx="40" cy="94" rx="22" ry="3" fill="rgba(0,0,0,0.35)" />
      {body}
    </svg>
  )
}
