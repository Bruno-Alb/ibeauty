import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, formatPrice, formatTime } from '../api'
import { useAuth } from '../auth'
import type { AvailableSlot, Provider, Service } from '../types'

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
        <h1 style={{ margin: 0 }}>{provider.business_name}</h1>
        <p style={{ color: '#666', margin: '4px 0' }}>
          {provider.full_name} • {provider.address} • {provider.city}/{provider.state}
        </p>
        {provider.bio && <p>{provider.bio}</p>}
        <span className="chip">{provider.category}</span>
      </div>

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
    </div>
  )
}
