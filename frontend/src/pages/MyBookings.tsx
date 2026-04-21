import { useEffect, useState } from 'react'
import { api, formatDateTime } from '../api'
import { useAuth } from '../auth'
import type { Booking } from '../types'
import { providerReminderUrl } from '../whatsapp'
import ReviewModal from '../components/ReviewModal'

export default function MyBookings() {
  const { user, refreshUser } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [savingPhone, setSavingPhone] = useState(false)
  const [phoneMsg, setPhoneMsg] = useState('')
  const [reviewing, setReviewing] = useState<Booking | null>(null)

  useEffect(() => { setPhone(user?.phone ?? '') }, [user?.phone])

  async function savePhone(e: React.FormEvent) {
    e.preventDefault()
    setPhoneMsg('')
    setSavingPhone(true)
    try {
      await api.updateMe({ phone })
      await refreshUser()
      setPhoneMsg('Telefone salvo.')
    } catch (e) {
      setPhoneMsg((e as Error).message)
    } finally {
      setSavingPhone(false)
    }
  }

  function load() {
    setLoading(true)
    api.myBookings().then(setBookings).catch((e: Error) => setErr(e.message)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function cancel(id: number) {
    if (!confirm('Cancelar este agendamento?')) return
    try {
      await api.updateBookingStatus(id, 'cancelled')
      load()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <div className="container">
      <h1 className="page-title">Minhas reservas</h1>
      {err && <p className="error">{err}</p>}
      <div className="card" style={{ marginBottom: 16 }}>
        <form className="form" onSubmit={savePhone} style={{ maxWidth: 420 }}>
          <div className="field">
            <label>Seu telefone / WhatsApp</label>
            <input
              className="input"
              type="tel"
              placeholder="(11) 99999-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <small style={{ color: '#666' }}>
              O prestador pode te mandar lembretes por aqui.
            </small>
          </div>
          <button className="btn btn-outline" type="submit" disabled={savingPhone}>
            {savingPhone ? 'Salvando...' : 'Salvar telefone'}
          </button>
          {phoneMsg && <p className="muted" style={{ margin: 0 }}>{phoneMsg}</p>}
        </form>
      </div>
      <div className="card">
        {loading ? (
          <p className="empty">Carregando...</p>
        ) : bookings.length === 0 ? (
          <p className="empty">Você ainda não tem reservas.</p>
        ) : (
          bookings.map((b) => (
            <div className="booking-row" key={b.id}>
              <div>
                <strong>{b.service_name}</strong>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>
                  com {b.provider_business_name} • {formatDateTime(b.start_at)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`status-badge status-${b.status}`}>{b.status}</span>
                {b.status === 'confirmed' && (
                  (() => {
                    const url = providerReminderUrl(b)
                    return url ? (
                      <a className="btn btn-whatsapp" href={url} target="_blank" rel="noreferrer">
                        Lembrar no WhatsApp
                      </a>
                    ) : (
                      <span className="muted" title="Prestador ainda não cadastrou telefone">
                        sem WhatsApp
                      </span>
                    )
                  })()
                )}
                {b.status === 'confirmed' && (
                  <button className="btn btn-danger" onClick={() => cancel(b.id)}>
                    Cancelar
                  </button>
                )}
                {(b.status === 'completed' || b.status === 'confirmed') && (
                  <button className="btn btn-outline btn-sm" onClick={() => setReviewing(b)}>
                    ★ Avaliar
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      {reviewing && (
        <ReviewModal
          booking={reviewing}
          onClose={() => setReviewing(null)}
          onSaved={() => {
            setReviewing(null)
            setPhoneMsg('Avaliação enviada! Obrigado ⭐')
            setTimeout(() => setPhoneMsg(''), 2500)
          }}
        />
      )}
    </div>
  )
}
