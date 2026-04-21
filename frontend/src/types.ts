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

export type ProviderPlan = 'free' | 'pro_pending' | 'pro'

export interface Provider {
  id: number
  user_id: number
  slug: string
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
  gallery: string[]
  working_hours_start: string
  working_hours_end: string
  slot_minutes: number
  services: Service[]
  distance_km: number | null
  plan: ProviderPlan
  pro_expires_at: string | null
  rating_avg: number | null
  rating_count: number
}

export interface Review {
  id: number
  booking_id: number
  provider_id: number
  client_id: number
  client_name: string
  rating: number
  comment: string
  created_at: string
}

export interface PlanInfo {
  plan: ProviderPlan
  pro_requested_at: string | null
  pro_approved_at: string | null
  pro_expires_at: string | null
  price_cents: number
  pix_key: string
  pix_key_type: string
  pix_receiver_name: string
  pix_payload: string | null
}

export interface AdminProRequest {
  provider_id: number
  business_name: string
  user_email: string
  requested_at: string
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
  provider_phone: string | null
  client_name: string
  client_phone: string | null
}
