import { useState } from 'react'
import { api } from '../api'
import type { Booking } from '../types'

interface Props {
  booking: Booking
  onClose(): void
  onSaved(): void
}

export default function ReviewModal({ booking, onClose, onSaved }: Props) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    setSaving(true)
    setErr('')
    try {
      await api.submitReview(booking.id, { rating, comment })
      onSaved()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 12,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: 440, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>Avaliar {booking.provider_business_name}</h2>
        <p className="muted" style={{ margin: '4px 0 12px' }}>
          {booking.service_name} · {new Date(booking.start_at).toLocaleDateString('pt-BR')}
        </p>
        <div className="star-input" style={{ marginBottom: 10 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={n <= rating ? 'on' : ''}
              onClick={() => setRating(n)}
              aria-label={`${n} estrelas`}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          className="input"
          rows={3}
          placeholder="Conte como foi o atendimento (opcional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        {err && <p className="error" style={{ marginTop: 8 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Enviando...' : 'Enviar avaliação'}
          </button>
        </div>
      </div>
    </div>
  )
}
