import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryBadge, EmptyState, Input, PrimaryButton, ScreenHeader, StatusBadge } from '../../components/UI';
import { timeAgo } from '../../lib/geo';
import { getIncident, getIncidents, getMyReports } from '../../lib/store';
import { C } from '../../lib/theme';
import type { Incident, RootStackParamList } from '../../lib/types';
import { useLive } from '../../lib/useLive';

type Props = NativeStackScreenProps<RootStackParamList, 'Track'>;

export default function TrackLookupScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const { data: history, reload } = useLive(async () => {
    const ids = await getMyReports();
    const all = await getIncidents();
    return ids
      .map((id) => all.find((i) => i.id === id))
      .filter((i): i is Incident => !!i);
  });

  const lookup = async () => {
    setError(null);
    if (!query.trim()) return;
    setSearching(true);
    const inc = await getIncident(query);
    setSearching(false);
    if (!inc) {
      setError(`No report found for “${query.trim().toUpperCase()}”. Check the ID and try again.`);
      return;
    }
    navigation.navigate('TrackDetail', { id: inc.id });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Track My Report" subtitle="Live status by Report ID" onBack={() => navigation.goBack()} icon="search" />
      <FlatList
        data={history ?? []}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={C.accent} />}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 22 }}>
            <Input
              placeholder="Enter Report ID  ·  e.g. EMI-7K2QX"
              value={query}
              onChangeText={(t) => setQuery(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={lookup}
              style={{ fontSize: 16, letterSpacing: 1, textAlign: 'center', fontWeight: '700' }}
            />
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={15} color={C.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            <PrimaryButton title="Track Report" icon="navigate" onPress={lookup} loading={searching} disabled={!query.trim()} />
            <Text style={styles.historyLabel}>REPORTS FROM THIS DEVICE</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No saved reports yet"
            message="Report IDs generated on this device will appear here automatically for quick access."
          />
        }
        renderItem={({ item }) => (
          <Pressable style={styles.item} onPress={() => navigation.navigate('TrackDetail', { id: item.id })}>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.itemId}>{item.id}</Text>
                <Text style={styles.itemTime}>{timeAgo(item.createdAt)}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <CategoryBadge category={item.category} small />
                <StatusBadge status={item.status} small />
              </View>
            </View>
            <Ionicons name="chevron-forward" size={17} color={C.faint} />
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  list: { padding: 18, paddingTop: 6, paddingBottom: 40, maxWidth: 560, width: '100%', alignSelf: 'center' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderRadius: 12,
    padding: 11,
  },
  errorText: { color: C.danger, fontSize: 12.5, flex: 1 },
  historyLabel: { color: C.faint, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.6, marginTop: 14 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.borderSoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  itemId: { color: C.text, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  itemTime: { color: C.faint, fontSize: 11 },
});
