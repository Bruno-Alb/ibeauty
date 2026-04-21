import { useEffect, useState } from 'react'
import { api, formatDateTime, formatPrice } from '../api'
import { useAuth } from '../auth'
import type { Booking, Provider, Service } from '../types'

const CATEGORIES = ['manicure', 'cabelo', 'sobrancelha', 'estetica']

const emptyForm = {
  business_name: '',
  bio: '',
  category: 'manicure',
  address: '',
  city: '',
  state: 'SP',
  latitude: -23.5505,
  longitude: -46.6333,
  photo_url: '',
  working_hours_start: '09:00:00',
  working_hours_end: '18:00:00',
  slot_minutes: 30,
}

export default function ProviderDashboard() {
  const { refreshUser } = useAuth()
  const [profile, setProfile] = useState<Provider | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [tab, setTab] = useState<'perfil' | 'servicos' | 'agenda'>('perfil')
  const [err, setErr] = useState('')
  const [success, setSuccess] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [newService, setNewService] = useState({ name: '', description: '', price: '', duration: '' })
  const [geocoding, setGeocoding] = useState(false)

  async function load() {
    try {
      const p = await api.getMyProviderProfile()
      setProfile(p)
      setForm({
        business_name: p.business_name,
        bio: p.bio,
        category: p.category,
        address: p.address,
        city: p.city,
        state: p.state,
        latitude: p.latitude,
        longitude: p.longitude,
        photo_url: p.photo_url ?? '',
        working_hours_start: p.working_hours_start,
        working_hours_end: p.working_hours_end,
        slot_minutes: p.slot_minutes,
      })
    } catch {
      setProfile(null)
    }
  }

  useEffect(() => {
    load()
    api.providerBookings().then(setBookings).catch(() => {})
  }, [])

  async function geocodeAddress() {
    const q = `${form.address}, ${form.city}, ${form.state}, Brasil`
    setGeocoding(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
        { headers: { Accept: 'application/json' } },
      )
      const data = (await res.json()) as Array<{ lat: string; lon: string }>
      if (data.length > 0) {
        setForm((f) => ({ ...f, latitude: Number(data[0].lat), longitude: Number(data[0].lon) }))
        setSuccess('Endereço localizado no mapa.')
      } else {
        setErr('Não foi possível localizar o endereço.')
      }
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setGeocoding(false)
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setSuccess('')
    try {
      const payload = { ...form, photo_url: form.photo_url || null }
      await api.upsertMyProviderProfile(payload)
      setSuccess('Perfil salvo!')
      await refreshUser()
      await load()
      await api.providerBookings().then(setBookings)
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  async function addService(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    try {
      await api.addService({
        name: newService.name,
        description: newService.description,
        price_cents: Math.round(Number(newService.price) * 100),
        duration_minutes: Number(newService.duration),
      })
      setNewService({ name: '', description: '', price: '', duration: '' })
      await load()
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  async function removeService(id: number) {
    if (!confirm('Remover este serviço?')) return
    try {
      await api.deleteService(id)
      await load()
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  async function updateStatus(id: number, status: 'cancelled' | 'completed' | 'confirmed') {
    try {
      await api.updateBookingStatus(id, status)
      await api.providerBookings().then(setBookings)
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <div className="container">
      <h1 className="page-title">Painel do prestador</h1>
      <div className="tab-row">
        <button className={`tab${tab === 'perfil' ? ' active' : ''}`} onClick={() => setTab('perfil')}>Perfil</button>
        <button className={`tab${tab === 'servicos' ? ' active' : ''}`} onClick={() => setTab('servicos')}>Serviços</button>
        <button className={`tab${tab === 'agenda' ? ' active' : ''}`} onClick={() => setTab('agenda')}>Agenda</button>
      </div>

      {err && <p className="error">{err}</p>}
      {success && <p className="success">{success}</p>}

      {tab === 'perfil' && (
        <div className="card">
          <form className="form" style={{ maxWidth: 600 }} onSubmit={saveProfile}>
            <div className="field">
              <label>Nome do negócio</label>
              <input className="input" required value={form.business_name}
                onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))} />
            </div>
            <div className="field">
              <label>Sobre</label>
              <textarea className="input" rows={3} value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
            </div>
            <div className="field">
              <label>Categoria</label>
              <select className="select" value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Endereço</label>
              <input className="input" required value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="field">
                <label>Cidade</label>
                <input className="input" required value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="field">
                <label>Estado</label>
                <input className="input" required maxLength={2} value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
              <div className="field">
                <label>Latitude</label>
                <input className="input" type="number" step="any" value={form.latitude}
                  onChange={(e) => setForm((f) => ({ ...f, latitude: Number(e.target.value) }))} />
              </div>
              <div className="field">
                <label>Longitude</label>
                <input className="input" type="number" step="any" value={form.longitude}
                  onChange={(e) => setForm((f) => ({ ...f, longitude: Number(e.target.value) }))} />
              </div>
              <button type="button" className="btn btn-outline" disabled={geocoding} onClick={geocodeAddress}>
                {geocoding ? 'Buscando...' : 'Usar endereço'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div className="field">
                <label>Abre</label>
                <input className="input" type="time" value={form.working_hours_start.slice(0, 5)}
                  onChange={(e) => setForm((f) => ({ ...f, working_hours_start: `${e.target.value}:00` }))} />
              </div>
              <div className="field">
                <label>Fecha</label>
                <input className="input" type="time" value={form.working_hours_end.slice(0, 5)}
                  onChange={(e) => setForm((f) => ({ ...f, working_hours_end: `${e.target.value}:00` }))} />
              </div>
              <div className="field">
                <label>Intervalo (min)</label>
                <input className="input" type="number" min={15} step={15} value={form.slot_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, slot_minutes: Number(e.target.value) }))} />
              </div>
            </div>
            <button className="btn btn-primary" type="submit">Salvar perfil</button>
          </form>
        </div>
      )}

      {tab === 'servicos' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Seus serviços</h3>
          {profile ? (
            <div className="services-list">
              {profile.services.length === 0 && <p className="empty">Nenhum serviço ainda.</p>}
              {profile.services.map((s: Service) => (
                <div className="service-row" key={s.id}>
                  <div>
                    <strong>{s.name}</strong>
                    {s.description && <div style={{ fontSize: '0.85rem', color: '#666' }}>{s.description}</div>}
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>{s.duration_minutes} min</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <strong>{formatPrice(s.price_cents)}</strong>
                    <button className="btn btn-danger" onClick={() => removeService(s.id)}>Remover</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">Crie seu perfil primeiro na aba "Perfil".</p>
          )}

          {profile && (
            <form className="form" style={{ marginTop: 20 }} onSubmit={addService}>
              <h4 style={{ margin: 0 }}>Adicionar serviço</h4>
              <div className="field">
                <label>Nome</label>
                <input className="input" required value={newService.name}
                  onChange={(e) => setNewService((s) => ({ ...s, name: e.target.value }))} />
              </div>
              <div className="field">
                <label>Descrição</label>
                <input className="input" value={newService.description}
                  onChange={(e) => setNewService((s) => ({ ...s, description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label>Preço (R$)</label>
                  <input className="input" type="number" step="0.01" min={0} required value={newService.price}
                    onChange={(e) => setNewService((s) => ({ ...s, price: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Duração (min)</label>
                  <input className="input" type="number" min={5} step={5} required value={newService.duration}
                    onChange={(e) => setNewService((s) => ({ ...s, duration: e.target.value }))} />
                </div>
              </div>
              <button className="btn btn-primary">Adicionar</button>
            </form>
          )}
        </div>
      )}

      {tab === 'agenda' && (
        <div className="card">
          {bookings.length === 0 ? (
            <p className="empty">Você ainda não tem agendamentos.</p>
          ) : (
            bookings.map((b) => (
              <div className="booking-row" key={b.id}>
                <div>
                  <strong>{b.service_name}</strong>
                  <div style={{ color: '#666', fontSize: '0.9rem' }}>
                    {b.client_name} • {formatDateTime(b.start_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`status-badge status-${b.status}`}>{b.status}</span>
                  {b.status === 'confirmed' && (
                    <>
                      <button className="btn btn-outline" onClick={() => updateStatus(b.id, 'completed')}>
                        Marcar concluído
                      </button>
                      <button className="btn btn-danger" onClick={() => updateStatus(b.id, 'cancelled')}>
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
