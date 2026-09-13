import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryBadge, Chip, EmptyState, ScreenHeader, StatusBadge } from '../../components/UI';
import { timeAgo } from '../../lib/geo';
import { getIncidents, getResponders, setDispatchSession } from '../../lib/store';
import { C, STATUS_META } from '../../lib/theme';
import type { Incident, IncidentStatus } from '../../lib/types';
import { useLive } from '../../lib/useLive';

type Filter = 'Active' | IncidentStatus | 'All';
const FILTERS: Filter[] = ['Active', 'Received', 'En Route', 'On Scene', 'Resolved', 'All'];

export default function OperationsScreen({ navigation }: any) {
  const [filter, setFilter] = useState<Filter>('Active');

  const { data, reload } = useLive(async () => {
    const [incidents, responders] = await Promise.all([getIncidents(), getResponders()]);
    return { incidents, responders };
  });

  const incidents = data?.incidents ?? [];
  const responders = data?.responders ?? [];

  const filtered = useMemo(() => {
    if (filter === 'All') return incidents;
    if (filter === 'Active') return incidents.filter((i) => i.status !== 'Resolved');
    return incidents.filter((i) => i.status === filter);
  }, [incidents, filter]);

  const active = incidents.filter((i) => i.status !== 'Resolved').length;
  const unassigned = incidents.filter((i) => !i.assignedResponderId && i.status !== 'Resolved').length;
  const pendingResp = responders.filter((r) => !r.approved).length;

  const responderName = (inc: Incident) =>
    responders.find((r) => r.id === inc.assignedResponderId)?.fullName ?? null;

  const logout = async () => {
    await setDispatchSession(false);
    navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Operations"
        subtitle="Live incident queue"
        icon="desktop"
        right={
          <Pressable onPress={logout} style={styles.logout} hitSlop={8}>
            <Ionicons name="log-out-outline" size={18} color={C.danger} />
          </Pressable>
        }
      />

      <View style={styles.tickerRow}>
        <View style={styles.ticker}>
          <Text style={[styles.tickerValue, { color: C.accent }]}>{active}</Text>
          <Text style={styles.tickerLabel}>Active</Text>
        </View>
        <View style={styles.ticker}>
          <Text style={[styles.tickerValue, { color: C.amber }]}>{unassigned}</Text>
          <Text style={styles.tickerLabel}>Unassigned</Text>
        </View>
        <View style={styles.ticker}>
          <Text style={[styles.tickerValue, { color: C.blue }]}>{pendingResp}</Text>
          <Text style={styles.tickerLabel}>Pending sign-ups</Text>
        </View>
        <View style={styles.ticker}>
          <Text style={[styles.tickerValue, { color: C.green }]}>{incidents.filter((i) => i.status === 'Resolved').length}</Text>
          <Text style={styles.tickerLabel}>Resolved</Text>
        </View>
      </View>

      <View style={{ maxHeight: 46 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => (
            <Chip
              key={f}
              label={f}
              active={filter === f}
              onPress={() => setFilter(f)}
              color={f === 'Active' || f === 'All' ? C.accent : STATUS_META[f as IncidentStatus].color}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={C.accent} />}
        ListEmptyComponent={
          <EmptyState
            icon="file-tray-outline"
            title={incidents.length === 0 ? 'No incident reports yet' : `No “${filter}” incidents`}
            message={
              incidents.length === 0
                ? 'Citizen reports submitted through the public portal will stream in here in real time.'
                : 'Try a different status filter.'
            }
          />
        }
        renderItem={({ item }) => {
          const rName = responderName(item);
          return (
            <Pressable style={styles.item} onPress={() => navigation.navigate('IncidentManage', { id: item.id })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.itemId}>{item.id}</Text>
                <Text style={styles.itemTime}>{timeAgo(item.createdAt)}</Text>
                <View style={{ flex: 1 }} />
                <StatusBadge status={item.status} small />
              </View>
              <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
              <View style={styles.itemFooter}>
                <CategoryBadge category={item.category} small />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
                  <Ionicons name={rName ? 'person' : 'alert-circle'} size={12} color={rName ? C.blue : C.amber} />
                  <Text style={[styles.assignee, { color: rName ? C.sub : C.amber }]} numberOfLines={1}>
                    {rName ?? 'Needs assignment'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color={C.faint} />
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
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
  tickerRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, marginBottom: 12 },
  ticker: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.borderSoft,
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
  },
  tickerValue: { fontSize: 17, fontWeight: '900' },
  tickerLabel: { color: C.faint, fontSize: 9.5, marginTop: 1 },
  chips: { gap: 8, paddingHorizontal: 18, paddingBottom: 10 },
  list: { padding: 18, paddingTop: 6, paddingBottom: 30 },
  item: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.borderSoft,
    borderRadius: 15,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  itemId: { color: C.text, fontSize: 14.5, fontWeight: '800', letterSpacing: 0.8 },
  itemTime: { color: C.faint, fontSize: 11 },
  itemDesc: { color: C.sub, fontSize: 12.5, lineHeight: 18 },
  itemFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  assignee: { fontSize: 11.5, fontWeight: '600' },
});
