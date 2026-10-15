import { Minus, Plus } from 'lucide-react'
import type { Sex } from '../lib/bac'

interface Props {
  weight: number
  sex: Sex
  onWeight: (w: number) => void
  onSex: (s: Sex) => void
}

export function ProfileFields({ weight, sex, onWeight, onSex }: Props) {
  const clamp = (w: number) => Math.min(200, Math.max(35, Math.round(w)))
  return (
    <>
      <div className="field">
        <span>Kjønn</span>
        <div className="segmented">
          {(
            [
              ['m', 'Mann'],
              ['f', 'Kvinne'],
            ] as const
          ).map(([v, l]) => (
            <button type="button" key={v} className={sex === v ? 'on' : ''} onClick={() => onSex(v)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Vekt</span>
        <div className="weight">
          <button type="button" className="icon-btn" onClick={() => onWeight(clamp(weight - 1))} aria-label="Mindre">
            <Minus size={18} />
          </button>
          <div className="weight-value">
            <input
              inputMode="numeric"
              value={weight}
              onChange={(e) => {
                const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
                onWeight(Number.isFinite(n) ? Math.min(200, n) : 0)
              }}
              onBlur={() => onWeight(clamp(weight))}
            />
            <span>kg</span>
          </div>
          <button type="button" className="icon-btn" onClick={() => onWeight(clamp(weight + 1))} aria-label="Mer">
            <Plus size={18} />
          </button>
        </div>
        <input
          type="range"
          min={40}
          max={150}
          value={weight}
          onChange={(e) => onWeight(+e.target.value)}
          className="range"
          style={{ ['--p' as string]: `${((weight - 40) / 110) * 100}%` }}
        />
      </div>
    </>
  )
}
