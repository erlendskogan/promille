import { useEffect, useState } from 'react'
import { Drawer } from 'vaul'
import { KeyRound, LogOut, ShieldCheck, X } from 'lucide-react'
import type { AdminUser, Store } from '../lib/store'
import { Avatar, Name } from './Avatar'
import { PinPad } from './PinPad'
import { ProfileFields } from './ProfileFields'

export function ProfileSheet({ open, onOpenChange, store }: { open: boolean; onOpenChange: (o: boolean) => void; store: Store }) {
  const user = store.user!
  const [confirm, setConfirm] = useState<'clear' | 'delete' | null>(null)
  const [pinStep, setPinStep] = useState<'new' | 'repeat' | 'done' | null>(null)
  const [newPin, setNewPin] = useState('')
  const [admin, setAdmin] = useState<AdminUser[] | 'loading' | null>(null)

  useEffect(() => {
    if (!open) {
      setConfirm(null)
      setPinStep(null)
      setAdmin(null)
    }
  }, [open])

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="overlay" />
        <Drawer.Content className="sheet sheet-auto" aria-describedby={undefined}>
          <div className="sheet-handle" />
          <div className="sheet-head">
            <Drawer.Title className="sheet-title">Profil</Drawer.Title>
            <button className="icon-btn ghost" onClick={() => onOpenChange(false)} aria-label="Lukk">
              <X size={20} />
            </button>
          </div>
          <div className="sheet-scroll">
            <div className="profile-id">
              <Avatar name={user.name} gold={user.badge === 'gold'} size="lg" />
              <div>
                <strong>
                  <Name name={user.name} gold={user.badge === 'gold'} />
                </strong>
                {user.badge === 'gold' && <small className="gold-label">Gullprofil</small>}
                <small className="muted">{user.entries.length} registreringer totalt</small>
              </div>
            </div>
            <ProfileFields
              weight={user.weight}
              sex={user.sex}
              onWeight={(w) => store.updateProfile({ weight: Math.max(1, w) })}
              onSex={(s) => store.updateProfile({ sex: s })}
            />

            {pinStep === 'new' || pinStep === 'repeat' ? (
              <div className="pin-change">
                <strong>{pinStep === 'new' ? 'Ny PIN-kode' : 'Gjenta ny PIN-kode'}</strong>
                <PinPad
                  key={pinStep}
                  onComplete={async (pin) => {
                    if (pinStep === 'new') {
                      setNewPin(pin)
                      setPinStep('repeat')
                      return
                    }
                    if (pin !== newPin) {
                      setPinStep('new')
                      return 'Kodene var ulike. Prøv igjen.'
                    }
                    if (await store.changePin(pin)) setPinStep('done')
                    else return 'Fikk ikke lagret. Prøv igjen.'
                  }}
                />
                <button className="btn btn-secondary" onClick={() => setPinStep(null)}>
                  Avbryt
                </button>
              </div>
            ) : (
              <button className="btn btn-secondary" onClick={() => setPinStep('new')}>
                <KeyRound size={17} /> {pinStep === 'done' ? 'PIN-koden er endret' : 'Bytt PIN-kode'}
              </button>
            )}

            {user.isAdmin && (
              <div className="admin">
                <button
                  className="btn btn-secondary"
                  onClick={async () => {
                    if (admin) return setAdmin(null)
                    setAdmin('loading')
                    setAdmin((await store.adminUsers()) ?? null)
                  }}
                >
                  <ShieldCheck size={17} /> {admin ? 'Skjul brukere' : 'Admin: alle brukere'}
                </button>
                {admin === 'loading' && <p className="muted admin-note">Henter …</p>}
                {Array.isArray(admin) && (
                  <ul className="admin-list">
                    {admin.map((u) => (
                      <li key={u.key}>
                        <span>{u.name}</span>
                        <span className="muted">{u.sex === 'm' ? 'Mann' : 'Kvinne'}</span>
                        <strong>{u.weight} kg</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="profile-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  onOpenChange(false)
                  setTimeout(store.logout, 250)
                }}
              >
                <LogOut size={17} /> Bytt bruker
              </button>
              <button
                className={`btn btn-danger ${confirm === 'clear' ? 'armed' : ''}`}
                onClick={() => {
                  if (confirm !== 'clear') return setConfirm('clear')
                  store.clearEntries()
                  onOpenChange(false)
                }}
              >
                {confirm === 'clear' ? 'Trykk igjen for å slette all drikke' : 'Nullstill historikk'}
              </button>
              <button
                className={`btn btn-danger ${confirm === 'delete' ? 'armed' : ''}`}
                onClick={() => {
                  if (confirm !== 'delete') return setConfirm('delete')
                  onOpenChange(false)
                  setTimeout(store.deleteUser, 250)
                }}
              >
                {confirm === 'delete' ? 'Trykk igjen for å slette brukeren' : 'Slett bruker'}
              </button>
            </div>
            <p className="fineprint">Alle som bruker appen kan se navnet, promillen og drikken din. Vekt og kjønn er private, og bare du kan endre det du har logget.</p>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
