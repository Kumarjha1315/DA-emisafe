import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TileMap, { MapMarker } from '../../components/TileMap';
import { Pill, ScreenHeader } from '../../components/UI';
import { fmtEta, fmtKm, haversineKm } from '../../lib/geo';
import { getIncidents, getResponders } from '../../lib/store';
import { C, CATEGORY_META } from '../../lib/theme';
import type { GeoPoint } from '../../lib/types';
import { useLive } from '../../lib/useLive';

export default function LiveMapScreen({ navigation }: any) {
  const [deviceLoc, setDeviceLoc] = useState<GeoPoint | null>(null);
  const [locDenied, setLocDenied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocDenied(true);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setDeviceLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      } catch {
        setLocDenied(true);
      }
    })();
  }, []);

  const { data } = useLive(async () => {
    const [incidents, responders] = await Promise.all([getIncidents(), getResponders()]);
    return { incidents, responders };
  });

  const incidents = (data?.incidents ?? []).filter((i) => i.status !== 'Resolved');
  const responders = data?.responders ?? [];

  const markers: MapMarker[] = [];
  incidents.forEach((i) => {
    if (i.location) {
      const m = CATEGORY_META[i.category];
      markers.push({
        id: i.id,
        lat: i.location.lat,
        lon: i.location.lon,
        color: m.color,
        icon: m.icon,
        label: i.id,
        ring: !i.assignedResponderId,
      });
    }
  });
  responders.forEach((r) => {
    if (r.location && r.operationalStatus !== 'Offline') {
      markers.push({
        id: r.id,
        lat: r.location.lat,
        lon: r.location.lon,
        color: r.operationalStatus === 'Busy' ? C.blue : C.green,
        icon: 'navigate',
        label: r.fullName.split(' ')[0],
      });
    }
  });

  const center: GeoPoint | null =
    incidents.find((i) => i.location)?.location ??
    responders.find((r) => r.location)?.location ??
    deviceLoc;

  const assignments = incidents
    .filter((i) => i.assignedResponderId)
    .map((i) => {
      const r = responders.find((x) => x.id === i.assignedResponderId);
      const dist = r?.location && i.location ? haversineKm(r.location, i.location) : null;
      return { incident: i, responder: r, dist };
    });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Live Map" subtitle="Incidents & responder units" icon="map" />
      <View style={{ flex: 1, paddingHorizontal: 18, paddingBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <TileMap
            center={center}
            markers={markers}
            height={9999}
            initialZoom={13}
            placeholder={
              locDenied
                ? 'Location permission denied — map will center once an incident or unit reports a position.'
                : 'Requesting device GPS to center the operations map…'
            }
          />
        </View>

        <View style={styles.legend}>
          <Pill label="Unassigned" color={C.accent} />
          <Pill label="Assigned unit" color={C.blue} />
          <Pill label="Available unit" color={C.green} />
        </View>

        {assignments.length > 0 && (
          <FlatList
            horizontal
            data={assignments}
            keyExtractor={(a) => a.incident.id}
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0, marginTop: 10 }}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => (
              <Pressable
                style={styles.assignCard}
                onPress={() => navigation.navigate('IncidentManage', { id: item.incident.id })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons
                    name={CATEGORY_META[item.incident.category].icon}
                    size={13}
                    color={CATEGORY_META[item.incident.category].color}
                  />
                  <Text style={styles.assignId}>{item.incident.id}</Text>
                </View>
                <Text style={styles.assignName} numberOfLines={1}>{item.responder?.fullName ?? '—'}</Text>
                <Text style={styles.assignMeta}>
                  {item.dist != null ? `${fmtKm(item.dist)} · ${fmtEta(item.dist)}` : 'awaiting unit GPS'}
                </Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  legend: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  assignCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.borderSoft,
    borderRadius: 13,
    padding: 11,
    width: 172,
    gap: 3,
  },
  assignId: { color: C.text, fontSize: 12.5, fontWeight: '800', letterSpacing: 0.5 },
  assignName: { color: C.sub, fontSize: 11.5 },
  assignMeta: { color: C.blue, fontSize: 11, fontWeight: '700' },
});
