import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useData } from '../../data/DataProvider';
import { ExercisePicker } from '../../components/ExercisePicker';
import { SetChart } from '../../components/SetChart';
import { ExerciseImage } from '../../components/ExerciseImage';
import { confirm } from '../../components/confirm';
import { colors, radius, space } from '../../components/theme';
import { Button, Card, Empty, Field, Muted, NumberInput, Row, Screen } from '../../components/ui';
import { formatDate, isValidDateKey } from '../../lib/date';
import { newId, nowIso } from '../../lib/id';
import { lastWorkingSets } from '../../lib/progression';
import { estimate1RM, formatNumber, summarizeSession } from '../../lib/stats';
import { SessionEntry, SET_TYPES, SetLog, WorkoutSession } from '../../types';

const SAVE_DELAY_MS = 600;

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, saveSession, deleteSession, exerciseById, settings } = useData();
  const stored = data.sessions.find((s) => s.id === id);
  const [session, setSession] = useState<WorkoutSession | null>(stored ?? null);
  const [picker, setPicker] = useState(false);
  const [dateText, setDateText] = useState(stored?.date ?? '');
  const pending = useRef<WorkoutSession | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleted = useRef(false);
  const [showDetails, setShowDetails] = useState(false);
  const [restStart, setRestStart] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  // Tick once a second while the rest timer is running.
  useEffect(() => {
    if (restStart === null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [restStart]);

  useEffect(() => {
    if (!session && stored) {
      setSession(stored);
      setDateText(stored.date);
    }
  }, [stored, session]);

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current && !deleted.current) saveSession(pending.current);
    pending.current = null;
  };

  // Save whatever is pending when leaving the screen.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => flush(), []);

  if (!session) return <Screen><Empty title="Workout not found" /></Screen>;

  const update = (fn: (s: WorkoutSession) => WorkoutSession) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      pending.current = next;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
      return next;
    });
  };
  const updateEntry = (entryId: string, fn: (e: SessionEntry) => SessionEntry) =>
    update((s) => ({ ...s, entries: s.entries.map((e) => (e.id === entryId ? fn(e) : e)) }));
  const updateSet = (entryId: string, setId: string, fn: (s: SetLog) => SetLog) =>
    updateEntry(entryId, (e) => ({ ...e, sets: e.sets.map((x) => (x.id === setId ? fn(x) : x)) }));

  const addExercise = (exerciseId: string) => {
    const last = lastWorkingSets(data.sessions, exerciseId, session.id);
    const sets: SetLog[] = last
      ? last.map((s) => ({ ...s, id: newId(), completed: false }))
      : [{ id: newId(), reps: 10, weight: 0, type: 'normal', completed: false }];
    update((s) => ({ ...s, entries: [...s.entries, { id: newId(), exerciseId, sets }] }));
  };

  const finish = async () => {
    const done = { ...session, finishedAt: session.finishedAt ?? nowIso() };
    pending.current = null;
    if (timer.current) clearTimeout(timer.current);
    setSession(done);
    await saveSession(done);
    router.back();
  };

  const remove = async () => {
    if (!(await confirm('Delete workout?', 'This workout and all its sets will be removed.'))) return;
    deleted.current = true;
    if (timer.current) clearTimeout(timer.current);
    await deleteSession(session.id);
    router.back();
  };

  const sum = summarizeSession(session);
  const plan = data.plans.find((p) => p.id === session.planId);
  const plannedById = new Map((plan?.days ?? []).flatMap((d) => d.exercises).map((pe) => [pe.id, pe]));
  const totalSets = session.entries.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = session.entries.reduce((a, e) => a + e.sets.filter((x) => x.completed).length, 0);
  const unit = settings.weightUnit;

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: session.finishedAt ? 'Workout log' : 'Workout',
          headerRight: () => <Button title={session.finishedAt ? 'Done' : 'Finish'} small onPress={finish} />,
        }}
      />
      <Pressable onPress={() => setShowDetails((v) => !v)}>
        <Row style={{ justifyContent: 'space-between', marginBottom: space(2) }}>
          <View style={{ flexShrink: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{session.title || 'Workout'}</Text>
            <Muted>{formatDate(session.date)}</Muted>
          </View>
          <Text style={{ color: colors.accent, fontWeight: '600' }}>{showDetails ? 'Hide' : 'Edit name/date'}</Text>
        </Row>
      </Pressable>
      {showDetails ? (
        <Card>
          <Field label="Workout name" value={session.title} onChangeText={(title) => update((s) => ({ ...s, title }))} />
          <Field
            label="Date (YYYY-MM-DD) — change it to log a past workout"
            value={dateText}
            onChangeText={(t) => {
              setDateText(t);
              if (isValidDateKey(t)) update((s) => ({ ...s, date: t }));
            }}
          />
        </Card>
      ) : null}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '600', color: colors.text }}>
            {doneSets} of {totalSets} sets done
          </Text>
          <Muted>
            {sum.reps} reps · {formatNumber(sum.volume)} {unit}
          </Muted>
        </Row>
        <View style={{ height: 8, backgroundColor: colors.bg, borderRadius: 4, marginTop: space(2), overflow: 'hidden' }}>
          <View style={{ height: 8, width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%`, backgroundColor: colors.success, borderRadius: 4 }} />
        </View>
      </Card>

      {restStart !== null && !session.finishedAt ? (
        <Pressable onPress={() => setRestStart(null)}>
          <Card style={{ backgroundColor: colors.accentSoft, borderColor: colors.accentSoft }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 16, fontVariant: ['tabular-nums'] }}>
                ⏱ Rest {formatTimer(now - restStart)}
              </Text>
              <Text style={{ color: colors.accent }}>Tap to hide</Text>
            </Row>
          </Card>
        </Pressable>
      ) : null}

      {session.entries.length === 0 ? (
        <Empty title="No exercises yet" body="Add an exercise to start logging sets." />
      ) : null}

      {session.entries.map((entry, ei) => {
        const ex = exerciseById(entry.exerciseId);
        const last = lastWorkingSets(data.sessions, entry.exerciseId, session.id);
        const planned = plannedById.get(entry.plannedExerciseId ?? '');
        const timed = ex?.measure === 'time';
        return (
          <Card key={entry.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row style={{ flexShrink: 1 }}>
                <ExerciseImage exercise={ex} size={52} />
                <View style={{ flexShrink: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{ex?.name ?? 'Deleted exercise'}</Text>
                  {ex?.primaryMuscle ? <Muted>{ex.primaryMuscle}</Muted> : null}
                </View>
              </Row>
              <Row>
                <Button
                  title="↑"
                  small
                  variant="ghost"
                  disabled={ei === 0}
                  onPress={() =>
                    update((s) => {
                      const entries = s.entries.slice();
                      [entries[ei - 1], entries[ei]] = [entries[ei], entries[ei - 1]];
                      return { ...s, entries };
                    })
                  }
                />
                <Button
                  title="✕"
                  small
                  variant="ghost"
                  onPress={async () => {
                    if (await confirm('Remove exercise?', `${ex?.name ?? 'This exercise'} and its sets will be removed from this workout.`, 'Remove'))
                      update((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== entry.id) }));
                  }}
                />
              </Row>
            </Row>
            {planned ? (
              <Text style={{ fontSize: 13, color: colors.text, marginTop: space(2) }}>
                🎯 Target: {planned.targetSets} ×{' '}
                {planned.progression?.type === 'double' && planned.progression.repMin !== planned.progression.repMax
                  ? `${planned.progression.repMin}–${planned.progression.repMax}`
                  : planned.targetReps}{' '}
                {timed ? 'seconds' : 'reps'}
                {planned.notes ? ` · ${planned.notes}` : ''}
              </Text>
            ) : null}
            <Muted>
              {last
                ? `Last time: ${last.map((s) => `${s.reps}${timed ? 's' : ''}×${s.weight}`).join(', ')} ${unit}`
                : 'First time logging this exercise'}
            </Muted>

            <Row style={{ marginTop: space(3) }}>
              <Text style={[headerCell, { width: 28 }]}>#</Text>
              <Text style={[headerCell, { width: 44 }]}>Type</Text>
              <Text style={[headerCell, { flex: 1 }]}>Weight ({unit})</Text>
              <Text style={[headerCell, { flex: 1 }]}>{timed ? 'Seconds' : 'Reps'}</Text>
              <Text style={[headerCell, { width: 40 }]}>Done</Text>
              <View style={{ width: 28 }} />
            </Row>
            {entry.sets.map((set, si) => {
              const typeMeta = SET_TYPES.find((t) => t.value === set.type) ?? SET_TYPES[0];
              return (
                <Row key={set.id} style={{ marginTop: space(2), opacity: set.completed ? 1 : 0.85 }}>
                  <Text style={{ width: 28, color: colors.textSecondary, textAlign: 'center' }}>{si + 1}</Text>
                  <Pressable
                    accessibilityLabel={`Set type ${typeMeta.label}, tap to change`}
                    onPress={() => {
                      const i = SET_TYPES.findIndex((t) => t.value === set.type);
                      const nextType = SET_TYPES[(i + 1) % SET_TYPES.length].value;
                      updateSet(entry.id, set.id, (x) => ({ ...x, type: nextType }));
                    }}
                    style={{
                      width: 44,
                      paddingVertical: space(2),
                      borderRadius: radius.sm,
                      backgroundColor: set.type === 'normal' ? colors.accentSoft : colors.restSoft,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: set.type === 'normal' ? colors.accent : colors.rest }}>
                      {typeMeta.short}
                    </Text>
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <NumberInput value={set.weight} onChange={(weight) => updateSet(entry.id, set.id, (x) => ({ ...x, weight }))} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <NumberInput decimal={false} value={set.reps} onChange={(reps) => updateSet(entry.id, set.id, (x) => ({ ...x, reps }))} />
                  </View>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: set.completed }}
                    onPress={() => {
                      if (!set.completed) {
                        setRestStart(Date.now());
                        setNow(Date.now());
                      }
                      updateSet(entry.id, set.id, (x) => ({ ...x, completed: !x.completed }));
                    }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radius.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: set.completed ? colors.success : colors.surface,
                      borderWidth: 1,
                      borderColor: set.completed ? colors.success : colors.border,
                    }}
                  >
                    <Text style={{ color: set.completed ? '#fff' : colors.textMuted, fontWeight: '700' }}>✓</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Delete set"
                    onPress={() => updateEntry(entry.id, (e) => ({ ...e, sets: e.sets.filter((x) => x.id !== set.id) }))}
                    style={{ width: 28, alignItems: 'center' }}
                  >
                    <Text style={{ color: colors.textMuted }}>✕</Text>
                  </Pressable>
                </Row>
              );
            })}
            {entry.sets.some((x) => x.reps > 0 || x.weight > 0) ? (
              <View style={{ marginTop: space(3) }}>
                <SetChart sets={entry.sets} unit={unit} timed={timed} compact />
              </View>
            ) : null}
            {entry.sets.some((s) => s.completed && s.type !== 'warmup') ? (
              <Muted style={{ marginTop: space(2) }}>
                Best est. 1RM today:{' '}
                {formatNumber(Math.max(...entry.sets.filter((s) => s.completed && s.type !== 'warmup').map((s) => estimate1RM(s.weight, s.reps))))}{' '}
                {unit}
              </Muted>
            ) : null}
            <Row style={{ marginTop: space(3), flexWrap: 'wrap' }}>
              <Button
                title="+ Set"
                small
                variant="secondary"
                onPress={() =>
                  updateEntry(entry.id, (e) => {
                    const prev = e.sets[e.sets.length - 1];
                    return {
                      ...e,
                      sets: [...e.sets, { id: newId(), reps: prev?.reps ?? 10, weight: prev?.weight ?? 0, type: prev?.type ?? 'normal', completed: false }],
                    };
                  })
                }
              />
              <Button
                title="+ Drop set"
                small
                variant="secondary"
                onPress={() =>
                  updateEntry(entry.id, (e) => {
                    const prev = e.sets[e.sets.length - 1];
                    const weight = Math.round((prev?.weight ?? 0) * 0.8 * 2) / 2;
                    return { ...e, sets: [...e.sets, { id: newId(), reps: prev?.reps ?? 10, weight, type: 'drop', completed: false }] };
                  })
                }
              />
              <Button
                title="Complete all"
                small
                variant="ghost"
                onPress={() => updateEntry(entry.id, (e) => ({ ...e, sets: e.sets.map((x) => ({ ...x, completed: true })) }))}
              />
            </Row>
            <Field
              placeholder="Notes (optional)"
              value={entry.notes ?? ''}
              onChangeText={(notes) => updateEntry(entry.id, (e) => ({ ...e, notes }))}
              style={{ marginTop: space(3), fontSize: 13 }}
            />
          </Card>
        );
      })}

      <Button title="+ Add exercise" variant="secondary" onPress={() => setPicker(true)} />
      <Muted style={{ marginTop: space(2) }}>
        Tap the type badge to switch between W (working), WU (warm-up, excluded from stats), D (drop set) and F (to failure).
      </Muted>
      <Field
        label="Workout notes"
        placeholder="How did it feel?"
        value={session.notes ?? ''}
        onChangeText={(notes) => update((s) => ({ ...s, notes }))}
        multiline
        style={{ minHeight: 60, marginTop: space(4) }}
      />

      <Button title={session.finishedAt ? 'Save & close' : 'Finish workout'} onPress={finish} style={{ marginTop: space(2) }} />
      <Button title="Delete workout" variant="danger" onPress={remove} style={{ marginTop: space(3) }} />

      <ExercisePicker visible={picker} onClose={() => setPicker(false)} onSelect={addExercise} />
    </Screen>
  );
}

function formatTimer(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const headerCell = { fontSize: 11, color: colors.textMuted, textAlign: 'center' as const, fontWeight: '600' as const };
