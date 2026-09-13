import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { C } from '../lib/theme';

const AXIS = 'rgba(141,160,191,0.7)';
const GRID = 'rgba(34,48,73,0.6)';

function NoData({ label }: { label?: string }) {
  return (
    <View style={styles.noData}>
      <Text style={styles.noDataText}>{label ?? 'No data recorded yet'}</Text>
    </View>
  );
}

// ---------------- Line chart ----------------
export function LineChart({
  data,
  color = C.accent,
  height = 170,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}) {
  const [w, setW] = useState(0);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (data.length === 0) return <NoData />;
  const padL = 30;
  const padB = 22;
  const padT = 10;
  const maxV = Math.max(1, ...data.map((d) => d.value));
  const innerW = Math.max(1, w - padL - 10);
  const innerH = height - padB - padT;
  const px = (i: number) => padL + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const py = (v: number) => padT + innerH - (v / maxV) * innerH;
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${py(d.value)}`).join(' ');
  const area = `${line} L${px(data.length - 1)},${padT + innerH} L${px(0)},${padT + innerH} Z`;
  const ySteps = 3;

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={height}>
          {Array.from({ length: ySteps + 1 }).map((_, i) => {
            const v = Math.round((maxV / ySteps) * i);
            const y = py(v);
            return (
              <React.Fragment key={i}>
                <Line x1={padL} y1={y} x2={w - 10} y2={y} stroke={GRID} strokeWidth={1} />
                <SvgText x={padL - 6} y={y + 3} fontSize={9} fill={AXIS} textAnchor="end">{v}</SvgText>
              </React.Fragment>
            );
          })}
          {total > 0 && <Path d={area} fill={color} fillOpacity={0.12} />}
          <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {data.map((d, i) => (
            <Circle key={i} cx={px(i)} cy={py(d.value)} r={3.5} fill={color} stroke={C.bg} strokeWidth={1.5} />
          ))}
          {data.map((d, i) =>
            i % Math.ceil(data.length / 6) === 0 || i === data.length - 1 ? (
              <SvgText key={`l${i}`} x={px(i)} y={height - 6} fontSize={9} fill={AXIS} textAnchor="middle">{d.label}</SvgText>
            ) : null
          )}
        </Svg>
      )}
      {total === 0 && <Text style={styles.overlayHint}>No requests in this window yet</Text>}
    </View>
  );
}

// ---------------- Pie / Donut ----------------
function wedgePath(cx: number, cy: number, rO: number, rI: number, a0: number, a1: number): string {
  const sweep = Math.min(359.9, a1 - a0);
  const end = a0 + sweep;
  const rad = (d: number) => ((d - 90) * Math.PI) / 180;
  const pt = (r: number, d: number) => `${cx + r * Math.cos(rad(d))},${cy + r * Math.sin(rad(d))}`;
  const large = sweep > 180 ? 1 : 0;
  if (rI <= 0) {
    return `M${cx},${cy} L${pt(rO, a0)} A${rO},${rO} 0 ${large} 1 ${pt(rO, end)} Z`;
  }
  return `M${pt(rO, a0)} A${rO},${rO} 0 ${large} 1 ${pt(rO, end)} L${pt(rI, end)} A${rI},${rI} 0 ${large} 0 ${pt(rI, a0)} Z`;
}

export function PieChart({
  data,
  donut = false,
  size = 150,
  centerLabel,
}: {
  data: { label: string; value: number; color: string }[];
  donut?: boolean;
  size?: number;
  centerLabel?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <NoData />;
  const r = size / 2;
  const rI = donut ? r * 0.62 : 0;
  let angle = 0;
  const slices = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const a0 = angle;
      const sweep = (d.value / total) * 360;
      angle += sweep;
      return { ...d, a0, a1: a0 + sweep };
    });

  return (
    <View style={styles.pieRow}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {slices.map((s, i) => (
            <Path key={i} d={wedgePath(r, r, r - 2, rI, s.a0, s.a1)} fill={s.color} stroke={C.bg} strokeWidth={1.5} />
          ))}
        </Svg>
        {donut && (
          <View style={styles.donutCenter} pointerEvents="none">
            <Text style={styles.donutValue}>{total}</Text>
            <Text style={styles.donutLabel}>{centerLabel ?? 'total'}</Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        {data.map((d, i) => (
          <View key={i} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: d.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>{d.label}</Text>
            <Text style={styles.legendValue}>{d.value}</Text>
            <Text style={styles.legendPct}>{total ? Math.round((d.value / total) * 100) : 0}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------- Grouped double-bar ----------------
export function DoubleBarChart({
  categories,
  seriesA,
  seriesB,
  height = 190,
  unit = 'min',
}: {
  categories: string[];
  seriesA: { label: string; color: string; values: number[] };
  seriesB: { label: string; color: string; values: number[] };
  height?: number;
  unit?: string;
}) {
  const [w, setW] = useState(0);
  const maxV = Math.max(1, ...seriesA.values, ...seriesB.values);
  const hasData = [...seriesA.values, ...seriesB.values].some((v) => v > 0);
  if (!hasData) return <NoData label="No response-time samples yet" />;

  const padL = 34;
  const padB = 24;
  const padT = 12;
  const innerW = Math.max(1, w - padL - 8);
  const innerH = height - padB - padT;
  const groupW = innerW / categories.length;
  const barW = Math.min(20, groupW * 0.26);

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={height}>
          {Array.from({ length: 4 }).map((_, i) => {
            const v = (maxV / 3) * i;
            const y = padT + innerH - (v / maxV) * innerH;
            return (
              <React.Fragment key={i}>
                <Line x1={padL} y1={y} x2={w - 8} y2={y} stroke={GRID} strokeWidth={1} />
                <SvgText x={padL - 5} y={y + 3} fontSize={9} fill={AXIS} textAnchor="end">{Math.round(v)}</SvgText>
              </React.Fragment>
            );
          })}
          {categories.map((cat, i) => {
            const cx = padL + groupW * i + groupW / 2;
            const av = seriesA.values[i] ?? 0;
            const bv = seriesB.values[i] ?? 0;
            const ah = (av / maxV) * innerH;
            const bh = (bv / maxV) * innerH;
            return (
              <React.Fragment key={cat}>
                <Rect x={cx - barW - 2} y={padT + innerH - ah} width={barW} height={Math.max(av > 0 ? 3 : 0, ah)} rx={3} fill={seriesA.color} />
                <Rect x={cx + 2} y={padT + innerH - bh} width={barW} height={Math.max(bv > 0 ? 3 : 0, bh)} rx={3} fill={seriesB.color} />
                <SvgText x={cx} y={height - 8} fontSize={9.5} fill={AXIS} textAnchor="middle">{cat}</SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      )}
      <View style={styles.barLegend}>
        <View style={styles.legendRowInline}>
          <View style={[styles.legendDot, { backgroundColor: seriesA.color }]} />
          <Text style={styles.legendLabel}>{seriesA.label} ({unit})</Text>
        </View>
        <View style={styles.legendRowInline}>
          <View style={[styles.legendDot, { backgroundColor: seriesB.color }]} />
          <Text style={styles.legendLabel}>{seriesB.label} ({unit})</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  noData: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderSoft,
    borderStyle: 'dashed',
  },
  noDataText: { color: C.faint, fontSize: 12.5 },
  overlayHint: { color: C.faint, fontSize: 11, textAlign: 'center', marginTop: 4 },
  pieRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  donutCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  donutValue: { color: C.text, fontSize: 22, fontWeight: '800' },
  donutLabel: { color: C.sub, fontSize: 10, marginTop: 1 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendRowInline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 3 },
  legendLabel: { color: C.sub, fontSize: 12, flexShrink: 1 },
  legendValue: { color: C.text, fontSize: 12.5, fontWeight: '700', marginLeft: 'auto' },
  legendPct: { color: C.faint, fontSize: 11, width: 36, textAlign: 'right' },
  barLegend: { flexDirection: 'row', gap: 18, justifyContent: 'center', marginTop: 6 },
});
