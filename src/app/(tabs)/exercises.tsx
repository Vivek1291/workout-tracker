import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useData } from '../../data/DataProvider';
import { confirm } from '../../components/confirm';
import { MuscleMap, PRIMARY, SECONDARY } from '../../components/MuscleMap';
import { colors, space } from '../../components/theme';
import { Button, Card, Chip, Field, Muted, Row, Screen, SectionHeader } from '../../components/ui';
import { newId, nowIso } from '../../lib/id';
import { Exercise, MUSCLE_GROUPS, MuscleGroup } from '../../types';

function ExerciseForm({ initial, onDone }: { initial?: Exercise; onDone: () => void }) {
  const { saveExercise } = useData();
  const [name, setName] = useState(initial?.name ?? '');
  const [group, setGroup] = useState<MuscleGroup>(initial?.muscleGroup ?? 'Chest');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [primary, setPrimary] = useState(initial?.primaryMuscle ?? '');
  const [secondary, setSecondary] = useState(initial?.secondaryMuscles ?? '');
  const [measure, setMeasure] = useState<'reps' | 'time'>(initial?.measure ?? 'reps');

  const save = async () => {
    if (!name.trim()) return;
    const now = nowIso();
    await saveExercise({
      id: initial?.id ?? newId(),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
      name: name.trim(),
      muscleGroup: group,
      primaryMuscle: primary.trim() || undefined,
      secondaryMuscles: secondary.trim() || undefined,
      measure: measure === 'time' ? 'time' : undefined,
      notes: notes.trim() || undefined,
    });
    onDone();
  };

  return (
    <Card style={{ borderColor: colors.accent, borderWidth: 1 }}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Cable Row" autoFocus />
      <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: space(1) }}>Muscle group</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {MUSCLE_GROUPS.map((g) => (
          <Chip key={g} label={g} selected={group === g} onPress={() => setGroup(g)} />
        ))}
      </View>
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Field label="Primary muscle" value={primary} onChangeText={setPrimary} placeholder="e.g. Upper chest" />
          <Field label="Secondary muscles" value={secondary} onChangeText={setSecondary} placeholder="e.g. Triceps, front delts" />
        </View>
        <View style={{ alignItems: 'center', paddingTop: space(4) }}>
          <MuscleMap exercise={{ name: name || 'exercise', muscleGroup: group, primaryMuscle: primary, secondaryMuscles: secondary }} size={110} legend />
        </View>
      </Row>
      <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: space(1) }}>Track</Text>
      <View style={{ flexDirection: 'row' }}>
        <Chip label="Reps" selected={measure === 'reps'} onPress={() => setMeasure('reps')} />
        <Chip label="Time (seconds)" selected={measure === 'time'} onPress={() => setMeasure('time')} />
      </View>
      <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Cues, machine settings…" />
      <Row>
        <Button title={initial ? 'Save' : 'Add exercise'} onPress={save} disabled={!name.trim()} style={{ flex: 1 }} />
        <Button title="Cancel" variant="secondary" onPress={onDone} style={{ flex: 1 }} />
      </Row>
    </Card>
  );
}

export default function ExercisesScreen() {
  const { data, deleteExercise } = useData();
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [query, setQuery] = useState('');

  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of data.sessions) for (const e of s.entries) m.set(e.exerciseId, (m.get(e.exerciseId) ?? 0) + 1);
    return m;
  }, [data.sessions]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = data.exercises.filter((e) => !q || e.name.toLowerCase().includes(q));
    return MUSCLE_GROUPS.map((g) => ({
      group: g,
      items: list.filter((e) => e.muscleGroup === g).sort((a, b) => a.name.localeCompare(b.name)),
    })).filter((g) => g.items.length > 0);
  }, [data.exercises, query]);

  const remove = async (ex: Exercise) => {
    const used = usage.get(ex.id) ?? 0;
    const inPlans = data.plans.some((p) => p.days.some((d) => d.exercises.some((e) => e.exerciseId === ex.id)));
    const warning =
      used || inPlans
        ? `It is used in ${used} workout(s)${inPlans ? ' and in a plan' : ''}; those entries will show as "Deleted exercise".`
        : 'This cannot be undone.';
    if (await confirm(`Delete ${ex.name}?`, warning)) deleteExercise(ex.id);
  };

  return (
    <Screen>
      {editing === 'new' ? (
        <ExerciseForm onDone={() => setEditing(null)} />
      ) : (
        <Button title="+ New exercise" onPress={() => setEditing('new')} style={{ marginBottom: space(3) }} />
      )}
      <Field placeholder="Search exercises…" value={query} onChangeText={setQuery} />
      <Muted style={{ marginBottom: space(1) }}>
        <Text style={{ color: PRIMARY, fontWeight: '700' }}>●</Text> primary muscle{'   '}
        <Text style={{ color: SECONDARY, fontWeight: '700' }}>●</Text> secondary muscles
      </Muted>
      {grouped.map(({ group, items }) => (
        <View key={group}>
          <SectionHeader>{group}</SectionHeader>
          {items.map((ex) =>
            editing === ex.id ? (
              <ExerciseForm key={ex.id} initial={ex} onDone={() => setEditing(null)} />
            ) : (
              <Card key={ex.id} style={{ paddingVertical: space(3) }}>
                <Row style={{ alignItems: 'flex-start' }}>
                  <MuscleMap exercise={ex} size={64} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{ex.name}</Text>
                    {ex.primaryMuscle ? (
                      <Text style={{ fontSize: 13, color: colors.text, marginTop: 2 }}>
                        <Text style={{ color: PRIMARY, fontWeight: '700' }}>● </Text>
                        {ex.primaryMuscle}
                      </Text>
                    ) : null}
                    {ex.secondaryMuscles ? (
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                        <Text style={{ color: SECONDARY, fontWeight: '700' }}>● </Text>
                        {ex.secondaryMuscles}
                      </Text>
                    ) : null}
                    <Muted style={{ marginTop: 2 }}>
                      {usage.get(ex.id) ? `Logged in ${usage.get(ex.id)} workout(s)` : 'Not logged yet'}
                      {ex.measure === 'time' ? ' · timed' : ''}
                      {ex.notes ? ` · ${ex.notes}` : ''}
                    </Muted>
                    <Row style={{ marginTop: space(1) }}>
                      <Button title="Edit" small variant="ghost" onPress={() => setEditing(ex.id)} style={{ paddingHorizontal: 0 }} />
                      <Button title="Delete" small variant="ghost" onPress={() => remove(ex)} />
                    </Row>
                  </View>
                </Row>
              </Card>
            ),
          )}
        </View>
      ))}
    </Screen>
  );
}
