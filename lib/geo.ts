import type { GeoPoint } from './types';

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Assumed average urban emergency-vehicle speed: 40 km/h
export function etaMinutes(km: number): number {
  return Math.max(1, Math.round((km / 40) * 60));
}

export function fmtKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export function fmtEta(km: number): string {
  const m = etaMinutes(km);
  if (m < 60) return `~${m} min`;
  return `~${Math.floor(m / 60)}h ${m % 60}m`;
}

export function fmtDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function fmtDurationMin(ms: number): string {
  const m = ms / 60000;
  if (m < 1) return '<1 min';
  if (m < 60) return `${Math.round(m)} min`;
  return `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;
}

export function timeAgo(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60000) return 'just now';
  const m = Math.floor(d / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fmtDateTime(ts: number): string {
  const d = new Date(ts);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} \u00b7 ${fmtTime(ts)}`;
}

// ---- Slippy map tile math (Web Mercator) ----
export function lonToX(lon: number, z: number): number {
  return ((lon + 180) / 360) * Math.pow(2, z);
}
export function latToY(lat: number, z: number): number {
  const clamped = Math.max(-85.05, Math.min(85.05, lat));
  const r = (clamped * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z);
}
export function xToLon(x: number, z: number): number {
  return (x / Math.pow(2, z)) * 360 - 180;
}
export function yToLat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=17`,
      { headers: { Accept: 'application/json' } }
    );
    const j = await res.json();
    if (j && j.display_name) {
      return String(j.display_name).split(',').slice(0, 3).join(', ');
    }
    return null;
  } catch {
    return null;
  }
}
