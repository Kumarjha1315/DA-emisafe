import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../lib/theme';
import type { RootStackParamList } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

function RoleCard({
  icon,
  color,
  title,
  desc,
  tag,
  onPress,
}: {
  icon: any;
  color: string;
  title: string;
  desc: string;
  tag: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.roleCard, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
      <View style={[styles.roleIcon, { backgroundColor: `${color}1C`, borderColor: `${color}44` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.roleTitle}>{title}</Text>
          <View style={[styles.roleTag, { backgroundColor: `${color}1C` }]}>
            <Text style={[styles.roleTagText, { color }]}>{tag}</Text>
          </View>
        </View>
        <Text style={styles.roleDesc}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.faint} />
    </Pressable>
  );
}

export default function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <View style={styles.logoRing}>
              <View style={styles.logoInner}>
                <Ionicons name="shield-checkmark" size={34} color={C.accent} />
              </View>
            </View>
          </View>
          <Text style={styles.brand}>
            Emi<Text style={{ color: C.accent }}>Safe</Text>
          </Text>
          <Text style={styles.tagline}>Centralized Emergency Dispatch & Tracking</Text>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Unified command · Live tracking · Real-time dispatch</Text>
          </View>
        </View>

        <Pressable
          onPress={() => navigation.navigate('Report')}
          style={({ pressed }) => [styles.sos, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <View style={styles.sosIcon}>
            <Ionicons name="alert" size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sosTitle}>Report an Emergency</Text>
            <Text style={styles.sosDesc}>No sign-up needed · GPS captured automatically</Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={30} color="rgba(255,255,255,0.9)" />
        </Pressable>

        <Text style={styles.sectionLabel}>PORTALS</Text>

        <RoleCard
          icon="search"
          color={C.amber}
          title="Track My Report"
          desc="Follow responder location, ETA and live status with your Report ID."
          tag="CITIZEN"
          onPress={() => navigation.navigate('Track')}
        />
        <RoleCard
          icon="desktop"
          color={C.blue}
          title="Dispatcher Command"
          desc="Operations dashboard, live map, responder verification & analytics."
          tag="SECURE"
          onPress={() => navigation.navigate('DispatcherLogin')}
        />
        <RoleCard
          icon="walk"
          color={C.green}
          title="Field Responder"
          desc="Register your unit, receive assignments and publish status updates."
          tag="FIELD"
          onPress={() => navigation.navigate('ResponderAuth')}
        />

        <View style={styles.footer}>
          <Ionicons name="pulse" size={13} color={C.faint} />
          <Text style={styles.footerText}>Received → En Route → On Scene → Resolved</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 32, maxWidth: 560, width: '100%', alignSelf: 'center' },
  hero: { alignItems: 'center', paddingTop: 26, paddingBottom: 26 },
  logoWrap: { marginBottom: 16 },
  logoRing: {
    width: 88,
    height: 88,
    borderRadius: 30,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.35)',
  },
  logoInner: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  brand: { color: C.text, fontSize: 34, fontWeight: '900', letterSpacing: 0.5 },
  tagline: { color: C.sub, fontSize: 13.5, marginTop: 5 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  liveText: { color: C.faint, fontSize: 11.5 },
  sos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.accent,
    borderRadius: 18,
    padding: 18,
    marginBottom: 22,
    shadowColor: C.accent,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  sosIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosTitle: { color: '#fff', fontSize: 17.5, fontWeight: '900', letterSpacing: 0.3 },
  sosDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  sectionLabel: { color: C.faint, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borderSoft,
    padding: 16,
    marginBottom: 12,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  roleTitle: { color: C.text, fontSize: 15.5, fontWeight: '800' },
  roleTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  roleTagText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  roleDesc: { color: C.sub, fontSize: 12, marginTop: 3, lineHeight: 17 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },
  footerText: { color: C.faint, fontSize: 11 },
});
