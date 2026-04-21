import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import type { Provider } from '../types'

const pinkIcon = L.divIcon({
  className: 'ibeauty-pin',
  html: '<div style="background:#e91e63;width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
})

const userIcon = L.divIcon({
  className: 'ibeauty-pin-user',
  html: '<div style="background:#1976d2;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

interface Props {
  providers: Provider[]
  userLocation: [number, number] | null
  onSelect: (id: number) => void
  selectedId: number | null
}

export default function ProviderMap({ providers, userLocation, onSelect, selectedId }: Props) {
  const center: [number, number] = userLocation
    ? userLocation
    : providers.length > 0
      ? [providers[0].latitude, providers[0].longitude]
      : [-23.5505, -46.6333]

  return (
    <MapContainer center={center} zoom={13} className="map-container">
      <Recenter center={center} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {userLocation && (
        <Marker position={userLocation} icon={userIcon}>
          <Popup>Você está aqui</Popup>
        </Marker>
      )}
      {providers.map((p) => (
        <Marker
          key={p.id}
          position={[p.latitude, p.longitude]}
          icon={pinkIcon}
          eventHandlers={{ click: () => onSelect(p.id) }}
        >
          <Popup>
            <strong>{p.business_name}</strong>
            <br />
            {p.address}
            <br />
            <button
              className="btn btn-primary"
              style={{ marginTop: 8, padding: '6px 10px' }}
              onClick={() => onSelect(p.id)}
            >
              Ver e agendar
            </button>
          </Popup>
        </Marker>
      ))}
      {selectedId !== null && null}
    </MapContainer>
  )
}
