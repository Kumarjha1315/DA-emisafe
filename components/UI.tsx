import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { fmtTime } from '../lib/geo';
import { C, CATEGORY_META, STATUS_META } from '../lib/theme';
import type { EmergencyCategory, Incident, IncidentStatus } from '../lib/types';
import { STATUSES } from '../lib/types';

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  icon,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  icon?: any;
}) {
  return (
    <View style={styles.header}>
      {onBack && (
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </Pressable>
      )}
      {icon && (
        <View style={styles.headerIcon}>
          <Ionicons name={icon} size={17} color={C.accent} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.headerSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color = C.accent,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && { backgroundColor: `${color}26`, borderColor: color },
      ]}
    >
      <Text style={[styles.chipText, active && { color, fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

export function StatusBadge({ status, small }: { status: IncidentStatus; small?: boolean }) {
  const m = STATUS_META[status];
  return (
    <View style={[styles.badge, { backgroundColor: m.soft }]}>
      <Ionicons name={m.icon} size={small ? 10 : 12} color={m.color} />
      <Text style={[styles.badgeText, { color: m.color, fontSize: small ? 10 : 11.5 }]}>{status}</Text>
    </View>
  );
}

export function CategoryBadge({ category, small }: { category: EmergencyCategory; small?: boolean }) {
  const m = CATEGORY_META[category];
  return (
    <View style={[styles.badge, { backgroundColor: m.soft }]}>
      <Ionicons name={m.icon} size={small ? 10 : 12} color={m.color} />
      <Text style={[styles.badgeText, { color: m.color, fontSize: small ? 10 : 11.5 }]}>{category}</Text>
    </View>
  );
}

export function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22` }]}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
}: {
  icon: any;
  title: string;
  message?: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={26} color={C.faint} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMsg}>{message}</Text> : null}
    </View>
  );
}

export function KPICard({
  icon,
  label,
  value,
  color,
  hint,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
  hint?: string;
}) {
  return (
    <View style={styles.kpi}>
      <View style={[styles.kpiIcon, { backgroundColor: `${color}1E` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.kpiValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.kpiLabel} numberOfLines={1}>{label}</Text>
      {hint ? <Text style={styles.kpiHint} numberOfLines={1}>{hint}</Text> : null}
    </View>
  );
}

export function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.fieldLabel}>
        {label}
        {optional ? <Text style={{ color: C.faint, fontWeight: '400' }}>  · optional</Text> : null}
      </Text>
      {children}
    </View>
  );
}

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={C.faint}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

export function PrimaryButton({
  title,
  icon,
  onPress,
  color = C.accent,
  disabled,
  loading,
  outline,
}: {
  title: string;
  icon?: any;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  loading?: boolean;
  outline?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        outline
          ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: color }
          : { backgroundColor: color },
        (disabled || loading) && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={outline ? color : '#0A0F1C'} size="small" />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={17} color={outline ? color : '#0A0F1C'} />}
          <Text style={[styles.btnText, { color: outline ? color : '#0A0F1C' }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function StageStepper({ incident }: { incident: Incident }) {
  const currentIdx = STATUSES.indexOf(incident.status);
  const times: (number | null | undefined)[] = [
    incident.createdAt,
    incident.enRouteAt,
    incident.onSceneAt,
    incident.resolvedAt,
  ];
  return (
    <View style={styles.stepper}>
      {STATUSES.map((s, i) => {
        const m = STATUS_META[s];
        const done = i <= currentIdx;
        return (
          <React.Fragment key={s}>
            {i > 0 && (
              <View style={[styles.stepLine, { backgroundColor: i <= currentIdx ? m.color : C.border }]} />
            )}
            <View style={{ alignItems: 'center', width: 66 }}>
              <View
                style={[
                  styles.stepDot,
                  done
                    ? { backgroundColor: m.soft, borderColor: m.color }
                    : { backgroundColor: C.card2, borderColor: C.border },
                ]}
              >
                <Ionicons name={m.icon} size={14} color={done ? m.color : C.faint} />
              </View>
              <Text style={[styles.stepLabel, { color: done ? C.text : C.faint }]} numberOfLines={1}>{s}</Text>
              <Text style={styles.stepTime}>{times[i] ? fmtTime(times[i] as number) : '--:--'}</Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: C.text, fontSize: 19, fontWeight: '800', letterSpacing: 0.2 },
  headerSub: { color: C.sub, fontSize: 12, marginTop: 1 },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borderSoft,
    padding: 16,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
  sectionTitle: { color: C.text, fontSize: 14.5, fontWeight: '700', letterSpacing: 0.3 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  chipText: { color: C.sub, fontSize: 12.5, fontWeight: '500' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11.5, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
  emptyMsg: { color: C.sub, fontSize: 12.5, textAlign: 'center', marginTop: 5, lineHeight: 18, maxWidth: 280 },
  kpi: {
    flex: 1,
    minWidth: 100,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderSoft,
    padding: 12,
    gap: 3,
  },
  kpiIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  kpiValue: { color: C.text, fontSize: 19, fontWeight: '800' },
  kpiLabel: { color: C.sub, fontSize: 11 },
  kpiHint: { color: C.faint, fontSize: 10 },
  fieldLabel: { color: C.sub, fontSize: 12.5, fontWeight: '600', letterSpacing: 0.2 },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 14.5,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 13,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  btnText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  stepper: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
  stepLine: { flex: 1, height: 2.5, borderRadius: 2, marginTop: 16, marginHorizontal: -8 },
  stepDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: { fontSize: 10.5, fontWeight: '700', marginTop: 5 },
  stepTime: { fontSize: 9.5, color: C.faint, marginTop: 1 },
});
