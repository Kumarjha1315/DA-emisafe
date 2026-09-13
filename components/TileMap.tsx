import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { latToY, lonToX, xToLon, yToLat } from '../lib/geo';
import { C } from '../lib/theme';
import type { GeoPoint } from '../lib/types';

export interface MapMarker {
  id: string;
  lat: number;
  lon: number;
  color: string;
  icon: any;
  label?: string;
  ring?: boolean;
}

export interface HeatPoint {
  lat: number;
  lon: number;
  weight?: number;
}

interface Props {
  center: GeoPoint | null;
  markers?: MapMarker[];
  heat?: HeatPoint[];
  height?: number;
  initialZoom?: number;
  placeholder?: string;
}

const TILE = 256;
const SUBS = ['a', 'b', 'c', 'd'];

export default function TileMap({
  center,
  markers = [],
  heat = [],
  height = 260,
  initialZoom = 14,
  placeholder = 'Waiting for a location fix\u2026',
}: Props) {
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(initialZoom);
  const [view, setView] = useState<GeoPoint | null>(center);
  const userMoved = useRef(false);
  const zoomRef = useRef(zoom);
  const viewRef = useRef<GeoPoint | null>(view);
  const panStart = useRef({ px: 0, py: 0 });

  zoomRef.current = zoom;
  viewRef.current = view;

  useEffect(() => {
    if (center && !userMoved.current) setView(center);
    if (center && !view) setView(center);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.lat, center?.lon]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) + Math.abs(g.dy) > 6,
      onPanResponderGrant: () => {
        const v = viewRef.current;
        if (!v) return;
        const z = zoomRef.current;
        panStart.current = { px: lonToX(v.lon, z) * TILE, py: latToY(v.lat, z) * TILE };
      },
      onPanResponderMove: (_e, g) => {
        const v = viewRef.current;
        if (!v) return;
        const z = zoomRef.current;
        const nx = panStart.current.px - g.dx;
        const ny = panStart.current.py - g.dy;
        userMoved.current = true;
        setView({ lat: yToLat(ny / TILE, z), lon: xToLon(nx / TILE, z) });
      },
    })
  ).current;

  const tiles = useMemo(() => {
    if (!view || width === 0) return [];
    const z = Math.round(zoom);
    const n = Math.pow(2, z);
    const cpx = lonToX(view.lon, z) * TILE;
    const cpy = latToY(view.lat, z) * TILE;
    const left = cpx - width / 2;
    const top = cpy - height / 2;
    const t: { key: string; uri: string; x: number; y: number }[] = [];
    const tx0 = Math.floor(left / TILE);
    const tx1 = Math.floor((left + width) / TILE);
    const ty0 = Math.floor(top / TILE);
    const ty1 = Math.floor((top + height) / TILE);
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        if (ty < 0 || ty >= n) continue;
        const wx = ((tx % n) + n) % n;
        const sub = SUBS[Math.abs(tx + ty) % SUBS.length];
        t.push({
          key: `${z}/${tx}/${ty}`,
          uri: `https://${sub}.basemaps.cartocdn.com/dark_all/${z}/${wx}/${ty}.png`,
          x: tx * TILE - left,
          y: ty * TILE - top,
        });
      }
    }
    return t;
  }, [view, zoom, width, height]);

  const project = (lat: number, lon: number) => {
    if (!view || width === 0) return null;
    const z = Math.round(zoom);
    const cpx = lonToX(view.lon, z) * TILE;
    const cpy = latToY(view.lat, z) * TILE;
    const x = lonToX(lon, z) * TILE - (cpx - width / 2);
    const y = latToY(lat, z) * TILE - (cpy - height / 2);
    if (x < -60 || x > width + 60 || y < -60 || y > height + 60) return null;
    return { x, y };
  };

  if (!center && !view) {
    return (
      <View style={[styles.map, { height, alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="location-outline" size={28} color={C.faint} />
        <Text style={styles.placeholder}>{placeholder}</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.map, { height }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      {...pan.panHandlers}
    >
      {tiles.map((t) => (
        <Image
          key={t.key}
          source={{ uri: t.uri }}
          style={{ position: 'absolute', left: t.x, top: t.y, width: TILE, height: TILE }}
          cachePolicy="memory-disk"
          transition={120}
        />
      ))}

      {heat.map((h, i) => {
        const p = project(h.lat, h.lon);
        if (!p) return null;
        const r = 28 + Math.min(4, h.weight ?? 1) * 8;
        return (
          <View key={`h${i}`} pointerEvents="none" style={{ position: 'absolute', left: p.x - r, top: p.y - r }}>
            <View style={{ width: r * 2, height: r * 2, borderRadius: r, backgroundColor: 'rgba(244,63,94,0.16)', borderWidth: 1, borderColor: 'rgba(244,63,94,0.28)', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: r, height: r, borderRadius: r / 2, backgroundColor: 'rgba(244,63,94,0.30)' }} />
            </View>
          </View>
        );
      })}

      {markers.map((m) => {
        const p = project(m.lat, m.lon);
        if (!p) return null;
        return (
          <View key={m.id} pointerEvents="none" style={{ position: 'absolute', left: p.x - 15, top: p.y - 15, alignItems: 'center' }}>
            {m.ring && (
              <View style={{ position: 'absolute', top: -8, left: -8, width: 46, height: 46, borderRadius: 23, backgroundColor: `${m.color}22`, borderWidth: 1, borderColor: `${m.color}55` }} />
            )}
            <View style={[styles.marker, { backgroundColor: m.color }]}>
              <Ionicons name={m.icon} size={15} color="#0A0F1C" />
            </View>
            {m.label ? (
              <View style={styles.markerLabel}>
                <Text style={styles.markerLabelText} numberOfLines={1}>{m.label}</Text>
              </View>
            ) : null}
          </View>
        );
      })}

      <View style={styles.controls}>
        <Pressable style={styles.ctrlBtn} onPress={() => setZoom((z) => Math.min(18, z + 1))} hitSlop={6}>
          <Ionicons name="add" size={18} color={C.text} />
        </Pressable>
        <Pressable style={styles.ctrlBtn} onPress={() => setZoom((z) => Math.max(3, z - 1))} hitSlop={6}>
          <Ionicons name="remove" size={18} color={C.text} />
        </Pressable>
        {center && (
          <Pressable
            style={styles.ctrlBtn}
            hitSlop={6}
            onPress={() => {
              userMoved.current = false;
              setView(center);
            }}
          >
            <Ionicons name="locate" size={16} color={C.accent} />
          </Pressable>
        )}
      </View>

      <Text style={styles.attribution}>© OpenStreetMap · © CARTO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#0D1526',
    borderWidth: 1,
    borderColor: C.border,
  },
  placeholder: { color: C.faint, fontSize: 13, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },
  marker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0A0F1C',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  markerLabel: {
    marginTop: 3,
    backgroundColor: 'rgba(10,15,28,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: 120,
  },
  markerLabelText: { color: C.text, fontSize: 10, fontWeight: '600' },
  controls: { position: 'absolute', right: 10, top: 10, gap: 6 },
  ctrlBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(17,26,44,0.92)',
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attribution: {
    position: 'absolute',
    left: 8,
    bottom: 6,
    color: 'rgba(141,160,191,0.65)',
    fontSize: 9,
  },
});
