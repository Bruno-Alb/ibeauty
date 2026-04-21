import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import GoogleSignInButton from '../components/GoogleSignInButton'
import type { UserRole } from '../types'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'client' as UserRole,
  })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      await register(form)
      navigate(form.role === 'provider' ? '/prestador' : '/')
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <h1 className="page-title">Criar conta</h1>
      <div className="card">
        <form className="form" onSubmit={submit}>
          <div className="field">
            <label>Nome completo</label>
            <input className="input" required value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" required value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="field">
            <label>Telefone (opcional)</label>
            <input className="input" value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="field">
            <label>Senha</label>
            <input className="input" type="password" required minLength={6} value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="field">
            <label>Você é...</label>
            <select
              className="select"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            >
              <option value="client">Cliente — quero marcar horários</option>
              <option value="provider">Profissional — quero oferecer serviços</option>
            </select>
          </div>
          {err && <p className="error">{err}</p>}
          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Criando...' : 'Criar conta'}
          </button>
        </form>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0', color: '#999', fontSize: '0.85rem' }}>
          <div style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
          <span>ou</span>
          <div style={{ flex: 1, height: 1, background: '#e5e5e5' }} />
        </div>
        <GoogleSignInButton
          role={form.role}
          text="signup_with"
          onSuccess={(u) => navigate(u.role === 'provider' ? '/prestador' : '/')}
          onError={(m) => setErr(m)}
        />
        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: 16 }}>
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
