import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useData } from '../data/DataProvider';
import { formatDate } from '../lib/date';
import { newId, nowIso } from '../lib/id';
import { MEASURES, measureUnit } from '../lib/measurements';
import { formatNumber } from '../lib/stats';
import { BodyEntry, MeasureKey } from '../types';
import { MeasureGuide } from './BodySilhouette';
import { confirm, notify } from './confirm';
import { DateBar } from './DateBar';
import { colors, space } from './theme';
import { Button, Card, Delta, Field, Muted, NumberInput, Row, SectionHeader } from './ui';

export function BodyToday({ date, onDate }: { date: string; onDate: (d: string) => void }) {
  const { data, profile, settings, saveDoc, removeDoc } = useData();
  const existing = data.bodyLogs.find((b) => b.date === date);
  const [values, setValues] = useState<Partial<Record<MeasureKey, number>>>(existing?.values ?? {});
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [focus, setFocus] = useState<MeasureKey | null>('chest');

  useEffect(() => {
    setValues(existing?.values ?? {});
    setNotes(existing?.notes ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, existing?.id]);

  /** Most recent value before this date, per measurement — to show the change. */
  const previous = useMemo(() => {
    const out: Partial<Record<MeasureKey, { v: number; date: string }>> = {};
    for (const b of [...data.bodyLogs].filter((x) => x.date < date).sort((a, b) => (a.date < b.date ? -1 : 1)))
      for (const [k, v] of Object.entries(b.values)) if (v) out[k as MeasureKey] = { v, date: b.date };
    return out;
  }, [data.bodyLogs, date]);

  const save = async () => {
    const clean = Object.fromEntries(Object.entries(values).filter(([, v]) => v && v > 0));
    if (Object.keys(clean).length === 0) {
      notify('Nothing to save', 'Enter at least one measurement.');
      return;
    }
    const now = nowIso();
    const entry: BodyEntry = { id: existing?.id ?? newId(), createdAt: existing?.createdAt ?? now, updatedAt: now, date, values: clean, notes: notes.trim() || undefined };
    await saveDoc('bodyLogs', entry);
    notify('Saved', `Measurements for ${formatDate(date)} saved.`);
  };

  const recent = [...data.bodyLogs].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);

  return (
    <>
      <DateBar date={date} onChange={onDate} />
      <Card>
        <Row style={{ alignItems: 'flex-start' }}>
          <View style={{ alignItems: 'center' }}>
            <MeasureGuide selected={focus} height={220} />
            <Muted style={{ width: 100, textAlign: 'center', fontSize: 11 }}>{MEASURES.find((m) => m.key === focus)?.help}</Muted>
          </View>
          <View style={{ flex: 1, marginLeft: space(2) }}>
            {MEASURES.map((m) => {
              const unit = measureUnit(m, settings.weightUnit, profile.lengthUnit);
              const prev = previous[m.key];
              const cur = values[m.key] ?? 0;
              return (
                <Pressable key={m.key} onPress={() => setFocus(m.key)}>
                  <Row style={{ justifyContent: 'space-between', paddingVertical: 3, backgroundColor: focus === m.key ? colors.accentSoft : 'transparent', borderRadius: 8, paddingHorizontal: 4 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>{m.label}</Text>
                      {prev ? (
                        <Text style={{ fontSize: 10, color: colors.textMuted }}>
                          last {formatNumber(prev.v)} {unit}
                          {cur ? '  ' : ''}
                        </Text>
                      ) : null}
                      {prev && cur ? <Delta diff={Math.round((cur - prev.v) * 10) / 10} pct={null} unit={unit} higherIsBetter={!m.lowerIsBetter} compact /> : null}
                    </View>
                    <View onTouchStart={() => setFocus(m.key)}>
                      <NumberInput width={72} value={cur} onChange={(v) => setValues((s) => ({ ...s, [m.key]: v }))} />
                    </View>
                    <Text style={{ width: 22, fontSize: 11, color: colors.textSecondary, marginLeft: 3 }}>{unit}</Text>
                  </Row>
                </Pressable>
              );
            })}
          </View>
        </Row>
        <Field placeholder="Notes (optional)" value={notes} onChangeText={setNotes} style={{ marginTop: space(2) }} />
        <Button title={existing ? 'Update measurements' : 'Save measurements'} onPress={save} />
        <Muted style={{ marginTop: space(2) }}>Leave a field at 0 to skip it. Tap a row to see where to measure.</Muted>
      </Card>

      {recent.length ? <SectionHeader>Recent entries</SectionHeader> : null}
      {recent.map((b) => (
        <Card key={b.id} style={{ paddingVertical: space(3) }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Pressable onPress={() => onDate(b.date)} style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: colors.accent }}>{formatDate(b.date)}</Text>
              <Muted>
                {MEASURES.filter((m) => b.values[m.key])
                  .map((m) => `${m.label} ${formatNumber(b.values[m.key]!)}${measureUnit(m, settings.weightUnit, profile.lengthUnit)}`)
                  .join(' · ')}
              </Muted>
            </Pressable>
            <Pressable
              accessibilityLabel="Delete entry"
              onPress={async () => {
                if (await confirm('Delete entry?', `Measurements from ${formatDate(b.date)} will be removed.`)) removeDoc('bodyLogs', b.id);
              }}
              style={{ paddingLeft: space(3) }}
            >
              <Text style={{ color: colors.textMuted }}>✕</Text>
            </Pressable>
          </Row>
        </Card>
      ))}
    </>
  );
}
