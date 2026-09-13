import type { EmergencyCategory, IncidentStatus, ResponderOpStatus } from './types';

export const C = {
  bg: '#0A0F1C',
  card: '#111A2C',
  card2: '#18233A',
  border: '#223049',
  borderSoft: '#1B2740',
  text: '#EAF0FA',
  sub: '#8DA0BF',
  faint: '#5C6E8E',
  accent: '#F43F5E',
  accentSoft: 'rgba(244,63,94,0.14)',
  green: '#34D399',
  greenSoft: 'rgba(52,211,153,0.14)',
  amber: '#FBBF24',
  amberSoft: 'rgba(251,191,36,0.14)',
  blue: '#60A5FA',
  blueSoft: 'rgba(96,165,250,0.14)',
  purple: '#A78BFA',
  purpleSoft: 'rgba(167,139,250,0.14)',
  danger: '#F87171',
};

export const CATEGORY_META: Record<
  EmergencyCategory,
  { color: string; soft: string; icon: any; desc: string }
> = {
  Police: { color: '#60A5FA', soft: 'rgba(96,165,250,0.14)', icon: 'shield', desc: 'Crime, threat or security' },
  Fire: { color: '#F87171', soft: 'rgba(248,113,113,0.14)', icon: 'flame', desc: 'Fire or explosion hazard' },
  Ambulance: { color: '#34D399', soft: 'rgba(52,211,153,0.14)', icon: 'medkit', desc: 'Medical emergency' },
  Disaster: { color: '#FBBF24', soft: 'rgba(251,191,36,0.14)', icon: 'warning', desc: 'Flood, quake or collapse' },
};

export const STATUS_META: Record<IncidentStatus, { color: string; soft: string; icon: any }> = {
  Received: { color: '#FBBF24', soft: 'rgba(251,191,36,0.14)', icon: 'radio-button-on' },
  'En Route': { color: '#60A5FA', soft: 'rgba(96,165,250,0.14)', icon: 'navigate' },
  'On Scene': { color: '#A78BFA', soft: 'rgba(167,139,250,0.14)', icon: 'locate' },
  Resolved: { color: '#34D399', soft: 'rgba(52,211,153,0.14)', icon: 'checkmark-circle' },
};

export const OP_STATUS_META: Record<ResponderOpStatus, { color: string; soft: string }> = {
  Available: { color: '#34D399', soft: 'rgba(52,211,153,0.14)' },
  Busy: { color: '#FBBF24', soft: 'rgba(251,191,36,0.14)' },
  Offline: { color: '#5C6E8E', soft: 'rgba(92,110,142,0.14)' },
};
