import { useEffect, useState } from 'react'
import { api, formatDateTime } from '../api'
import type { Booking } from '../types'

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

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
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`status-badge status-${b.status}`}>{b.status}</span>
                {b.status === 'confirmed' && (
                  <button className="btn btn-danger" onClick={() => cancel(b.id)}>
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
