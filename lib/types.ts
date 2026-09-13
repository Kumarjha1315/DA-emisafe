export type EmergencyCategory = 'Police' | 'Fire' | 'Ambulance' | 'Disaster';
export type IncidentStatus = 'Received' | 'En Route' | 'On Scene' | 'Resolved';
export type ResponderOpStatus = 'Available' | 'Busy' | 'Offline';

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface Incident {
  id: string;
  category: EmergencyCategory;
  description: string;
  name: string;
  phone: string;
  photo?: string | null;
  location: GeoPoint | null;
  address?: string | null;
  status: IncidentStatus;
  createdAt: number;
  assignedResponderId?: string | null;
  assignedAt?: number | null;
  enRouteAt?: number | null;
  onSceneAt?: number | null;
  resolvedAt?: number | null;
}

export interface Responder {
  id: string;
  department: EmergencyCategory;
  fullName: string;
  badgeId: string;
  email: string;
  phone: string;
  yearsExperience: number;
  approved: boolean;
  createdAt: number;
  operationalStatus: ResponderOpStatus;
  location?: { lat: number; lon: number; updatedAt: number } | null;
  completedCount: number;
  totalResponseMs: number;
  responseCount: number;
}

export type AuditActor = 'Citizen' | 'Dispatcher' | 'Responder' | 'System';

export interface AuditEntry {
  id: string;
  timestamp: number;
  actor: AuditActor;
  action: string;
  incidentId?: string | null;
}

export type RootStackParamList = {
  Home: undefined;
  Report: undefined;
  Track: undefined;
  TrackDetail: { id: string };
  DispatcherLogin: undefined;
  Dispatcher: undefined;
  IncidentManage: { id: string };
  ResponderAuth: undefined;
  ResponderHome: undefined;
};

export const CATEGORIES: EmergencyCategory[] = ['Police', 'Fire', 'Ambulance', 'Disaster'];
export const STATUSES: IncidentStatus[] = ['Received', 'En Route', 'On Scene', 'Resolved'];
