import { useState } from 'react'
import { ArrowRight, ChevronLeft } from 'lucide-react'
import { fmtTime, type Sex } from '../lib/bac'
import type { LoginResult, Store } from '../lib/store'
import { Avatar, Name } from './Avatar'
import { PinPad } from './PinPad'
import { ProfileFields } from './ProfileFields'

type Step = 'name' | 'profile' | 'pin' | 'create' | 'confirm'

function message(r: LoginResult) {
  if (r.ok) return null
  switch (r.error) {
    case 'wrong_pin':
      return r.left === 1 ? 'Feil PIN. Ett forsøk igjen.' : `Feil PIN. ${r.left} forsøk igjen.`
    case 'locked':
      return `For mange forsøk. Prøv igjen kl. ${r.until ? fmtTime(Date.parse(r.until)) : 'senere'}.`
    case 'name_taken':
      return 'Navnet er tatt. Gå tilbake og velg et annet.'
    case 'no_user':
      return 'Fant ikke brukeren.'
    default:
      return 'Fikk ikke kontakt. Sjekk nettet og prøv igjen.'
  }
}

export function Login({ store }: { store: Store }) {
  const [name, setName] = useState('')
  const [step, setStep] = useState<Step>('name')
  const [weight, setWeight] = useState(75)
  const [sex, setSex] = useState<Sex>('m')
  const [firstPin, setFirstPin] = useState('')
  const [checking, setChecking] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const loading = store.status === 'loading'
  const recent = [...store.members]
    .sort((a, b) => (b.entries.at(-1)?.time ?? 0) - (a.entries.at(-1)?.time ?? 0))
    .slice(0, 12)

  const submitName = async (n = name) => {
    const clean = n.trim()
    if (!clean) return
    setName(clean)
    setNote(null)
    if (!store.exists(clean)) {
      setClaiming(false)
      return setStep('profile')
    }
    setChecking(true)
    const has = await store.hasPin(clean)
    setChecking(false)
    setClaiming(!has)
    setStep(has ? 'pin' : 'create')
  }

  const back = () => {
    setFirstPin('')
    setNote(null)
    setStep(step === 'create' && !claiming ? 'profile' : step === 'confirm' ? 'create' : 'name')
  }

  const pinStep = step === 'pin' || step === 'create' || step === 'confirm'
  const member = store.members.find((m) => m.name.toLowerCase() === name.toLowerCase())

  return (
    <div className="login">
      <div className="login-glow" />
      <div className="login-inner">
        <div className="brand">
          <span className="brand-mark" />
          Promille
        </div>

        {step === 'name' && (
          <form
            className="login-card fade-in"
            onSubmit={(e) => {
              e.preventDefault()
              submitName()
            }}
          >
            <h1>Hold oversikt over kvelden.</h1>
            <p className="muted">
              Logg det du drikker, se promillen din i sanntid og følg med på vennene dine.
            </p>
            <label className="field">
              <span>Navn</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Navnet vennene kjenner deg som"
                autoComplete="nickname"
                maxLength={50}
              />
            </label>
            <button className="btn btn-primary btn-lg" disabled={!name.trim() || loading || checking}>
              {loading ? 'Kobler til …' : 'Fortsett'} {!loading && <ArrowRight size={18} />}
            </button>

            {recent.length > 0 && (
              <div className="known">
                <span className="eyebrow">Er du en av disse?</span>
                <div className="chips">
                  {recent.map((m) => (
                    <button type="button" key={m.key} className="chip" onClick={() => submitName(m.name)}>
                      <Avatar name={m.name} gold={m.badge === 'gold'} size="sm" />
                      <Name name={m.name} gold={m.badge === 'gold'} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        )}

        {step === 'profile' && (
          <form
            className="login-card fade-in"
            onSubmit={(e) => {
              e.preventDefault()
              setStep('create')
            }}
          >
            <button type="button" className="back" onClick={back}>
              <ChevronLeft size={18} /> Tilbake
            </button>
            <h1>Hei, {name}.</h1>
            <p className="muted">Vekt og kjønn trengs for å regne ut promillen. Du kan endre dette senere.</p>
            <ProfileFields weight={weight} sex={sex} onWeight={setWeight} onSex={setSex} />
            <button className="btn btn-primary btn-lg">
              Neste <ArrowRight size={18} />
            </button>
          </form>
        )}

        {pinStep && (
          <div className="login-card pin-card fade-in" key={step}>
            <button type="button" className="back" onClick={back}>
              <ChevronLeft size={18} /> Tilbake
            </button>
            <div className="pin-head">
              {member && step === 'pin' && <Avatar name={member.name} gold={member.badge === 'gold'} size="lg" />}
              <h1>
                {step === 'pin'
                  ? <Name name={member?.name ?? name} gold={member?.badge === 'gold'} />
                  : step === 'confirm'
                    ? 'Gjenta PIN-koden'
                    : 'Velg en PIN-kode'}
              </h1>
              <p className="muted">
                {step === 'pin'
                  ? 'Skriv inn PIN-koden din.'
                  : step === 'create' && claiming
                    ? 'Brukeren din har ingen PIN ennå. Velg fire siffer for å beskytte den.'
                    : step === 'confirm'
                      ? 'Skriv de samme fire sifrene en gang til.'
                      : 'Fire siffer du bruker for å logge inn. Bare du kan endre det du har logget.'}
              </p>
              {note && <p className="form-error">{note}</p>}
            </div>
            <PinPad
              key={step}
              onComplete={async (pin) => {
                if (step === 'create') {
                  setFirstPin(pin)
                  setNote(null)
                  setStep('confirm')
                  return
                }
                if (step === 'confirm') {
                  if (pin !== firstPin) {
                    setFirstPin('')
                    setNote('Kodene var ulike. Velg PIN på nytt.')
                    setStep('create')
                    return
                  }
                  // a user from before PINs existed claims their account by logging in
                  return message(claiming ? await store.login(name, pin) : await store.register({ name, weight, sex }, pin))
                }
                return message(await store.login(name, pin))
              }}
            />
          </div>
        )}

        <p className="fineprint">Estimatene er veiledende og basert på Widmarks formel. Kjør aldri bil etter å ha drukket.</p>
      </div>
    </div>
  )
}
