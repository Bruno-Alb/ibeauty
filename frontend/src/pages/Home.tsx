import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import ProviderMap from '../components/ProviderMap'
import type { Provider } from '../types'

const CATEGORIES = [
  { value: '', label: 'Todas as categorias' },
  { value: 'manicure', label: 'Manicure' },
  { value: 'cabelo', label: 'Cabelo' },
  { value: 'sobrancelha', label: 'Sobrancelha' },
  { value: 'estetica', label: 'Estética' },
]

export default function Home() {
  const navigate = useNavigate()
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null)
  const [locDenied, setLocDenied] = useState(false)
  const [category, setCategory] = useState('')
  const [q, setQ] = useState('')
  const [radius, setRadius] = useState(50)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocDenied(true)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc([pos.coords.latitude, pos.coords.longitude]),
      () => setLocDenied(true),
      { timeout: 8000 },
    )
  }, [])

  useEffect(() => {
    setLoading(true)
    setErr('')
    const params: { lat?: number; lng?: number; radius_km?: number; category?: string; q?: string } = {
      category: category || undefined,
      q: q || undefined,
    }
    if (userLoc) {
      params.lat = userLoc[0]
      params.lng = userLoc[1]
      params.radius_km = radius
    }
    api
      .listProviders(params)
      .then(setProviders)
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false))
  }, [userLoc, category, q, radius])

  const visibleProviders = useMemo(() => providers, [providers])

  return (
    <div className="container">
      <section className="hero">
        <h1>Beleza pertinho de você</h1>
        <p>Encontre profissionais de manicure, cabelo, sobrancelha e estética na sua região e agende seu horário.</p>
      </section>

      <div className="filters">
        <input
          className="input"
          placeholder="Buscar por serviço, nome ou bairro..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        {userLoc && (
          <select
            className="select"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
          >
            <option value={5}>Até 5 km</option>
            <option value={10}>Até 10 km</option>
            <option value={25}>Até 25 km</option>
            <option value={50}>Até 50 km</option>
            <option value={20037}>Qualquer distância</option>
          </select>
        )}
      </div>

      {locDenied && (
        <p style={{ color: '#666', marginTop: 12, fontSize: '0.9rem' }}>
          Localização não disponível — mostrando todos os profissionais.
        </p>
      )}
      {err && <p className="error">{err}</p>}

      <div className="provider-grid">
        <div className="provider-list">
          {loading ? (
            <p className="empty">Carregando...</p>
          ) : visibleProviders.length === 0 ? (
            <p className="empty">Nenhum profissional encontrado por aqui.</p>
          ) : (
            visibleProviders.map((p) => (
              <div
                key={p.id}
                className={`card provider-card${selectedId === p.id ? ' selected' : ''}`}
                onClick={() => {
                  setSelectedId(p.id)
                  navigate(`/prestador/${p.id}`)
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <h3>{p.business_name}</h3>
                    <div className="meta">{p.full_name} • {p.city}/{p.state}</div>
                  </div>
                  {p.distance_km != null && (
                    <span className="distance-badge">{p.distance_km.toFixed(1)} km</span>
                  )}
                </div>
                {p.bio && <p style={{ margin: '8px 0 0', color: '#555', fontSize: '0.92rem' }}>{p.bio}</p>}
                <div className="chips">
                  <span className="chip">{p.category}</span>
                  {p.services.slice(0, 3).map((s) => (
                    <span key={s.id} className="chip">{s.name}</span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        <ProviderMap
          providers={visibleProviders}
          userLocation={userLoc}
          selectedId={selectedId}
          onSelect={(id) => navigate(`/prestador/${id}`)}
        />
      </div>
    </div>
  )
}
