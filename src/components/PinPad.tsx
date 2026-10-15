import { useEffect, useState } from 'react'
import { Delete } from 'lucide-react'

interface Props {
  /** Called with all four digits; return an error message to shake and clear */
  onComplete: (pin: string) => Promise<string | null | void> | string | null | void
  disabled?: boolean
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

export function PinPad({ onComplete, disabled }: Props) {
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)

  const press = async (k: string) => {
    if (busy || disabled) return
    if (k === 'del') return setPin((p) => p.slice(0, -1))
    if (pin.length >= 4) return
    const next = pin + k
    setPin(next)
    setError(null)
    if (next.length < 4) return
    setBusy(true)
    const err = await onComplete(next)
    setBusy(false)
    if (err) {
      setError(err)
      setShake((n) => n + 1)
      setPin('')
    }
  }

  // physical keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('del')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="pinpad">
      <div className={`pin-dots ${shake ? 'shake' : ''}`} key={shake} aria-label={`${pin.length} av 4 siffer`}>
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className={i < pin.length ? 'on' : ''} />
        ))}
      </div>
      <p className={`pin-error ${error ? 'show' : ''}`} role="alert">
        {error ?? ' '}
      </p>
      <div className="pin-keys">
        {KEYS.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              className={k === 'del' ? 'pin-del' : ''}
              onClick={() => press(k)}
              disabled={busy || disabled || (k === 'del' && !pin)}
              aria-label={k === 'del' ? 'Slett' : k}
            >
              {k === 'del' ? <Delete size={22} /> : k}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
