import type {
  AuthResponse,
  AvailableSlot,
  Booking,
  BookingStatus,
  Provider,
  Service,
  User,
  UserRole,
} from './types'

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:8000'

const TOKEN_KEY = 'ibeauty_token'
const USER_KEY = 'ibeauty_user'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function setAuth(resp: AuthResponse): void {
  localStorage.setItem(TOKEN_KEY, resp.access_token)
  localStorage.setItem(USER_KEY, JSON.stringify(resp.user))
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  if (!res.ok) {
    let detail = `Erro ${res.status}`
    try {
      const body = await res.json()
      if (body && typeof body.detail === 'string') detail = body.detail
    } catch {
      /* noop */
    }
    throw new Error(detail)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  register: (data: { email: string; password: string; full_name: string; phone?: string; role?: UserRole }) =>
    request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<User>('/api/auth/me'),
  updateMe: (data: { full_name?: string; phone?: string }) =>
    request<User>('/api/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),

  listProviders: (params: {
    lat?: number
    lng?: number
    radius_km?: number
    category?: string
    q?: string
  }) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) qs.set(k, String(v))
    })
    return request<Provider[]>(`/api/providers${qs.toString() ? `?${qs}` : ''}`)
  },
  getProvider: (id: number) => request<Provider>(`/api/providers/${id}`),
  upsertMyProviderProfile: (data: Partial<Provider>) =>
    request<Provider>('/api/providers/me', { method: 'POST', body: JSON.stringify(data) }),
  getMyProviderProfile: () => request<Provider>('/api/providers/me/profile'),
  addService: (data: { name: string; description: string; price_cents: number; duration_minutes: number }) =>
    request<Service>('/api/providers/me/services', { method: 'POST', body: JSON.stringify(data) }),
  deleteService: (id: number) =>
    request<void>(`/api/providers/me/services/${id}`, { method: 'DELETE' }),

  availability: (providerId: number, serviceId: number, day: string) =>
    request<AvailableSlot[]>(
      `/api/providers/${providerId}/availability?service_id=${serviceId}&day=${day}`,
    ),
  createBooking: (data: { provider_id: number; service_id: number; start_at: string; notes?: string }) =>
    request<Booking>('/api/bookings', { method: 'POST', body: JSON.stringify(data) }),
  myBookings: () => request<Booking[]>('/api/bookings/me'),
  providerBookings: () => request<Booking[]>('/api/bookings/provider'),
  updateBookingStatus: (id: number, status: BookingStatus) =>
    request<Booking>(`/api/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
}

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
