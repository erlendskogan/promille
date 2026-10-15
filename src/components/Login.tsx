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
  const [busy, setBusy] = useState(false)
  const loading = store.status === 'loading'
  const recent = [...store.members]
    .sort((a, b) => (b.entries.at(-1)?.time ?? 0) - (a.entries.at(-1)?.time ?? 0))
    .slice(0, 12)

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
            <p className="muted">Logg det du drikker, se promillen din i sanntid og følg med på vennene dine. Ingen passord, bare navnet ditt.</p>
            <label className="field">
              <span>Navn</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Navnet vennene kjenner deg som"
                autoComplete="given-name"
                maxLength={32}
              />
            </label>
            <button className="btn btn-primary btn-lg" disabled={!name.trim() || loading}>
              {loading ? 'Kobler til …' : 'Fortsett'} {!loading && <ArrowRight size={18} />}
            </button>

            {recent.length > 0 && (
              <div className="known">
                <span className="eyebrow">Er du en av disse?</span>
                <div className="chips">
                  {recent.map((m) => (
                    <button type="button" key={m.key} className="chip" onClick={() => submitName(m.name)}>
                      <span className="avatar sm">{m.name[0]?.toUpperCase()}</span>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        ) : (
          <form
            className="login-card fade-in"
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              const ok = await store.register({ name, weight, sex })
              if (!ok) setBusy(false)
            }}
          >
            <button type="button" className="back" onClick={() => setStep('name')}>
              <ChevronLeft size={18} /> Tilbake
            </button>
            <h1>Hei, {name}.</h1>
            <p className="muted">Vekt og kjønn trengs for å regne ut promillen. Du kan endre dette senere.</p>
            <ProfileFields weight={weight} sex={sex} onWeight={setWeight} onSex={setSex} />
            {store.error && <p className="form-error">{store.error}</p>}
            <button className="btn btn-primary btn-lg" disabled={busy}>
              {busy ? 'Oppretter …' : 'Kom i gang'} {!busy && <ArrowRight size={18} />}
            </button>
          </form>
        )}

        <p className="fineprint">Estimatene er veiledende og basert på Widmarks formel. Kjør aldri bil etter å ha drukket.</p>
      </div>
    </div>
  )
}
