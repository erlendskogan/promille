import { Dashboard } from './components/Dashboard'
import { Login } from './components/Login'
import { useStore } from './lib/store'

export default function App() {
  const store = useStore()
  return store.user ? <Dashboard key={store.user.name} store={store} /> : <Login store={store} />
}
