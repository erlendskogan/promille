import { Dashboard } from './components/Dashboard'
import { Login } from './components/Login'
import { configured } from './lib/supabase'
import { useStore } from './lib/store'

export default function App() {
  const store = useStore()

  if (!configured || store.status === 'error')
    return (
      <div className="splash">
        <div className="brand">
          <span className="brand-mark" />
          Promille
        </div>
        <p className="muted">{configured ? 'Får ikke kontakt med serveren.' : 'Databasen er ikke satt opp ennå.'}</p>
        {configured && (
          <button className="btn btn-secondary" onClick={() => store.reload()}>
            Prøv igjen
          </button>
        )}
      </div>
    )

  if (store.hasSession && !store.user)
    return (
      <div className="splash">
        <div className="brand pulse">
          <span className="brand-mark" />
          Promille
        </div>
      </div>
    )

  return store.user ? <Dashboard key={store.user.key} store={store} /> : <Login store={store} />
}
