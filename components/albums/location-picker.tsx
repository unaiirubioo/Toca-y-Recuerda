"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Next.js no incluye los iconos por defecto de Leaflet en el bundle;
// los reconstruimos apuntando a los assets del propio paquete.
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationPicker({
  lat,
  lng,
  onChange,
}: {
  // El esquema de validación (Zod .optional().nullable()) puede
  // producir "undefined" además de "null" — se acepta aquí para no
  // tener que forzar el tipo en cada sitio donde se usa el componente.
  lat: number | null | undefined;
  lng: number | null | undefined;
  onChange: (lat: number, lng: number) => void;
}) {
  const center: [number, number] = [lat ?? 40.4168, lng ?? -3.7038]; // Madrid por defecto

  return (
    <div className="overflow-hidden rounded-xl border border-ink-100">
      <MapContainer center={center} zoom={lat ? 13 : 5} style={{ height: 260, width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {lat != null && lng != null && <Marker position={[lat, lng]} icon={markerIcon} />}
        <ClickHandler onPick={onChange} />
      </MapContainer>
      <p className="bg-cream-100 px-3 py-2 text-xs text-ink-500">
        Toca el mapa para marcar el lugar exacto.
      </p>
    </div>
  );
}
