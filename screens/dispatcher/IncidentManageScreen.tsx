import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TileMap, { MapMarker } from '../../components/TileMap';
import { Card, CategoryBadge, EmptyState, Pill, PrimaryButton, ScreenHeader, StageStepper, StatusBadge } from '../../components/UI';
import { fmtDateTime, fmtEta, fmtKm, haversineKm, timeAgo } from '../../lib/geo';
import { assignResponder, getAudit, getIncident, getResponders, progressIncident } from '../../lib/store';
import { C, CATEGORY_META, OP_STATUS_META } from '../../lib/theme';
import type { Responder, RootStackParamList } from '../../lib/types';
import { useLive } from '../../lib/useLive';

type Props = NativeStackScreenProps<RootStackParamList, 'IncidentManage'>;

export default function IncidentManageScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const [showReassign, setShowReassign] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  const { data } = useLive(async () => {
    const [incident, responders, audit] = await Promise.all([getIncident(id), getResponders(), getAudit()]);
    return { incident, responders, audit: audit.filter((a) => a.incidentId === id) };
  }, [id]);

  const incident = data?.incident ?? null;
  const responders = data?.responders ?? [];

  if (!incident) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader title="Incident" onBack={() => navigation.goBack()} icon="folder-open" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const assigned = responders.find((r) => r.id === incident.assignedResponderId) ?? null;
  const catMeta = CATEGORY_META[incident.category];

  const markers: MapMarker[] = [];
  if (incident.location) {
    markers.push({
      id: 'incident',
      lat: incident.location.lat,
      lon: incident.location.lon,
      color: catMeta.color,
      icon: catMeta.icon,
      label: incident.id,
      ring: incident.status !== 'Resolved',
    });
  }
  if (assigned?.location) {
    markers.push({
      id: 'unit',
      lat: assigned.location.lat,
      lon: assigned.location.lon,
      color: C.blue,
      icon: 'navigate',
      label: assigned.fullName.split(' ')[0],
    });
  }
  const dist = assigned?.location && incident.location ? haversineKm(assigned.location, incident.location) : null;

  const doAssign = async (r: Responder) => {
    setAssigning(r.id);
    await assignResponder(incident.id, r.id);
    setAssigning(null);
    setShowReassign(false);
  };

  const candidates = responders
    .filter((r) => r.id !== incident.assignedResponderId)
    .filter((r) => r.operationalStatus !== 'Busy')
    .sort((a, b) => {
      const score = (r: Responder) =>
        (r.department === incident.category ? 0 : 2) + (r.approved ? 0 : 1) + (r.operationalStatus === 'Offline' ? 4 : 0);
      return score(a) - score(b);
    });

  const needsAssignment = incident.status !== 'Resolved' && (!assigned || showReassign);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader
        title={incident.id}
        subtitle={`Reported ${timeAgo(incident.createdAt)} · ${incident.name}`}
        onBack={() => navigation.goBack()}
        icon="folder-open"
        right={<StatusBadge status={incident.status} />}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card style={{ paddingVertical: 18 }}>
          <StageStepper incident={incident} />
        </Card>

        <TileMap center={incident.location} markers={markers} height={240} initialZoom={14} placeholder="This report has no GPS position." />

        <Card>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <CategoryBadge category={incident.category} />
            <Text style={styles.metaText}>{fmtDateTime(incident.createdAt)}</Text>
          </View>
          <Text style={styles.desc}>{incident.description}</Text>
          {incident.address && (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color={C.sub} />
              <Text style={styles.metaText}>{incident.address}</Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={13} color={C.sub} />
            <Text style={styles.metaText}>{incident.name}</Text>
            <Ionicons name="call-outline" size={13} color={C.sub} style={{ marginLeft: 10 }} />
            <Text style={styles.metaText}>{incident.phone}</Text>
          </View>
          {incident.photo && <Image source={{ uri: incident.photo }} style={styles.photo} contentFit="cover" />}
        </Card>

        {assigned && !showReassign && (
          <Card>
            <Text style={styles.sectionLabel}>ASSIGNED UNIT</Text>
            <View style={[styles.respRow, { marginTop: 10 }]}>
              <View style={[styles.avatar, { backgroundColor: CATEGORY_META[assigned.department].soft }]}>
                <Ionicons name={CATEGORY_META[assigned.department].icon} size={19} color={CATEGORY_META[assigned.department].color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.respName}>{assigned.fullName}</Text>
                <Text style={styles.respMeta}>
                  {assigned.department} · {assigned.badgeId}
                  {dist != null ? ` · ${fmtKm(dist)} away · ETA ${fmtEta(dist)}` : ' · awaiting unit GPS'}
                </Text>
              </View>
              <Pill label={assigned.operationalStatus} color={OP_STATUS_META[assigned.operationalStatus].color} />
            </View>
            {incident.status !== 'Resolved' && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton title="Reassign" icon="swap-horizontal" outline color={C.amber} onPress={() => setShowReassign(true)} />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    title="Force Resolve"
                    icon="checkmark-done"
                    outline
                    color={C.green}
                    onPress={() => progressIncident(incident.id, 'Resolved', 'Dispatcher')}
                  />
                </View>
              </View>
            )}
          </Card>
        )}

        {needsAssignment && (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.sectionLabel}>{assigned ? 'REASSIGN UNIT' : 'DISPATCH A RESPONDER'}</Text>
              {showReassign && (
                <Pressable onPress={() => setShowReassign(false)} style={{ marginLeft: 'auto' }} hitSlop={8}>
                  <Text style={{ color: C.sub, fontSize: 12, fontWeight: '700' }}>Cancel</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.assignHint}>
              Unverified sign-ups are approved automatically when assigned. Matching department units are listed first.
            </Text>
            {candidates.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No responders available"
                message="All units are busy or no responders have registered yet. New sign-ups appear here instantly."
              />
            ) : (
              candidates.map((r) => {
                const m = CATEGORY_META[r.department];
                const rDist = r.location && incident.location ? haversineKm(r.location, incident.location) : null;
                const offline = r.operationalStatus === 'Offline';
                return (
                  <View key={r.id} style={[styles.candidate, offline && { opacity: 0.55 }]}>
                    <View style={[styles.avatarSm, { backgroundColor: m.soft }]}>
                      <Ionicons name={m.icon} size={16} color={m.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.candName}>{r.fullName}</Text>
                        {!r.approved && <Pill label="Pending" color={C.amber} />}
                        {r.department === incident.category && <Pill label="Dept match" color={m.color} />}
                      </View>
                      <Text style={styles.candMeta}>
                        {r.department} · {r.badgeId} · {r.yearsExperience} yrs
                        {rDist != null ? ` · ${fmtKm(rDist)} · ETA ${fmtEta(rDist)}` : ''}
                        {offline ? ' · offline' : ''}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => doAssign(r)}
                      disabled={offline || assigning != null}
                      style={[styles.assignBtn, offline && { backgroundColor: C.card2 }]}
                    >
                      {assigning === r.id ? (
                        <ActivityIndicator size="small" color="#0A0F1C" />
                      ) : (
                        <Text style={[styles.assignBtnText, offline && { color: C.faint }]}>
                          {r.approved ? 'Assign' : 'Verify + Assign'}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                );
              })
            )}
          </Card>
        )}

        <Card>
          <Text style={styles.sectionLabel}>INCIDENT AUDIT TRAIL</Text>
          {(data?.audit ?? []).length === 0 ? (
            <Text style={[styles.assignHint, { marginBottom: 0 }]}>No recorded events for this incident yet.</Text>
          ) : (
            (data?.audit ?? []).map((a) => (
              <View key={a.id} style={styles.auditRow}>
                <View style={styles.auditDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.auditAction}>{a.action}</Text>
                  <Text style={styles.auditMeta}>{a.actor} · {fmtDateTime(a.timestamp)}</Text>
                </View>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 18, paddingTop: 4, gap: 14, paddingBottom: 40, maxWidth: 620, width: '100%', alignSelf: 'center' },
  desc: { color: C.text, fontSize: 14, lineHeight: 20.5, marginTop: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  metaText: { color: C.sub, fontSize: 12.5, flexShrink: 1 },
  photo: { width: '100%', height: 170, borderRadius: 12, marginTop: 12 },
  sectionLabel: { color: C.faint, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.6 },
  respRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  avatarSm: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  respName: { color: C.text, fontSize: 15, fontWeight: '800' },
  respMeta: { color: C.sub, fontSize: 11.5, marginTop: 2, lineHeight: 16 },
  assignHint: { color: C.faint, fontSize: 11.5, lineHeight: 16, marginTop: 8, marginBottom: 12 },
  candidate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: C.borderSoft,
  },
  candName: { color: C.text, fontSize: 13.5, fontWeight: '700' },
  candMeta: { color: C.faint, fontSize: 11, marginTop: 2, lineHeight: 15 },
  assignBtn: {
    backgroundColor: C.blue,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minWidth: 76,
    alignItems: 'center',
  },
  assignBtnText: { color: '#0A0F1C', fontSize: 11.5, fontWeight: '800' },
  auditRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  auditDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.blue, marginTop: 5 },
  auditAction: { color: C.text, fontSize: 12.5, lineHeight: 17 },
  auditMeta: { color: C.faint, fontSize: 10.5, marginTop: 2 },
});
