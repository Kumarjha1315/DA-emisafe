import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Field, Input, PrimaryButton, ScreenHeader } from '../../components/UI';
import { reverseGeocode } from '../../lib/geo';
import { createIncident } from '../../lib/store';
import { C, CATEGORY_META } from '../../lib/theme';
import type { EmergencyCategory, GeoPoint, RootStackParamList } from '../../lib/types';
import { CATEGORIES } from '../../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Report'>;

type LocState = 'requesting' | 'granted' | 'denied' | 'error';

export default function ReportIncidentScreen({ navigation }: Props) {
  const [category, setCategory] = useState<EmergencyCategory | null>(null);
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [locState, setLocState] = useState<LocState>('requesting');
  const [location, setLocation] = useState<GeoPoint | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);

  const captureLocation = async () => {
    setLocState('requesting');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocState('denied');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const point = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      setLocation(point);
      setAccuracy(pos.coords.accuracy ?? null);
      setLocState('granted');
      const addr = await reverseGeocode(point.lat, point.lon);
      if (addr) setAddress(addr);
    } catch {
      setLocState('error');
    }
  };

  useEffect(() => {
    captureLocation();
  }, []);

  const pickPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.3,
        base64: true,
        allowsMultipleSelection: false,
      });
      if (!res.canceled && res.assets?.[0]) {
        const a = res.assets[0];
        if (a.base64) setPhoto(`data:${a.mimeType ?? 'image/jpeg'};base64,${a.base64}`);
        else if (a.uri) setPhoto(a.uri);
      }
    } catch {
      setError('Could not open photo library on this device.');
    }
  };

  const submit = async () => {
    setError(null);
    if (!category) return setError('Please select an emergency category.');
    if (description.trim().length < 5) return setError('Please describe the incident (a few words at least).');
    if (name.trim().length < 2) return setError('Your name is required.');
    if (phone.trim().length < 6) return setError('A valid phone number is required.');
    if (!location) return setError('Device location is required — tap “Capture location” and allow GPS access.');
    setSubmitting(true);
    try {
      const inc = await createIncident({
        category,
        description: description.trim(),
        name: name.trim(),
        phone: phone.trim(),
        photo,
        location,
        address,
      });
      setDoneId(inc.id);
    } catch {
      setError('Something went wrong while saving your report. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  if (doneId) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.doneWrap}>
          <View style={styles.doneRing}>
            <Ionicons name="checkmark" size={40} color={C.green} />
          </View>
          <Text style={styles.doneTitle}>Report Received</Text>
          <Text style={styles.doneSub}>Dispatch has been notified. Keep your Report ID to follow live progress — it is also saved on this device.</Text>
          <View style={styles.idBox}>
            <Text style={styles.idLabel}>REPORT ID</Text>
            <Text style={styles.idValue}>{doneId}</Text>
          </View>
          <View style={{ gap: 10, width: '100%', maxWidth: 380 }}>
            <PrimaryButton title="Track this report live" icon="navigate" onPress={() => navigation.replace('TrackDetail', { id: doneId })} />
            <PrimaryButton title="Back to home" icon="home" outline color={C.sub} onPress={() => navigation.popToTop()} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Report Emergency" subtitle="No registration required" onBack={() => navigation.goBack()} icon="alert" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Field label="Emergency category">
            <View style={styles.catGrid}>
              {CATEGORIES.map((c) => {
                const m = CATEGORY_META[c];
                const active = category === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[styles.catCard, active && { borderColor: m.color, backgroundColor: m.soft }]}
                  >
                    <View style={[styles.catIcon, { backgroundColor: active ? `${m.color}2A` : C.card2 }]}>
                      <Ionicons name={m.icon} size={20} color={active ? m.color : C.sub} />
                    </View>
                    <Text style={[styles.catName, active && { color: m.color }]}>{c}</Text>
                    <Text style={styles.catDesc} numberOfLines={2}>{m.desc}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Field label="What is happening?">
            <Input
              placeholder="Describe the incident, people involved, landmarks…"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              style={{ minHeight: 92, textAlignVertical: 'top' }}
            />
          </Field>

          <Field label="Device location (GPS)">
            <Card style={{ padding: 14 }}>
              {locState === 'requesting' && (
                <View style={styles.locRow}>
                  <ActivityIndicator color={C.amber} size="small" />
                  <Text style={styles.locText}>Requesting GPS permission & acquiring fix…</Text>
                </View>
              )}
              {locState === 'granted' && location && (
                <View style={{ gap: 4 }}>
                  <View style={styles.locRow}>
                    <Ionicons name="location" size={16} color={C.green} />
                    <Text style={[styles.locText, { color: C.green, fontWeight: '700' }]}>Location captured</Text>
                    {accuracy != null && <Text style={styles.locAcc}>±{Math.round(accuracy)} m</Text>}
                  </View>
                  <Text style={styles.locCoords}>{location.lat.toFixed(5)}, {location.lon.toFixed(5)}</Text>
                  {address && <Text style={styles.locAddr} numberOfLines={2}>{address}</Text>}
                </View>
              )}
              {(locState === 'denied' || locState === 'error') && (
                <View style={{ gap: 10 }}>
                  <View style={styles.locRow}>
                    <Ionicons name="warning" size={16} color={C.danger} />
                    <Text style={[styles.locText, { color: C.danger }]}>
                      {locState === 'denied'
                        ? 'Location permission denied — responders need your position.'
                        : 'Could not get a GPS fix. Please retry.'}
                    </Text>
                  </View>
                  <PrimaryButton title="Capture location" icon="locate" color={C.amber} onPress={captureLocation} />
                </View>
              )}
              {locState === 'granted' && (
                <Pressable onPress={captureLocation} style={styles.refreshLoc} hitSlop={6}>
                  <Ionicons name="refresh" size={13} color={C.sub} />
                  <Text style={{ color: C.sub, fontSize: 11.5 }}>Refresh fix</Text>
                </Pressable>
              )}
            </Card>
          </Field>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Your name">
                <Input placeholder="Full name" value={name} onChangeText={setName} autoCapitalize="words" returnKeyType="next" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Phone number">
                <Input placeholder="+1 555 000 111" value={phone} onChangeText={setPhone} keyboardType="phone-pad" returnKeyType="done" />
              </Field>
            </View>
          </View>

          <Field label="Photo evidence" optional>
            {photo ? (
              <View style={styles.photoWrap}>
                <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" />
                <Pressable style={styles.photoRemove} onPress={() => setPhoto(null)} hitSlop={8}>
                  <Ionicons name="close" size={15} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.photoPick} onPress={pickPhoto}>
                <Ionicons name="camera" size={22} color={C.sub} />
                <Text style={{ color: C.sub, fontSize: 13 }}>Attach a photo of the scene</Text>
              </Pressable>
            )}
          </Field>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={C.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <PrimaryButton
            title={submitting ? 'Submitting…' : 'Submit Emergency Report'}
            icon="send"
            onPress={submit}
            loading={submitting}
          />
          <Text style={styles.disclaimer}>A unique Report ID will be generated so you can track the response in real time.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 18, paddingTop: 4, gap: 18, paddingBottom: 40, maxWidth: 560, width: '100%', alignSelf: 'center' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.borderSoft,
    padding: 13,
    gap: 6,
  },
  catIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  catName: { color: C.text, fontSize: 14, fontWeight: '800' },
  catDesc: { color: C.faint, fontSize: 10.5, lineHeight: 14 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locText: { color: C.sub, fontSize: 13, flex: 1 },
  locAcc: { color: C.faint, fontSize: 11 },
  locCoords: { color: C.text, fontSize: 13.5, fontWeight: '700', marginLeft: 24 },
  locAddr: { color: C.sub, fontSize: 12, marginLeft: 24, lineHeight: 17 },
  refreshLoc: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, alignSelf: 'flex-start' },
  row2: { flexDirection: 'row', gap: 12 },
  photoPick: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 22,
    alignItems: 'center',
    gap: 8,
  },
  photoWrap: { borderRadius: 14, overflow: 'hidden' },
  photo: { width: '100%', height: 170, borderRadius: 14 },
  photoRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(10,15,28,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
    borderRadius: 12,
    padding: 12,
  },
  errorText: { color: C.danger, fontSize: 12.5, flex: 1, lineHeight: 17 },
  disclaimer: { color: C.faint, fontSize: 11.5, textAlign: 'center', lineHeight: 16 },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 8 },
  doneRing: {
    width: 92,
    height: 92,
    borderRadius: 32,
    backgroundColor: C.greenSoft,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  doneTitle: { color: C.text, fontSize: 24, fontWeight: '900' },
  doneSub: { color: C.sub, fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 340 },
  idBox: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 36,
    alignItems: 'center',
    marginVertical: 18,
  },
  idLabel: { color: C.faint, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  idValue: { color: C.accent, fontSize: 28, fontWeight: '900', letterSpacing: 2, marginTop: 4 },
});
