import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      await login(email, password)
      const from = (location.state as { from?: string } | null)?.from || '/'
      navigate(from)
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
          <button
            type="button"
            className="btn btn-outline"
            disabled
            title="Google OAuth será ativado quando as credenciais forem configuradas"
          >
            Entrar com Google (em breve)
          </button>
          <p style={{ fontSize: '0.9rem', color: '#666', marginTop: 8 }}>
            Não tem conta? <Link to="/cadastro">Criar conta</Link>
          </p>
          <p style={{ fontSize: '0.85rem', color: '#999', marginTop: 4 }}>
            Demo: <code>cliente@ibeauty.dev</code> / <code>ibeauty123</code>
          </p>
        </form>
      </div>
    </div>
  )
}
