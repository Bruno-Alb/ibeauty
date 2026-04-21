export type UserRole = 'client' | 'provider'

export interface User {
  id: number
  email: string
  full_name: string
  phone: string | null
  role: UserRole
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export interface Service {
  id: number
  provider_id: number
  name: string
  description: string
  price_cents: number
  duration_minutes: number
}

export interface Provider {
  id: number
  user_id: number
  full_name: string
  business_name: string
  bio: string
  category: string
  address: string
  city: string
  state: string
  latitude: number
  longitude: number
  photo_url: string | null
  working_hours_start: string
  working_hours_end: string
  slot_minutes: number
  services: Service[]
  distance_km: number | null
}

export interface AvailableSlot {
  start_at: string
  end_at: string
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export interface Booking {
  id: number
  client_id: number
  provider_id: number
  service_id: number
  start_at: string
  end_at: string
  status: BookingStatus
  notes: string
  created_at: string
  service_name: string
  provider_business_name: string
  client_name: string
}
