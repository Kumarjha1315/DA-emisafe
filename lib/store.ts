import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AuditActor,
  AuditEntry,
  Incident,
  IncidentStatus,
  Responder,
  ResponderOpStatus,
} from './types';

export const DISPATCH_LOGIN_ID = 'dispatcher';
export const DISPATCH_PASSWORD = 'central911';

const K = {
  incidents: 'emisafe_incidents_v1',
  responders: 'emisafe_responders_v1',
  audit: 'emisafe_audit_v1',
  myReports: 'emisafe_my_reports_v1',
  dispatchSession: 'emisafe_dispatch_session_v1',
  responderSession: 'emisafe_responder_session_v1',
};

// ---- Live update layer (in-app event bus; storage-backed for persistence) ----
const listeners = new Set<() => void>();
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function notify() {
  listeners.forEach((f) => {
    try {
      f();
    } catch {}
  });
}

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
async function writeRaw(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

const ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function randCode(len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  return s;
}

// ---------------- Audit ----------------
export const getAudit = () => read<AuditEntry[]>(K.audit, []);

async function addAudit(actor: AuditActor, action: string, incidentId?: string | null) {
  const log = await getAudit();
  log.unshift({
    id: `AUD-${Date.now()}-${randCode(4)}`,
    timestamp: Date.now(),
    actor,
    action,
    incidentId: incidentId ?? null,
  });
  await writeRaw(K.audit, log.slice(0, 500));
}

// ---------------- Incidents ----------------
export const getIncidents = () => read<Incident[]>(K.incidents, []);

export async function getIncident(id: string): Promise<Incident | null> {
  const list = await getIncidents();
  const norm = id.trim().toUpperCase();
  return list.find((i) => i.id.toUpperCase() === norm) ?? null;
}

export async function createIncident(
  data: Pick<Incident, 'category' | 'description' | 'name' | 'phone' | 'photo' | 'location' | 'address'>
): Promise<Incident> {
  const incident: Incident = {
    ...data,
    id: `EMI-${randCode(5)}`,
    status: 'Received',
    createdAt: Date.now(),
    assignedResponderId: null,
    assignedAt: null,
    enRouteAt: null,
    onSceneAt: null,
    resolvedAt: null,
  };
  const list = await getIncidents();
  list.unshift(incident);
  await writeRaw(K.incidents, list);
  await addAudit('Citizen', `${incident.category} emergency reported by ${incident.name}`, incident.id);
  await addMyReport(incident.id);
  notify();
  return incident;
}

export async function progressIncident(
  incidentId: string,
  next: IncidentStatus,
  actor: AuditActor
): Promise<void> {
  const incidents = await getIncidents();
  const inc = incidents.find((i) => i.id === incidentId);
  if (!inc) return;
  inc.status = next;
  if (next === 'En Route') inc.enRouteAt = Date.now();
  if (next === 'On Scene') inc.onSceneAt = Date.now();
  if (next === 'Resolved') inc.resolvedAt = Date.now();
  await writeRaw(K.incidents, incidents);

  if (next === 'Resolved' && inc.assignedResponderId) {
    const responders = await getResponders();
    const rsp = responders.find((r) => r.id === inc.assignedResponderId);
    if (rsp) {
      rsp.operationalStatus = 'Available';
      rsp.completedCount += 1;
      if (inc.onSceneAt) {
        rsp.totalResponseMs += inc.onSceneAt - inc.createdAt;
        rsp.responseCount += 1;
      }
      await writeRaw(K.responders, responders);
    }
  }
  await addAudit(actor, `Status updated to \u201c${next}\u201d`, incidentId);
  notify();
}

// ---------------- Responders ----------------
export const getResponders = () => read<Responder[]>(K.responders, []);

export async function getResponder(id: string): Promise<Responder | null> {
  const list = await getResponders();
  return list.find((r) => r.id === id) ?? null;
}

export async function registerResponder(
  data: Pick<Responder, 'department' | 'fullName' | 'badgeId' | 'email' | 'phone' | 'yearsExperience'>
): Promise<{ ok: true; responder: Responder } | { ok: false; error: string }> {
  const list = await getResponders();
  const badge = data.badgeId.trim().toUpperCase();
  if (list.some((r) => r.badgeId.toUpperCase() === badge)) {
    return { ok: false, error: 'A responder with this Badge ID is already registered.' };
  }
  const responder: Responder = {
    ...data,
    badgeId: badge,
    id: `RSP-${randCode(5)}`,
    approved: false,
    createdAt: Date.now(),
    operationalStatus: 'Available',
    location: null,
    completedCount: 0,
    totalResponseMs: 0,
    responseCount: 0,
  };
  list.unshift(responder);
  await writeRaw(K.responders, list);
  await addAudit('System', `Responder sign-up: ${responder.fullName} (${responder.department}, badge ${responder.badgeId}) \u2014 pending verification`);
  notify();
  return { ok: true, responder };
}

export async function findResponderLogin(badgeId: string, email: string): Promise<Responder | null> {
  const list = await getResponders();
  const b = badgeId.trim().toUpperCase();
  const e = email.trim().toLowerCase();
  return list.find((r) => r.badgeId.toUpperCase() === b && r.email.trim().toLowerCase() === e) ?? null;
}

export async function approveResponder(id: string): Promise<void> {
  const list = await getResponders();
  const rsp = list.find((r) => r.id === id);
  if (!rsp || rsp.approved) return;
  rsp.approved = true;
  await writeRaw(K.responders, list);
  await addAudit('Dispatcher', `Verified & approved responder ${rsp.fullName} (badge ${rsp.badgeId})`);
  notify();
}

export async function setResponderOpStatus(id: string, status: ResponderOpStatus): Promise<void> {
  const list = await getResponders();
  const rsp = list.find((r) => r.id === id);
  if (!rsp) return;
  rsp.operationalStatus = status;
  await writeRaw(K.responders, list);
  await addAudit('Responder', `${rsp.fullName} set duty status to ${status}`);
  notify();
}

export async function updateResponderLocation(id: string, lat: number, lon: number): Promise<void> {
  const list = await getResponders();
  const rsp = list.find((r) => r.id === id);
  if (!rsp) return;
  rsp.location = { lat, lon, updatedAt: Date.now() };
  await writeRaw(K.responders, list);
  notify();
}

// ---------------- Assignment (verification happens here per PRD) ----------------
export async function assignResponder(incidentId: string, responderId: string): Promise<void> {
  const incidents = await getIncidents();
  const responders = await getResponders();
  const inc = incidents.find((i) => i.id === incidentId);
  const rsp = responders.find((r) => r.id === responderId);
  if (!inc || !rsp) return;

  const reassign = !!inc.assignedResponderId && inc.assignedResponderId !== responderId;
  if (reassign) {
    const prev = responders.find((r) => r.id === inc.assignedResponderId);
    if (prev) prev.operationalStatus = 'Available';
  }
  const wasPending = !rsp.approved;
  rsp.approved = true;
  rsp.operationalStatus = 'Busy';
  inc.assignedResponderId = rsp.id;
  inc.assignedAt = Date.now();

  await writeRaw(K.responders, responders);
  await writeRaw(K.incidents, incidents);
  if (wasPending) {
    await addAudit('Dispatcher', `Verified & approved responder ${rsp.fullName} (badge ${rsp.badgeId}) during assignment`);
  }
  await addAudit('Dispatcher', `${reassign ? 'Reassigned' : 'Assigned'} ${rsp.fullName} (${rsp.department}) to incident`, inc.id);
  notify();
}

// ---------------- Citizen local report history ----------------
export const getMyReports = () => read<string[]>(K.myReports, []);
async function addMyReport(id: string) {
  const list = await getMyReports();
  if (!list.includes(id)) list.unshift(id);
  await writeRaw(K.myReports, list.slice(0, 30));
}

// ---------------- Sessions ----------------
export async function setDispatchSession(active: boolean) {
  if (active) await AsyncStorage.setItem(K.dispatchSession, '1');
  else await AsyncStorage.removeItem(K.dispatchSession);
}
export async function getDispatchSession(): Promise<boolean> {
  return (await AsyncStorage.getItem(K.dispatchSession)) === '1';
}
export async function setResponderSession(id: string | null) {
  if (id) await AsyncStorage.setItem(K.responderSession, id);
  else await AsyncStorage.removeItem(K.responderSession);
}
export async function getResponderSession(): Promise<string | null> {
  return AsyncStorage.getItem(K.responderSession);
}

export async function dispatcherLogin(id: string, pass: string): Promise<boolean> {
  const ok = id.trim().toLowerCase() === DISPATCH_LOGIN_ID && pass === DISPATCH_PASSWORD;
  if (ok) {
    await setDispatchSession(true);
    await addAudit('Dispatcher', 'Dispatcher signed in to command console');
    notify();
  }
  return ok;
}
