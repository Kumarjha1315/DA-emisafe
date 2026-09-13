import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field, Input, PrimaryButton, ScreenHeader } from '../../components/UI';
import { DISPATCH_LOGIN_ID, DISPATCH_PASSWORD, dispatcherLogin, getDispatchSession } from '../../lib/store';
import { C } from '../../lib/theme';
import type { RootStackParamList } from '../../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'DispatcherLogin'>;

export default function DispatcherLoginScreen({ navigation }: Props) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getDispatchSession().then((active) => {
      if (active) navigation.replace('Dispatcher');
    });
  }, [navigation]);

  const submit = async () => {
    setError(null);
    setBusy(true);
    const ok = await dispatcherLogin(loginId, password);
    setBusy(false);
    if (ok) navigation.replace('Dispatcher');
    else setError('Invalid credentials. Access to the command console is restricted.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Dispatcher Access" subtitle="Restricted command console" onBack={() => navigation.goBack()} icon="desktop" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.lockWrap}>
            <View style={styles.lockRing}>
              <Ionicons name="lock-closed" size={30} color={C.blue} />
            </View>
          </View>

          <Field label="Login ID">
            <Input
              placeholder="Permanent login ID"
              value={loginId}
              onChangeText={setLoginId}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </Field>
          <Field label="Password">
            <Input
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={submit}
            />
          </Field>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={15} color={C.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <PrimaryButton title="Enter Command Console" icon="log-in" color={C.blue} onPress={submit} loading={busy} />

          <View style={styles.hintBox}>
            <Ionicons name="key" size={14} color={C.amber} />
            <Text style={styles.hintText}>
              Demo credentials — ID: <Text style={styles.hintStrong}>{DISPATCH_LOGIN_ID}</Text>  ·  Password: <Text style={styles.hintStrong}>{DISPATCH_PASSWORD}</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, gap: 16, maxWidth: 480, width: '100%', alignSelf: 'center' },
  lockWrap: { alignItems: 'center', paddingVertical: 18 },
  lockRing: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: C.blueSoft,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderRadius: 12,
    padding: 11,
  },
  errorText: { color: C.danger, fontSize: 12.5, flex: 1 },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: C.amberSoft,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
  },
  hintText: { color: C.sub, fontSize: 12, flex: 1, lineHeight: 17 },
  hintStrong: { color: C.amber, fontWeight: '800' },
});
