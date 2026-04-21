import { useCallback, useEffect, useMemo, useState } from 'react'
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

type LocStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable' | 'timeout' | 'manual'

export default function Home() {
  const navigate = useNavigate()
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null)
  const [locStatus, setLocStatus] = useState<LocStatus>('idle')
  const [locAccuracy, setLocAccuracy] = useState<number | null>(null)
  const [locLabel, setLocLabel] = useState<string>('')
  const [manualQuery, setManualQuery] = useState('')
  const [manualSearching, setManualSearching] = useState(false)
  const [category, setCategory] = useState('')
  const [q, setQ] = useState('')
  const [radius, setRadius] = useState(50)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const requestGeolocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocStatus('unavailable')
      return
    }
    setLocStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc([pos.coords.latitude, pos.coords.longitude])
        setLocAccuracy(pos.coords.accuracy)
        setLocStatus('granted')
        setLocLabel('Sua localização atual')
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) setLocStatus('denied')
        else if (error.code === error.TIMEOUT) setLocStatus('timeout')
        else setLocStatus('unavailable')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }, [])

  useEffect(() => {
    requestGeolocation()
  }, [requestGeolocation])

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

  const searchManualLocation = useCallback(async () => {
    const query = manualQuery.trim()
    if (!query) return
    setManualSearching(true)
    setErr('')
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>
      if (data.length === 0) {
        setErr(`Não encontrei "${query}". Tente cidade, bairro ou CEP.`)
        return
      }
      const { lat, lon, display_name } = data[0]
      setUserLoc([Number(lat), Number(lon)])
      setLocStatus('manual')
      setLocAccuracy(null)
      setLocLabel(display_name.split(',').slice(0, 3).join(',').trim())
    } catch {
      setErr('Erro ao buscar localização. Tente novamente.')
    } finally {
      setManualSearching(false)
    }
  }, [manualQuery])

  const visibleProviders = useMemo(() => providers, [providers])

  const locMessage = (() => {
    switch (locStatus) {
      case 'idle':
      case 'requesting':
        return 'Localizando você...'
      case 'granted':
        return `📍 ${locLabel}${locAccuracy != null ? ` (precisão ±${Math.round(locAccuracy)}m)` : ''}`
      case 'manual':
        return `📍 ${locLabel}`
      case 'denied':
        return 'Permissão de localização negada. Busque pelo endereço abaixo ou libere o acesso nas configurações do navegador e clique em "Usar minha localização".'
      case 'timeout':
        return 'Demorou para obter sua localização. Tente de novo ou busque por endereço.'
      case 'unavailable':
        return 'Não consegui acessar o GPS. Busque pelo endereço abaixo.'
    }
  })()

  const locTone =
    locStatus === 'granted' || locStatus === 'manual'
      ? '#2e7d32'
      : locStatus === 'denied' || locStatus === 'unavailable' || locStatus === 'timeout'
        ? '#b71c1c'
        : '#666'

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
        <select
          className="select"
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          disabled={!userLoc}
          title={!userLoc ? 'Defina sua localização para filtrar por distância' : undefined}
        >
          <option value={5}>Até 5 km</option>
          <option value={10}>Até 10 km</option>
          <option value={25}>Até 25 km</option>
          <option value={50}>Até 50 km</option>
          <option value={20037}>Qualquer distância</option>
        </select>
      </div>

      <div className="loc-bar">
        <span style={{ color: locTone, fontSize: '0.9rem' }}>{locMessage}</span>
        <button type="button" className="btn btn-outline btn-sm" onClick={requestGeolocation} disabled={locStatus === 'requesting'}>
          {locStatus === 'requesting' ? 'Buscando GPS...' : '📍 Usar minha localização'}
        </button>
      </div>

      <div className="loc-manual">
        <input
          className="input"
          placeholder="Ou digite cidade, bairro ou CEP (ex.: Vila Mariana, São Paulo)"
          value={manualQuery}
          onChange={(e) => setManualQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !manualSearching) searchManualLocation() }}
          style={{ flex: 1, minWidth: 240 }}
        />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={searchManualLocation}
          disabled={manualSearching || !manualQuery.trim()}
        >
          {manualSearching ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

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
          onSelect={(id) => {
            setSelectedId(id)
            navigate(`/prestador/${id}`)
          }}
        />
      </div>
    </div>
  )
}
