import { useState } from 'react'
import { ArrowRight, ChevronLeft } from 'lucide-react'
import type { Sex } from '../lib/bac'
import type { Store } from '../lib/store'
import { ProfileFields } from './ProfileFields'

export function Login({ store }: { store: Store }) {
  const [name, setName] = useState('')
  const [step, setStep] = useState<'name' | 'profile'>('name')
  const [weight, setWeight] = useState(75)
  const [sex, setSex] = useState<Sex>('m')

  const submitName = (n = name) => {
    const clean = n.trim()
    if (!clean) return
    if (store.exists(clean)) store.login(clean)
    else {
      setName(clean)
      setStep('profile')
    }
  }

  return (
    <div className="login">
      <div className="login-glow" />
      <div className="login-inner">
        <div className="brand">
          <span className="brand-mark" />
          Promille
        </div>

        {step === 'name' ? (
          <form
            className="login-card fade-in"
            onSubmit={(e) => {
              e.preventDefault()
              submitName()
            }}
          >
            <h1>Hold oversikt over kvelden.</h1>
            <p className="muted">Logg det du drikker og se promillen din i sanntid. Ingen passord, bare navnet ditt.</p>
            <label className="field">
              <span>Navn</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Skriv navnet ditt"
                autoComplete="given-name"
                maxLength={32}
              />
            </label>
            <button className="btn btn-primary btn-lg" disabled={!name.trim()}>
              Fortsett <ArrowRight size={18} />
            </button>

            {store.known.length > 0 && (
              <div className="known">
                <span className="eyebrow">Tidligere på denne enheten</span>
                <div className="chips">
                  {store.known.map((n) => (
                    <button type="button" key={n} className="chip" onClick={() => submitName(n)}>
                      <span className="avatar sm">{n[0]?.toUpperCase()}</span>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        ) : (
          <form
            className="login-card fade-in"
            onSubmit={(e) => {
              e.preventDefault()
              store.register({ name, weight, sex })
            }}
          >
            <button type="button" className="back" onClick={() => setStep('name')}>
              <ChevronLeft size={18} /> Tilbake
            </button>
            <h1>Hei, {name}.</h1>
            <p className="muted">Vekt og kjønn trengs for å regne ut promillen. Du kan endre dette senere.</p>
            <ProfileFields weight={weight} sex={sex} onWeight={setWeight} onSex={setSex} />
            <button className="btn btn-primary btn-lg">
              Kom i gang <ArrowRight size={18} />
            </button>
          </form>
        )}

        <p className="fineprint">Estimatene er veiledende og basert på Widmarks formel. Kjør aldri bil etter å ha drukket.</p>
      </div>
    </div>
  )
}
