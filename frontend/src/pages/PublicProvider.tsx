import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, formatPrice } from '../api'
import type { Provider, Review } from '../types'

export default function PublicProvider() {
  const { slug } = useParams<{ slug: string }>()
  const [provider, setProvider] = useState<Provider | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!slug) return
    setErr('')
    api.getProviderBySlug(slug)
      .then(async (p) => {
        setProvider(p)
        try {
          setReviews(await api.listReviews(p.id))
        } catch {
          /* reviews are public but may fail; ignore */
        }
      })
      .catch((e: Error) => setErr(e.message))
  }, [slug])

  if (err) return <div className="container"><p className="error">{err}</p></div>
  if (!provider) return <div className="container"><p>Carregando...</p></div>

  const shareUrl = window.location.href

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: provider?.business_name, url: shareUrl })
      } catch { /* ignore */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl)
        alert('Link copiado!')
      } catch {
        alert(shareUrl)
      }
    }
  }

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>{provider.business_name}</h1>
          {provider.plan === 'pro' && <span className="pro-badge">Pro</span>}
          {provider.rating_avg != null && (
            <span className="rating-inline">
              ★ {provider.rating_avg.toFixed(1)} <small>({provider.rating_count})</small>
            </span>
          )}
        </div>
        <p style={{ color: '#666', margin: '6px 0 0' }}>
          {provider.full_name} • {provider.address} • {provider.city}/{provider.state}
        </p>
        {provider.bio && <p style={{ marginTop: 12 }}>{provider.bio}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <span className="chip">{provider.category}</span>
          <Link className="btn btn-primary btn-sm" to={`/prestador/${provider.id}`}>Agendar horário</Link>
          <button className="btn btn-outline btn-sm" onClick={share}>Compartilhar perfil</button>
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
          {provider.services.length === 0 ? (
            <p className="empty">Sem serviços cadastrados ainda.</p>
          ) : provider.services.map((s) => (
            <div key={s.id} className="service-row">
              <div>
                <strong>{s.name}</strong>
                {s.description && <div style={{ fontSize: '0.85rem', color: '#666' }}>{s.description}</div>}
                <div style={{ fontSize: '0.8rem', color: '#666' }}>{s.duration_minutes} min</div>
              </div>
              <strong>{formatPrice(s.price_cents)}</strong>
            </div>
          ))}
        </div>
      </div>

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
