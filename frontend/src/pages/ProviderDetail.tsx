import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, formatPrice, formatTime } from '../api'
import { useAuth } from '../auth'
import type { AvailableSlot, Provider, Review, Service } from '../types'

function todayISO(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export default function ProviderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const providerId = Number(id)

  const [provider, setProvider] = useState<Provider | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [err, setErr] = useState('')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [day, setDay] = useState(todayISO())
  const [slots, setSlots] = useState<AvailableSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [booking, setBooking] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    api.getProvider(providerId).then((p) => {
      setProvider(p)
      if (p.services.length > 0) setSelectedService(p.services[0])
    }).catch((e: Error) => setErr(e.message))
    api.listReviews(providerId).then(setReviews).catch(() => setReviews([]))
  }, [providerId])

  useEffect(() => {
    if (!selectedService) return
    setSelectedSlot(null)
    setSlots([])
    api.availability(providerId, selectedService.id, day).then(setSlots).catch((e: Error) => setErr(e.message))
  }, [providerId, selectedService, day])

  async function confirm() {
    if (!selectedService || !selectedSlot) return
    if (!user) {
      navigate('/login', { state: { from: `/prestador/${providerId}` } })
      return
    }
    setBooking(true)
    setErr('')
    try {
      await api.createBooking({
        provider_id: providerId,
        service_id: selectedService.id,
        start_at: selectedSlot,
      })
      setSuccess('Agendamento confirmado!')
      setTimeout(() => navigate('/minhas-reservas'), 900)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBooking(false)
    }
  }

  const minDay = useMemo(() => todayISO(), [])

  if (!provider) {
    return (
      <div className="container">
        {err ? <p className="error">{err}</p> : <p>Carregando...</p>}
      </div>
    )
  }

  return (
    <div className="container">
      <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Voltar</button>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>{provider.business_name}</h1>
          {provider.plan === 'pro' && <span className="pro-badge">Pro</span>}
          {provider.rating_avg != null && (
            <span className="rating-inline">
              ★ {provider.rating_avg.toFixed(1)} <small>({provider.rating_count})</small>
            </span>
          )}
        </div>
        <p style={{ color: '#666', margin: '4px 0' }}>
          {provider.full_name} • {provider.address} • {provider.city}/{provider.state}
        </p>
        {provider.bio && <p>{provider.bio}</p>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="chip">{provider.category}</span>
          {provider.slug && (
            <Link className="btn btn-ghost btn-sm" to={`/p/${provider.slug}`}>
              Ver perfil público
            </Link>
          )}
        </div>
      </div>

      {provider.gallery.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 style={{ marginTop: 0 }}>Galeria</h2>
          <div className="gallery-grid">
            {provider.gallery.map((url) => (
              <img key={url} src={url} alt={provider.business_name} loading="lazy" />
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Serviços</h2>
        <div className="services-list">
          {provider.services.map((s) => (
            <div
              key={s.id}
              className="service-row"
              onClick={() => setSelectedService(s)}
              style={{
                cursor: 'pointer',
                outline: selectedService?.id === s.id ? '2px solid #e91e63' : 'none',
              }}
            >
              <div>
                <strong>{s.name}</strong>
                {s.description && <div style={{ fontSize: '0.85rem', color: '#666' }}>{s.description}</div>}
                <div style={{ fontSize: '0.8rem', color: '#666' }}>{s.duration_minutes} min</div>
              </div>
              <strong>{formatPrice(s.price_cents)}</strong>
            </div>
          ))}
          {provider.services.length === 0 && <p className="empty">Sem serviços cadastrados ainda.</p>}
        </div>
      </div>

      {selectedService && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 style={{ marginTop: 0 }}>Escolher horário</h2>
          <p style={{ color: '#666', marginTop: 0 }}>
            {selectedService.name} — {formatPrice(selectedService.price_cents)} ({selectedService.duration_minutes} min)
          </p>
          <div className="field" style={{ maxWidth: 200 }}>
            <label>Dia</label>
            <input
              className="input"
              type="date"
              value={day}
              min={minDay}
              onChange={(e) => setDay(e.target.value)}
            />
          </div>
          <div className="slots">
            {slots.length === 0 ? (
              <p className="empty" style={{ gridColumn: '1 / -1' }}>Sem horários disponíveis neste dia.</p>
            ) : (
              slots.map((s) => (
                <button
                  key={s.start_at}
                  className={`slot-btn${selectedSlot === s.start_at ? ' selected' : ''}`}
                  onClick={() => setSelectedSlot(s.start_at)}
                >
                  {formatTime(s.start_at)}
                </button>
              ))
            )}
          </div>

          {err && <p className="error">{err}</p>}
          {success && <p className="success">{success}</p>}

          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            disabled={!selectedSlot || booking}
            onClick={confirm}
          >
            {booking ? 'Confirmando...' : selectedSlot ? `Confirmar agendamento às ${formatTime(selectedSlot)}` : 'Selecione um horário'}
          </button>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Avaliações</h2>
        {reviews.length === 0 ? (
          <p className="muted">Ainda não há avaliações. Seja a primeira depois do seu atendimento!</p>
        ) : (
          <div className="review-list">
            {reviews.map((r) => (
              <div key={r.id} className="review-row">
                <div className="stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                <div className="meta">
                  {r.client_name} · {new Date(r.created_at).toLocaleDateString('pt-BR')}
                </div>
                {r.comment && <p style={{ margin: '4px 0 0' }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
