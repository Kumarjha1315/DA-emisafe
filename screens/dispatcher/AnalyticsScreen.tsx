import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DoubleBarChart, LineChart, PieChart } from '../../components/Charts';
import TileMap from '../../components/TileMap';
import { Card, EmptyState, KPICard, ScreenHeader } from '../../components/UI';
import { fmtDurationMin, fmtTime } from '../../lib/geo';
import { getIncidents, getResponders } from '../../lib/store';
import { C, CATEGORY_META, STATUS_META } from '../../lib/theme';
import { CATEGORIES, STATUSES } from '../../lib/types';
import { useLive } from '../../lib/useLive';

export default function AnalyticsScreen() {
  const { data } = useLive(async () => {
    const [incidents, responders] = await Promise.all([getIncidents(), getResponders()]);
    return { incidents, responders };
  });

  const incidents = data?.incidents ?? [];
  const responders = data?.responders ?? [];

  // ---- KPIs ----
  const total = incidents.length;
  const resolved = incidents.filter((i) => i.status === 'Resolved').length;
  const active = total - resolved;
  const available = responders.filter((r) => r.approved && r.operationalStatus === 'Available').length;
  const responseSamples = incidents.filter((i) => i.onSceneAt);
  const avgResponse =
    responseSamples.length > 0
      ? responseSamples.reduce((s, i) => s + ((i.onSceneAt as number) - i.createdAt), 0) / responseSamples.length
      : null;

  // ---- Request activity: last 24h in 3h buckets ----
  const now = Date.now();
  const H3 = 3 * 3600 * 1000;
  const activity = Array.from({ length: 8 }).map((_, b) => {
    const start = now - (8 - b) * H3;
    const count = incidents.filter((i) => i.createdAt >= start && i.createdAt < start + H3).length;
    return { label: fmtTime(start), value: count };
  });

  // ---- Distributions ----
  const catDist = CATEGORIES.map((c) => ({
    label: c,
    value: incidents.filter((i) => i.category === c).length,
    color: CATEGORY_META[c].color,
  }));
  const statusDist = STATUSES.map((s) => ({
    label: s,
    value: incidents.filter((i) => i.status === s).length,
    color: STATUS_META[s].color,
  }));

  // ---- Response times per category (minutes) ----
  const dispatchTimes = CATEGORIES.map((c) => {
    const xs = incidents.filter((i) => i.category === c && i.assignedAt);
    if (xs.length === 0) return 0;
    return xs.reduce((s, i) => s + ((i.assignedAt as number) - i.createdAt), 0) / xs.length / 60000;
  });
  const arrivalTimes = CATEGORIES.map((c) => {
    const xs = incidents.filter((i) => i.category === c && i.assignedAt && i.onSceneAt);
    if (xs.length === 0) return 0;
    return xs.reduce((s, i) => s + ((i.onSceneAt as number) - (i.assignedAt as number)), 0) / xs.length / 60000;
  });

  // ---- Hotspots ----
  const located = incidents.filter((i) => i.location);
  const heat = located.map((i) => ({ lat: i.location!.lat, lon: i.location!.lon, weight: 1 }));
  const heatCenter =
    located.length > 0
      ? {
          lat: located.reduce((s, i) => s + i.location!.lat, 0) / located.length,
          lon: located.reduce((s, i) => s + i.location!.lon, 0) / located.length,
        }
      : null;

  // ---- Leaderboard ----
  const leaderboard = responders
    .filter((r) => r.approved)
    .sort((a, b) => b.completedCount - a.completedCount || a.fullName.localeCompare(b.fullName));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Analytics" subtitle="Performance & demand intelligence" icon="stats-chart" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.kpiGrid}>
          <KPICard icon="albums" label="Total Requests" value={String(total)} color={C.accent} />
          <KPICard
            icon="timer"
            label="Avg Response Time"
            value={avgResponse != null ? fmtDurationMin(avgResponse) : '—'}
            color={C.blue}
            hint="report → on scene"
          />
          <KPICard icon="checkmark-done" label="Resolved" value={String(resolved)} color={C.green} />
          <KPICard icon="flash" label="Active Incidents" value={String(active)} color={C.amber} />
          <KPICard icon="people" label="Responders Available" value={String(available)} color={C.purple} />
        </View>

        <Card>
          <Text style={styles.cardTitle}>Request Activity</Text>
          <Text style={styles.cardSub}>Emergency request volume · last 24 hours</Text>
          <LineChart data={activity} color={C.accent} />
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Incident Distribution</Text>
          <Text style={styles.cardSub}>Share of requests by emergency category</Text>
          <PieChart data={catDist} />
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Status Breakdown</Text>
          <Text style={styles.cardSub}>Lifecycle stage across all requests</Text>
          <PieChart data={statusDist} donut centerLabel="reports" />
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Response Time Metrics</Text>
          <Text style={styles.cardSub}>Avg dispatch time vs field arrival time per category</Text>
          <DoubleBarChart
            categories={[...CATEGORIES]}
            seriesA={{ label: 'Dispatch', color: C.blue, values: dispatchTimes.map((v) => Math.round(v * 10) / 10) }}
            seriesB={{ label: 'Field arrival', color: C.green, values: arrivalTimes.map((v) => Math.round(v * 10) / 10) }}
          />
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Hotspot Analysis</Text>
          <Text style={styles.cardSub}>Geospatial demand intensity from reported incidents</Text>
          {heatCenter ? (
            <TileMap center={heatCenter} heat={heat} height={230} initialZoom={12} />
          ) : (
            <View style={styles.noHeat}>
              <Text style={styles.noHeatText}>Hotspots appear once incidents with GPS positions are reported.</Text>
            </View>
          )}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Responder Performance</Text>
          <Text style={styles.cardSub}>Verified units ranked by completed assignments</Text>
          {leaderboard.length === 0 ? (
            <EmptyState icon="trophy-outline" title="No verified responders yet" message="Approve responder sign-ups to start tracking field performance." />
          ) : (
            <View style={{ marginTop: 6 }}>
              <View style={styles.lbHeader}>
                <Text style={[styles.lbHeaderText, { width: 30 }]}>#</Text>
                <Text style={[styles.lbHeaderText, { flex: 1 }]}>RESPONDER</Text>
                <Text style={[styles.lbHeaderText, { width: 64, textAlign: 'center' }]}>DONE</Text>
                <Text style={[styles.lbHeaderText, { width: 78, textAlign: 'right' }]}>AVG RESP</Text>
              </View>
              {leaderboard.map((r, idx) => {
                const medal = ['#FBBF24', '#B0BEC5', '#CD7F32'][idx];
                const avg = r.responseCount > 0 ? fmtDurationMin(r.totalResponseMs / r.responseCount) : '—';
                return (
                  <View key={r.id} style={styles.lbRow}>
                    <View style={{ width: 30 }}>
                      <View style={[styles.rank, medal ? { backgroundColor: `${medal}26` } : null]}>
                        <Text style={[styles.rankText, medal ? { color: medal } : null]}>{idx + 1}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lbName} numberOfLines={1}>{r.fullName}</Text>
                      <Text style={styles.lbMeta}>{r.department} · {r.badgeId}</Text>
                    </View>
                    <Text style={styles.lbDone}>{r.completedCount}</Text>
                    <Text style={styles.lbAvg}>{avg}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 18, paddingTop: 4, gap: 14, paddingBottom: 34 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cardTitle: { color: C.text, fontSize: 15, fontWeight: '800' },
  cardSub: { color: C.faint, fontSize: 11.5, marginTop: 2, marginBottom: 14 },
  noHeat: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderSoft,
    borderStyle: 'dashed',
    paddingHorizontal: 24,
  },
  noHeatText: { color: C.faint, fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
  lbHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  lbHeaderText: { color: C.faint, fontSize: 9.5, fontWeight: '800', letterSpacing: 1 },
  lbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  rank: { width: 22, height: 22, borderRadius: 7, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' },
  rankText: { color: C.sub, fontSize: 11, fontWeight: '800' },
  lbName: { color: C.text, fontSize: 13.5, fontWeight: '700' },
  lbMeta: { color: C.faint, fontSize: 10.5, marginTop: 1 },
  lbDone: { width: 64, textAlign: 'center', color: C.green, fontSize: 14, fontWeight: '800' },
  lbAvg: { width: 78, textAlign: 'right', color: C.blue, fontSize: 12, fontWeight: '700' },
});
