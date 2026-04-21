# Ibeauty — Test Plan

**Deployed URLs**
- Frontend: https://dist-jxxmbtyi.devinapps.com
- Backend: https://ibeauty-backend-rtooewzi.fly.dev

**Seed credentials** (from `backend/app/seed.py`, password `ibeauty123`):
- Client: `cliente@ibeauty.dev`
- Provider: `ana.manicure@ibeauty.dev` (Ana Nail Studio, São Paulo)

## What changed (user-visible)

This is a first-version scaffold of Ibeauty — a web marketplace where clients find
beauty-service providers (manicure/cabelo/sobrancelha/estética) nearby and book a
slot. The app must actually work end-to-end: mapped providers, working login,
real slot availability from server, real booking creation persisted to SQLite
on a Fly.io volume.

## Primary flow — Book a manicure with Ana Nail Studio as `cliente@ibeauty.dev`

Each step has an explicit expected observable outcome. A broken implementation
(fake data, hard-coded slots, booking not persisted, etc.) would produce a
visibly different outcome at one of these steps.

1. **Open the homepage** (`/`).
   - Assert: A Leaflet map is visible on the right (tiles load, OpenStreetMap
     attribution in the bottom-right).
   - Assert: The provider list on the left shows **at least 5 provider cards**,
     and "Ana Nail Studio" is one of them. (Seed has exactly 5.)
   - Assert: Each card shows a category chip and service chips (proves the
     `/api/providers` response includes nested services, not just mock names).

2. **Filter by category = "Manicure"**.
   - Action: Pick "Manicure" in the category dropdown.
   - Assert: The list shrinks to **exactly 2 cards** — "Ana Nail Studio" and
     "Elaine Nails Vila Mariana" (the only two providers in category `manicure`
     in the seed). Any other count means the filter is broken or seed is wrong.

3. **Open Ana Nail Studio** by clicking the card.
   - Assert: URL becomes `/prestador/1` (or matching id).
   - Assert: Page shows business name "Ana Nail Studio", address
     "Rua Augusta, 1200", city "São Paulo" and three services including
     "Manicure simples — R$ 35,00 (45 min)".

4. **Try to book without being logged in** (from the provider detail page,
   pick "Manicure simples", pick tomorrow's date, click an available slot, then
   click "Confirmar agendamento").
   - Assert: User is redirected to `/login` with a `state.from` back to the
     provider page (login page should render, not a 404).

5. **Log in as `cliente@ibeauty.dev` / `ibeauty123`**.
   - Assert: After submit, we land back on the provider page (or home), and the
     navbar shows the user's first name and a "Sair" button (proves the JWT
     round-trip works).

6. **Select service "Manicure simples", pick tomorrow's date, pick the earliest
   available slot**.
   - Assert: The slot grid is non-empty and shows times like 09:00, 09:30, ...
     within Ana's `09:00–19:00` working hours (proves `/availability` is
     server-driven, not hardcoded client-side).
   - Assert: Clicking a slot visibly highlights it (pink background).

7. **Click "Confirmar agendamento às HH:MM"**.
   - Assert: A success message appears and within ~1s we are redirected to
     `/minhas-reservas`.
   - Assert: "Minhas reservas" lists one booking with:
     - service: "Manicure simples"
     - provider: "Ana Nail Studio"
     - the exact date+time I selected
     - status badge "confirmed"

8. **Reload `/minhas-reservas`** (to prove persistence across reload).
   - Assert: The same booking is still listed — if the backend were not
     persisting to the volume, after the app reload the booking would be gone.

## Adversarial checks baked into the flow

- Step 2 relies on **exact count = 2**, which would fail if the category filter
  were accidentally a no-op (would be 5) or if seed were wrong.
- Step 3 asserts **specific seed values** (address, services). A mocked/fake
  page would have placeholder text.
- Step 6 relies on **server-driven slot times** tied to Ana's hours. If the
  client hardcoded slots (e.g. always 10:00–18:00), the times would not match.
- Step 7 requires the booking to round-trip through the API and appear in a
  separate endpoint (`/api/bookings/me`) — two independent code paths must work.
- Step 8 would fail silently if the DB were ephemeral (no volume mount).

## Out of scope for this plan
- Google login (intentionally disabled; button has `disabled` attribute).
- Provider-side registration (covered in a secondary quick check if time
  allows, but the primary proof is the client flow above).
- Accessibility, perf, mobile viewport.
