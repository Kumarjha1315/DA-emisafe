import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, Pill, PrimaryButton, ScreenHeader } from '../../components/UI';
import { timeAgo } from '../../lib/geo';
import { approveResponder, getResponders } from '../../lib/store';
import { C, CATEGORY_META, OP_STATUS_META } from '../../lib/theme';
import type { Responder } from '../../lib/types';
import { useLive } from '../../lib/useLive';

export default function RespondersScreen() {
  const { data: responders, reload } = useLive(getResponders);
  const list = responders ?? [];
  const pending = list.filter((r) => !r.approved);
  const roster = list.filter((r) => r.approved);

  const sections = [
    { title: 'PENDING VERIFICATION', key: 'pending', data: pending },
    { title: 'ACTIVE ROSTER', key: 'roster', data: roster },
  ].filter((s) => s.data.length > 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Responders" subtitle="Directory & verification" icon="people" />
      <SectionList
        sections={sections}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={C.accent} />}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No responder accounts yet"
            message="Field responders who self-register through the responder portal will appear here for verification."
          />
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={[styles.countBadge, section.key === 'pending' && { backgroundColor: C.amberSoft }]}>
              <Text style={[styles.countText, section.key === 'pending' && { color: C.amber }]}>{section.data.length}</Text>
            </View>
          </View>
        )}
        renderItem={({ item }) => <ResponderCard responder={item} />}
      />
    </SafeAreaView>
  );
}

function ResponderCard({ responder: r }: { responder: Responder }) {
  const dept = CATEGORY_META[r.department];
  const op = OP_STATUS_META[r.operationalStatus];
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={[styles.avatar, { backgroundColor: dept.soft }]}>
          <Ionicons name={dept.icon} size={20} color={dept.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{r.fullName}</Text>
          <Text style={styles.meta}>{r.department} · Badge {r.badgeId} · {r.yearsExperience} yr{r.yearsExperience === 1 ? '' : 's'} exp</Text>
        </View>
        {r.approved ? (
          <Pill label={r.operationalStatus} color={op.color} />
        ) : (
          <Pill label="Pending" color={C.amber} />
        )}
      </View>
      <View style={styles.contactRow}>
        <View style={styles.contact}>
          <Ionicons name="mail-outline" size={12} color={C.faint} />
          <Text style={styles.contactText} numberOfLines={1}>{r.email}</Text>
        </View>
        <View style={styles.contact}>
          <Ionicons name="call-outline" size={12} color={C.faint} />
          <Text style={styles.contactText}>{r.phone}</Text>
        </View>
      </View>
      {r.approved ? (
        <View style={styles.statsRow}>
          <Text style={styles.stat}><Text style={styles.statValue}>{r.completedCount}</Text> completed</Text>
          <Text style={styles.stat}>joined {timeAgo(r.createdAt)}</Text>
          {r.location ? (
            <Text style={[styles.stat, { color: C.green }]}>● GPS live {timeAgo(r.location.updatedAt)}</Text>
          ) : (
            <Text style={styles.stat}>no GPS shared</Text>
          )}
        </View>
      ) : (
        <View style={{ gap: 8, marginTop: 4 }}>
          <Text style={styles.pendingHint}>
            Credentials are auto-approved when you assign this responder to an incident — or verify manually below.
          </Text>
          <PrimaryButton title="Verify & Approve" icon="checkmark-circle" color={C.amber} outline onPress={() => approveResponder(r.id)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  list: { padding: 18, paddingTop: 4, paddingBottom: 30 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 8 },
  sectionTitle: { color: C.faint, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.6 },
  countBadge: { backgroundColor: C.card2, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  countText: { color: C.sub, fontSize: 10.5, fontWeight: '800' },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.borderSoft,
    borderRadius: 15,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  name: { color: C.text, fontSize: 15, fontWeight: '800' },
  meta: { color: C.sub, fontSize: 11.5, marginTop: 2 },
  contactRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  contactText: { color: C.sub, fontSize: 11.5 },
  statsRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  stat: { color: C.faint, fontSize: 11 },
  statValue: { color: C.text, fontWeight: '800' },
  pendingHint: { color: C.faint, fontSize: 11.5, lineHeight: 16 },
});
