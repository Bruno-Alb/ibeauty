import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import GoogleSignInButton from '../components/GoogleSignInButton'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const redirectTo = (location.state as { from?: string } | null)?.from || '/'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      await login(email, password)
      navigate(redirectTo)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <h1 className="page-title">Entrar</h1>
      <div className="card">
        <form className="form" onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Senha</label>
            <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {err && <p className="error">{err}</p>}
          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0', color: '#999', fontSize: '0.85rem' }}>
          <div style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
          <span>ou</span>
          <div style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
        </div>
        <GoogleSignInButton
          text="signin_with"
          onSuccess={() => navigate(redirectTo)}
          onError={(m) => setErr(m)}
        />
        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: 16 }}>
          Não tem conta? <Link to="/cadastro">Criar conta</Link>
        </p>
        <p style={{ fontSize: '0.85rem', color: '#999', marginTop: 4 }}>
          Demo: <code>cliente@ibeauty.dev</code> / <code>ibeauty123</code>
        </p>
      </div>
    </div>
  )
}
