import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TileMap, { MapMarker } from '../../components/TileMap';
import { Card, CategoryBadge, Pill, PrimaryButton, ScreenHeader, StageStepper } from '../../components/UI';
import { fmtEta, fmtKm, haversineKm, timeAgo } from '../../lib/geo';
import {
  getIncidents,
  getResponder,
  getResponderSession,
  progressIncident,
  setResponderOpStatus,
  setResponderSession,
  updateResponderLocation,
} from '../../lib/store';
import { C, CATEGORY_META, OP_STATUS_META, STATUS_META } from '../../lib/theme';
import type { IncidentStatus, RootStackParamList } from '../../lib/types';
import { useLive } from '../../lib/useLive';

type Props = NativeStackScreenProps<RootStackParamList, 'ResponderHome'>;

const NEXT: Partial<Record<IncidentStatus, { next: IncidentStatus; label: string; icon: any }>> = {
  Received: { next: 'En Route', label: 'Start · En Route', icon: 'navigate' },
  'En Route': { next: 'On Scene', label: 'Arrived · On Scene', icon: 'locate' },
  'On Scene': { next: 'Resolved', label: 'Complete · Resolved', icon: 'checkmark-done' },
};

export default function ResponderHomeScreen({ navigation }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gpsState, setGpsState] = useState<'asking' | 'live' | 'denied'>('asking');
  const [updating, setUpdating] = useState(false);
  const sessionRef = useRef<string | null>(null);

  useEffect(() => {
    getResponderSession().then((id) => {
      if (!id) navigation.replace('ResponderAuth');
      else {
        setSessionId(id);
        sessionRef.current = id;
      }
    });
  }, [navigation]);

  // Live GPS publishing loop
  useEffect(() => {
    let iv: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    const push = async () => {
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const id = sessionRef.current;
        if (id && !cancelled) {
          await updateResponderLocation(id, pos.coords.latitude, pos.coords.longitude);
          setGpsState('live');
        }
      } catch {
        if (!cancelled) setGpsState('denied');
      }
    };
    (async () => {
      if (!sessionId) return;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsState('denied');
        return;
      }
      await push();
      iv = setInterval(push, 20000);
    })();
    return () => {
      cancelled = true;
      if (iv) clearInterval(iv);
    };
  }, [sessionId]);

  const { data } = useLive(async () => {
    const id = sessionRef.current;
    if (!id) return null;
    const [responder, incidents] = await Promise.all([getResponder(id), getIncidents()]);
    const mission = incidents.find((i) => i.assignedResponderId === id && i.status !== 'Resolved') ?? null;
    const completed = incidents.filter((i) => i.assignedResponderId === id && i.status === 'Resolved');
    return { responder, mission, completed };
  }, [sessionId]);

  const responder = data?.responder ?? null;
  const mission = data?.mission ?? null;
  const completed = data?.completed ?? [];

  const logout = async () => {
    await setResponderSession(null);
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  if (!responder) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.green} />
        </View>
      </SafeAreaView>
    );
  }

  const dept = CATEGORY_META[responder.department];
  const op = OP_STATUS_META[responder.operationalStatus];
  const dist =
    mission?.location && responder.location ? haversineKm(responder.location, mission.location) : null;

  const markers: MapMarker[] = [];
  if (mission?.location) {
    const m = CATEGORY_META[mission.category];
    markers.push({ id: 'target', lat: mission.location.lat, lon: mission.location.lon, color: m.color, icon: m.icon, label: 'Incident', ring: true });
  }
  if (responder.location) {
    markers.push({ id: 'me', lat: responder.location.lat, lon: responder.location.lon, color: C.blue, icon: 'navigate', label: 'You' });
  }

  const nextAction = mission ? NEXT[mission.status] : undefined;

  const advance = async () => {
    if (!mission || !nextAction || updating) return;
    setUpdating(true);
    await progressIncident(mission.id, nextAction.next, 'Responder');
    setUpdating(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader
        title={responder.fullName}
        subtitle={`${responder.department} unit · Badge ${responder.badgeId}`}
        icon={dept.icon}
        onBack={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
        right={
          <Pressable onPress={logout} style={styles.logout} hitSlop={8}>
            <Ionicons name="log-out-outline" size={18} color={C.danger} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!responder.approved && (
          <Card style={{ backgroundColor: C.amberSoft, borderColor: 'rgba(251,191,36,0.32)' }}>
            <View style={styles.rowCenter}>
              <Ionicons name="hourglass" size={19} color={C.amber} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.amber, fontWeight: '800', fontSize: 13.5 }}>Pending Approval</Text>
                <Text style={{ color: C.sub, fontSize: 12, marginTop: 2, lineHeight: 17 }}>
                  A dispatcher will verify your credentials when assigning you to an incident. Keep GPS sharing on.
                </Text>
              </View>
            </View>
          </Card>
        )}

        <Card>
          <View style={styles.rowCenter}>
            <View style={[styles.gpsDot, { backgroundColor: gpsState === 'live' ? C.green : gpsState === 'denied' ? C.danger : C.amber }]} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 13.5 }}>
                {gpsState === 'live' ? 'Live GPS sharing active' : gpsState === 'denied' ? 'GPS permission denied' : 'Acquiring GPS fix…'}
              </Text>
              <Text style={{ color: C.faint, fontSize: 11.5, marginTop: 2 }}>
                {responder.location
                  ? `${responder.location.lat.toFixed(5)}, ${responder.location.lon.toFixed(5)} · updated ${timeAgo(responder.location.updatedAt)}`
                  : 'Your position is broadcast to dispatch & citizens once available.'}
              </Text>
            </View>
            <Pill label={responder.operationalStatus} color={op.color} />
          </View>
          {!mission && (
            <View style={styles.dutyRow}>
              {(['Available', 'Offline'] as const).map((s) => {
                const active = responder.operationalStatus === s;
                const color = OP_STATUS_META[s].color;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setResponderOpStatus(responder.id, s)}
                    style={[styles.dutyBtn, active && { borderColor: color, backgroundColor: `${color}1A` }]}
                  >
                    <Text style={[styles.dutyText, active && { color, fontWeight: '800' }]}>{s}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Card>

        {mission ? (
          <>
            <View style={styles.missionHeader}>
              <Ionicons name="flash" size={15} color={C.accent} />
              <Text style={styles.missionTitle}>ACTIVE ASSIGNMENT</Text>
              <View style={{ flex: 1 }} />
              <Text style={styles.missionId}>{mission.id}</Text>
            </View>

            <Card style={{ paddingVertical: 18 }}>
              <StageStepper incident={mission} />
            </Card>

            <TileMap center={mission.location ?? responder.location ?? null} markers={markers} height={250} initialZoom={14} />

            <Card>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <CategoryBadge category={mission.category} />
              </View>
              <Text style={styles.desc}>{mission.description}</Text>
              {mission.address && (
                <View style={[styles.rowCenter, { marginTop: 10 }]}>
                  <Ionicons name="location-outline" size={13} color={C.sub} />
                  <Text style={styles.meta}>{mission.address}</Text>
                </View>
              )}
              <View style={[styles.rowCenter, { marginTop: 6 }]}>
                <Ionicons name="person-outline" size={13} color={C.sub} />
                <Text style={styles.meta}>{mission.name} · {mission.phone}</Text>
              </View>

              <View style={styles.navRow}>
                <View style={styles.navStat}>
                  <Ionicons name="resize" size={15} color={C.amber} />
                  <Text style={styles.navValue}>{dist != null ? fmtKm(dist) : '—'}</Text>
                  <Text style={styles.navLabel}>Direct distance</Text>
                </View>
                <View style={styles.navDivider} />
                <View style={styles.navStat}>
                  <Ionicons name="time" size={15} color={C.blue} />
                  <Text style={styles.navValue}>{dist != null ? fmtEta(dist) : '—'}</Text>
                  <Text style={styles.navLabel}>Est. travel time</Text>
                </View>
                <View style={styles.navDivider} />
                <View style={styles.navStat}>
                  <Ionicons name={STATUS_META[mission.status].icon} size={15} color={STATUS_META[mission.status].color} />
                  <Text style={[styles.navValue, { color: STATUS_META[mission.status].color }]}>{mission.status}</Text>
                  <Text style={styles.navLabel}>Current stage</Text>
                </View>
              </View>
            </Card>

            {nextAction && (
              <PrimaryButton
                title={nextAction.label}
                icon={nextAction.icon}
                color={STATUS_META[nextAction.next].color}
                onPress={advance}
                loading={updating}
              />
            )}
          </>
        ) : (
          <Card style={{ alignItems: 'center', paddingVertical: 30 }}>
            <View style={styles.standbyIcon}>
              <Ionicons name="radio" size={26} color={C.green} />
            </View>
            <Text style={{ color: C.text, fontSize: 15.5, fontWeight: '800', marginTop: 12 }}>Standing by</Text>
            <Text style={{ color: C.sub, fontSize: 12.5, textAlign: 'center', marginTop: 5, lineHeight: 18, maxWidth: 300 }}>
              No active assignment. Dispatch will route the next {responder.department.toLowerCase()} incident to you — this screen updates automatically.
            </Text>
          </Card>
        )}

        <Card>
          <Text style={styles.sectionLabel}>SERVICE RECORD</Text>
          <View style={styles.recordRow}>
            <View style={styles.record}>
              <Text style={[styles.recordValue, { color: C.green }]}>{responder.completedCount}</Text>
              <Text style={styles.recordLabel}>Completed</Text>
            </View>
            <View style={styles.record}>
              <Text style={[styles.recordValue, { color: C.blue }]}>{responder.yearsExperience}</Text>
              <Text style={styles.recordLabel}>Years exp.</Text>
            </View>
            <View style={styles.record}>
              <Text style={[styles.recordValue, { color: responder.approved ? C.green : C.amber }]}>
                {responder.approved ? 'Verified' : 'Pending'}
              </Text>
              <Text style={styles.recordLabel}>Credentials</Text>
            </View>
          </View>
          {completed.length > 0 && (
            <View style={{ marginTop: 6 }}>
              {completed.slice(0, 5).map((i) => (
                <View key={i.id} style={styles.histRow}>
                  <Ionicons name="checkmark-circle" size={14} color={C.green} />
                  <Text style={styles.histId}>{i.id}</Text>
                  <Text style={styles.histMeta} numberOfLines={1}>{i.category}</Text>
                  <Text style={styles.histTime}>{i.resolvedAt ? timeAgo(i.resolvedAt) : ''}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 18, paddingTop: 4, gap: 14, paddingBottom: 40, maxWidth: 560, width: '100%', alignSelf: 'center' },
  logout: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gpsDot: { width: 10, height: 10, borderRadius: 5 },
  dutyRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  dutyBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 11,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: C.card2,
  },
  dutyText: { color: C.sub, fontSize: 13, fontWeight: '600' },
  missionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  missionTitle: { color: C.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  missionId: { color: C.sub, fontSize: 12.5, fontWeight: '800', letterSpacing: 0.8 },
  desc: { color: C.text, fontSize: 14, lineHeight: 20.5, marginTop: 10 },
  meta: { color: C.sub, fontSize: 12.5, flexShrink: 1 },
  navRow: { flexDirection: 'row', marginTop: 14, backgroundColor: C.card2, borderRadius: 12, paddingVertical: 12 },
  navStat: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 4 },
  navDivider: { width: 1, backgroundColor: C.border },
  navValue: { color: C.text, fontSize: 13.5, fontWeight: '800' },
  navLabel: { color: C.faint, fontSize: 9.5 },
  standbyIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: C.greenSoft,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: { color: C.faint, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.6, marginBottom: 12 },
  recordRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  record: { flex: 1, backgroundColor: C.card2, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  recordValue: { fontSize: 16, fontWeight: '900' },
  recordLabel: { color: C.faint, fontSize: 10, marginTop: 2 },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: 1, borderTopColor: C.borderSoft },
  histId: { color: C.text, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  histMeta: { color: C.faint, fontSize: 11.5, flex: 1 },
  histTime: { color: C.faint, fontSize: 10.5 },
});
