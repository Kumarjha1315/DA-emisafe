import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field, Input, PrimaryButton, ScreenHeader } from '../../components/UI';
import { findResponderLogin, getResponderSession, registerResponder, setResponderSession } from '../../lib/store';
import { C, CATEGORY_META } from '../../lib/theme';
import type { EmergencyCategory, RootStackParamList } from '../../lib/types';
import { CATEGORIES } from '../../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ResponderAuth'>;

export default function ResponderAuthScreen({ navigation }: Props) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [department, setDepartment] = useState<EmergencyCategory | null>(null);
  const [fullName, setFullName] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [years, setYears] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getResponderSession().then((id) => {
      if (id) navigation.replace('ResponderHome');
    });
  }, [navigation]);

  const register = async () => {
    setError(null);
    if (!department) return setError('Select your department.');
    if (fullName.trim().length < 2) return setError('Full name is required.');
    if (badgeId.trim().length < 2) return setError('Badge ID is required.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (phone.trim().length < 6) return setError('Enter a valid phone number.');
    const y = parseInt(years, 10);
    if (isNaN(y) || y < 0 || y > 60) return setError('Years of experience must be a number (0–60).');
    setBusy(true);
    const res = await registerResponder({
      department,
      fullName: fullName.trim(),
      badgeId: badgeId.trim(),
      email: email.trim(),
      phone: phone.trim(),
      yearsExperience: y,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    await setResponderSession(res.responder.id);
    navigation.replace('ResponderHome');
  };

  const login = async () => {
    setError(null);
    if (!badgeId.trim() || !email.trim()) return setError('Enter your Badge ID and registered email.');
    setBusy(true);
    const r = await findResponderLogin(badgeId, email);
    setBusy(false);
    if (!r) return setError('No responder account matches that Badge ID + email combination.');
    await setResponderSession(r.id);
    navigation.replace('ResponderHome');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Field Responder" subtitle="Unit onboarding & sign-in" onBack={() => navigation.goBack()} icon="walk" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.segment}>
            {(['register', 'login'] as const).map((m) => (
              <Pressable key={m} onPress={() => { setMode(m); setError(null); }} style={[styles.segmentBtn, mode === m && styles.segmentActive]}>
                <Text style={[styles.segmentText, mode === m && { color: C.text }]}>
                  {m === 'register' ? 'Register Unit' : 'Sign In'}
                </Text>
              </Pressable>
            ))}
          </View>

          {mode === 'register' && (
            <>
              <Field label="Department">
                <View style={styles.deptRow}>
                  {CATEGORIES.map((c) => {
                    const m = CATEGORY_META[c];
                    const active = department === c;
                    return (
                      <Pressable
                        key={c}
                        onPress={() => setDepartment(c)}
                        style={[styles.dept, active && { borderColor: m.color, backgroundColor: m.soft }]}
                      >
                        <Ionicons name={m.icon} size={16} color={active ? m.color : C.sub} />
                        <Text style={[styles.deptText, active && { color: m.color, fontWeight: '800' }]}>{c}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Field>
              <Field label="Full name">
                <Input placeholder="e.g. Alex Rivera" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
              </Field>
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Field label="Badge ID">
                    <Input placeholder="PD-1042" value={badgeId} onChangeText={(t) => setBadgeId(t.toUpperCase())} autoCapitalize="characters" autoCorrect={false} />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Years of experience">
                    <Input placeholder="5" value={years} onChangeText={setYears} keyboardType="number-pad" />
                  </Field>
                </View>
              </View>
              <Field label="Email">
                <Input placeholder="unit@city.gov" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              </Field>
              <Field label="Phone number">
                <Input placeholder="+1 555 010 990" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              </Field>
            </>
          )}

          {mode === 'login' && (
            <>
              <Field label="Badge ID">
                <Input placeholder="Your badge ID" value={badgeId} onChangeText={(t) => setBadgeId(t.toUpperCase())} autoCapitalize="characters" autoCorrect={false} />
              </Field>
              <Field label="Registered email">
                <Input placeholder="unit@city.gov" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} onSubmitEditing={login} returnKeyType="go" />
              </Field>
            </>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={15} color={C.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <PrimaryButton
            title={mode === 'register' ? 'Register · Pending Approval' : 'Sign In'}
            icon={mode === 'register' ? 'person-add' : 'log-in'}
            color={C.green}
            onPress={mode === 'register' ? register : login}
            loading={busy}
          />
          {mode === 'register' && (
            <Text style={styles.note}>
              Your account stays “Pending Approval” until a dispatcher verifies your credentials while assigning you to an incident.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingTop: 6, gap: 16, paddingBottom: 40, maxWidth: 520, width: '100%', alignSelf: 'center' },
  segment: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    padding: 4,
  },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  segmentActive: { backgroundColor: C.card2 },
  segmentText: { color: C.faint, fontSize: 13.5, fontWeight: '700' },
  deptRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dept: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  deptText: { color: C.sub, fontSize: 12.5, fontWeight: '600' },
  row2: { flexDirection: 'row', gap: 12 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(248,113,113,0.12)', borderRadius: 12, padding: 11 },
  errorText: { color: C.danger, fontSize: 12.5, flex: 1 },
  note: { color: C.faint, fontSize: 11.5, textAlign: 'center', lineHeight: 17 },
});
