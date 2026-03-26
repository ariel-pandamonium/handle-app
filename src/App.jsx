import { useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useAuthStore } from './lib/store'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DropFloatingButton from './components/DropFloatingButton'

export default function App() {
  const { session, loading, setSession } = useAuthStore()

  useEffect(() => {
    // Check for existing session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [setSession])

  if (loading) {
    return (
      <div style={styles.loading}>
        <h1 style={styles.logo}>Handle.</h1>
      </div>
    )
  }

  return session ? (
    <>
      <Dashboard />
      <DropFloatingButton />
    </>
  ) : <Login />
}

const styles = {
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-subtle)',
  },
  logo: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
}
