import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TileMap, { MapMarker } from '../../components/TileMap';
import { Card, CategoryBadge, EmptyState, ScreenHeader, StageStepper, StatusBadge } from '../../components/UI';
import { fmtDateTime, fmtEta, fmtKm, haversineKm, timeAgo } from '../../lib/geo';
import { getIncident, getResponder } from '../../lib/store';
import { C, CATEGORY_META, OP_STATUS_META } from '../../lib/theme';
import type { Responder, RootStackParamList } from '../../lib/types';
import { useLive } from '../../lib/useLive';

type Props = NativeStackScreenProps<RootStackParamList, 'TrackDetail'>;

export default function TrackDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;

  const { data, loading } = useLive(async () => {
    const incident = await getIncident(id);
    let responder: Responder | null = null;
    if (incident?.assignedResponderId) responder = await getResponder(incident.assignedResponderId);
    return { incident, responder };
  }, [id]);

  const incident = data?.incident ?? null;
  const responder = data?.responder ?? null;

  if (loading && !incident) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader title="Live Tracking" onBack={() => navigation.goBack()} icon="navigate" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!incident) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader title="Live Tracking" onBack={() => navigation.goBack()} icon="navigate" />
        <EmptyState icon="help-circle-outline" title="Report not found" message="This Report ID does not exist in the system." />
      </SafeAreaView>
    );
  }

  const catMeta = CATEGORY_META[incident.category];
  const markers: MapMarker[] = [];
  if (incident.location) {
    markers.push({
      id: 'incident',
      lat: incident.location.lat,
      lon: incident.location.lon,
      color: catMeta.color,
      icon: catMeta.icon,
      label: 'Incident',
      ring: incident.status !== 'Resolved',
    });
  }
  if (responder?.location && incident.status !== 'Resolved') {
    markers.push({
      id: 'responder',
      lat: responder.location.lat,
      lon: responder.location.lon,
      color: C.blue,
      icon: 'navigate',
      label: responder.fullName.split(' ')[0],
      ring: incident.status === 'En Route',
    });
  }
  const distKm =
    responder?.location && incident.location
      ? haversineKm(responder.location, incident.location)
      : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader
        title={incident.id}
        subtitle={`Submitted ${timeAgo(incident.createdAt)} · ${fmtDateTime(incident.createdAt)}`}
        onBack={() => navigation.goBack()}
        icon="navigate"
        right={<StatusBadge status={incident.status} />}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card style={{ paddingVertical: 18 }}>
          <StageStepper incident={incident} />
        </Card>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live view · auto-refreshes</Text>
        </View>
        <TileMap center={incident.location} markers={markers} height={280} initialZoom={14} />

        {incident.status === 'Resolved' ? (
          <Card style={{ backgroundColor: C.greenSoft, borderColor: 'rgba(52,211,153,0.35)' }}>
            <View style={styles.rowCenter}>
              <Ionicons name="checkmark-circle" size={22} color={C.green} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.green, fontWeight: '800', fontSize: 14.5 }}>Incident resolved</Text>
                <Text style={{ color: C.sub, fontSize: 12, marginTop: 2 }}>
                  {incident.resolvedAt ? `Closed at ${fmtDateTime(incident.resolvedAt)}` : 'Closed by response team'}
                </Text>
              </View>
            </View>
          </Card>
        ) : responder ? (
          <Card>
            <Text style={styles.cardLabel}>ASSIGNED RESPONDER</Text>
            <View style={[styles.rowCenter, { marginTop: 10 }]}>
              <View style={[styles.avatar, { backgroundColor: CATEGORY_META[responder.department].soft }]}>
                <Ionicons name={CATEGORY_META[responder.department].icon} size={20} color={CATEGORY_META[responder.department].color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.respName}>{responder.fullName}</Text>
                <Text style={styles.respMeta}>{responder.department} unit · Badge {responder.badgeId}</Text>
              </View>
              <View style={[styles.opDot, { backgroundColor: OP_STATUS_META[responder.operationalStatus].color }]} />
            </View>
            <View style={styles.statRow}>
              <View style={styles.stat}>
                <Ionicons name="resize" size={15} color={C.amber} />
                <Text style={styles.statValue}>{distKm != null ? fmtKm(distKm) : '—'}</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Ionicons name="time" size={15} color={C.blue} />
                <Text style={styles.statValue}>{distKm != null ? fmtEta(distKm) : '—'}</Text>
                <Text style={styles.statLabel}>Est. arrival</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Ionicons name="call" size={15} color={C.green} />
                <Text style={styles.statValue} numberOfLines={1}>{responder.phone}</Text>
                <Text style={styles.statLabel}>Contact</Text>
              </View>
            </View>
            {!responder.location && (
              <Text style={styles.hint}>Responder GPS will appear once their unit shares a live position.</Text>
            )}
          </Card>
        ) : (
          <Card style={{ backgroundColor: C.amberSoft, borderColor: 'rgba(251,191,36,0.3)' }}>
            <View style={styles.rowCenter}>
              <Ionicons name="hourglass" size={20} color={C.amber} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.amber, fontWeight: '800', fontSize: 14 }}>Awaiting dispatch</Text>
                <Text style={{ color: C.sub, fontSize: 12, marginTop: 2, lineHeight: 17 }}>
                  Your report is in the dispatcher queue. A verified responder will be assigned shortly.
                </Text>
              </View>
            </View>
          </Card>
        )}

        <Card>
          <Text style={styles.cardLabel}>REPORT DETAILS</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <CategoryBadge category={incident.category} />
          </View>
          <Text style={styles.desc}>{incident.description}</Text>
          {incident.address && (
            <View style={[styles.rowCenter, { marginTop: 10 }]}>
              <Ionicons name="location-outline" size={14} color={C.sub} />
              <Text style={{ color: C.sub, fontSize: 12.5, flex: 1 }}>{incident.address}</Text>
            </View>
          )}
          <View style={[styles.rowCenter, { marginTop: 6 }]}>
            <Ionicons name="person-outline" size={14} color={C.sub} />
            <Text style={{ color: C.sub, fontSize: 12.5 }}>{incident.name} · {incident.phone}</Text>
          </View>
          {incident.photo && <Image source={{ uri: incident.photo }} style={styles.photo} contentFit="cover" />}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 18, paddingTop: 4, gap: 14, paddingBottom: 40, maxWidth: 560, width: '100%', alignSelf: 'center' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  liveText: { color: C.faint, fontSize: 11.5 },
  cardLabel: { color: C.faint, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.6 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  respName: { color: C.text, fontSize: 15.5, fontWeight: '800' },
  respMeta: { color: C.sub, fontSize: 12, marginTop: 2 },
  opDot: { width: 10, height: 10, borderRadius: 5 },
  statRow: {
    flexDirection: 'row',
    marginTop: 14,
    backgroundColor: C.card2,
    borderRadius: 12,
    paddingVertical: 12,
  },
  stat: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 4 },
  statDivider: { width: 1, backgroundColor: C.border },
  statValue: { color: C.text, fontSize: 13.5, fontWeight: '800' },
  statLabel: { color: C.faint, fontSize: 10 },
  hint: { color: C.faint, fontSize: 11.5, marginTop: 10, lineHeight: 16 },
  desc: { color: C.text, fontSize: 14, lineHeight: 21, marginTop: 10 },
  photo: { width: '100%', height: 180, borderRadius: 12, marginTop: 12 },
});
