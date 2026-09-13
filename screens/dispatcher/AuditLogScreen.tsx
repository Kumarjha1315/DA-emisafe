import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, ScreenHeader } from '../../components/UI';
import { fmtDateTime } from '../../lib/geo';
import { getAudit } from '../../lib/store';
import { C } from '../../lib/theme';
import type { AuditActor } from '../../lib/types';
import { useLive } from '../../lib/useLive';

const ACTOR_META: Record<AuditActor, { icon: any; color: string }> = {
  Citizen: { icon: 'person', color: C.amber },
  Dispatcher: { icon: 'desktop', color: C.blue },
  Responder: { icon: 'walk', color: C.green },
  System: { icon: 'cog', color: C.purple },
};

export default function AuditLogScreen() {
  const { data: log, reload } = useLive(getAudit);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Audit Trail" subtitle="Every action, timestamped" icon="time" />
      <FlatList
        data={log ?? []}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={C.accent} />}
        ListEmptyComponent={
          <EmptyState
            icon="reader-outline"
            title="Audit log is empty"
            message="Incident submissions, status transitions, verifications and dispatcher actions are recorded here."
          />
        }
        renderItem={({ item }) => {
          const m = ACTOR_META[item.actor];
          return (
            <View style={styles.row}>
              <View style={styles.timeline}>
                <View style={[styles.dot, { backgroundColor: `${m.color}26`, borderColor: m.color }]}>
                  <Ionicons name={m.icon} size={12} color={m.color} />
                </View>
                <View style={styles.line} />
              </View>
              <View style={styles.body}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={[styles.actor, { color: m.color }]}>{item.actor.toUpperCase()}</Text>
                  {item.incidentId && (
                    <View style={styles.incBadge}>
                      <Text style={styles.incBadgeText}>{item.incidentId}</Text>
                    </View>
                  )}
                  <Text style={styles.time}>{fmtDateTime(item.timestamp)}</Text>
                </View>
                <Text style={styles.action}>{item.action}</Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  list: { padding: 18, paddingTop: 6, paddingBottom: 30 },
  row: { flexDirection: 'row', gap: 12 },
  timeline: { alignItems: 'center', width: 28 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { width: 1.5, flex: 1, backgroundColor: C.borderSoft, marginVertical: 3 },
  body: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.borderSoft,
    borderRadius: 13,
    padding: 12,
    marginBottom: 10,
    gap: 5,
  },
  actor: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  incBadge: { backgroundColor: C.card2, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1.5 },
  incBadgeText: { color: C.sub, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  time: { color: C.faint, fontSize: 10.5, marginLeft: 'auto' },
  action: { color: C.text, fontSize: 13, lineHeight: 18.5 },
});
