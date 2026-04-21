import { useEffect, useState } from 'react'
import { api } from '../api'
import type { AdminProRequest } from '../types'

const TOKEN_KEY = 'ibeauty_admin_token'

export default function Admin() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? '')
  const [requests, setRequests] = useState<AdminProRequest[]>([])
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function load(t = token) {
    if (!t) return
    setLoading(true)
    setErr('')
    try {
      setRequests(await api.adminListProRequests(t))
      localStorage.setItem(TOKEN_KEY, t)
    } catch (e) {
      setErr((e as Error).message)
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) load(token)
  }, [])

  async function approve(providerId: number) {
    setMsg('')
    try {
      await api.adminApprovePro(token, providerId, 1)
      setMsg(`Prestador #${providerId} agora é Pro por 30 dias.`)
      await load()
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  async function revoke(providerId: number) {
    if (!confirm('Revogar Pro deste prestador?')) return
    setMsg('')
    try {
      await api.adminRevokePro(token, providerId)
      setMsg(`Plano revogado para prestador #${providerId}.`)
      await load()
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  return (
    <div className="container">
      <h1 className="page-title">Admin · aprovações Pro</h1>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="field">
          <label>Token de admin</label>
          <input
            className="input"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="X-Admin-Token"
            style={{ maxWidth: 420 }}
          />
        </div>
        <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => load()}>
          Carregar solicitações
        </button>
      </div>

      {err && <p className="error">{err}</p>}
      {msg && <p className="success">{msg}</p>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Solicitações Pendentes</h2>
        {loading ? (
          <p className="empty">Carregando...</p>
        ) : requests.length === 0 ? (
          <p className="muted">Nenhuma solicitação pendente no momento.</p>
        ) : (
          requests.map((r) => (
            <div key={r.provider_id} className="booking-row">
              <div>
                <strong>#{r.provider_id} · {r.business_name}</strong>
                <div className="muted" style={{ fontStyle: 'normal' }}>
                  {r.user_email} · solicitado em {new Date(r.requested_at).toLocaleString('pt-BR')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => approve(r.provider_id)}>
                  Aprovar (+30 dias)
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => revoke(r.provider_id)}>
                  Rejeitar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
