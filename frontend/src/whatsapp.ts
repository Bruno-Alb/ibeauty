import type { Booking } from './types'

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  return digits.length <= 11 ? `55${digits}` : digits
}

export function formatBookingWhen(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function whatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

export function providerReminderUrl(b: Booking): string | null {
  const phone = normalizePhone(b.provider_phone)
  if (!phone) return null
  const when = formatBookingWhen(b.start_at)
  const message =
    `Olá! Confirmando meu agendamento no ${b.provider_business_name}: ` +
    `${b.service_name} em ${when}. Obrigado!`
  return whatsappUrl(phone, message)
}

export function clientReminderUrl(b: Booking): string | null {
  const phone = normalizePhone(b.client_phone)
  if (!phone) return null
  const when = formatBookingWhen(b.start_at)
  const message =
    `Olá, ${b.client_name}! Lembrete do seu horário no ${b.provider_business_name}: ` +
    `${b.service_name} em ${when}. Até lá!`
  return whatsappUrl(phone, message)
}
