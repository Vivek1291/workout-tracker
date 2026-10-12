import React, { useMemo, useState } from 'react';
import { Image, Platform, Text, View } from 'react-native';
import { useData } from '../../data/DataProvider';
import { confirm, notify } from '../../components/confirm';
import { ExerciseImage } from '../../components/ExerciseImage';
import { MuscleMap, PRIMARY, SECONDARY } from '../../components/MuscleMap';
import { colors, space } from '../../components/theme';
import { Button, Card, Chip, Field, Muted, Row, Screen, SectionHeader, Segmented, styles } from '../../components/ui';
import { ALL_REGIONS, exerciseRegions, REGION_LABELS } from '../../lib/muscles';
import { pickExercisePhoto } from '../../lib/photo';
import { newId, nowIso } from '../../lib/id';
import { Exercise, MUSCLE_GROUPS, MuscleGroup, Region } from '../../types';

function ExerciseForm({ initial, onDone }: { initial?: Exercise; onDone: () => void }) {
  const { saveExercise } = useData();
  const [name, setName] = useState(initial?.name ?? '');
  const [group, setGroup] = useState<MuscleGroup>(initial?.muscleGroup ?? 'Chest');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [primary, setPrimary] = useState(initial?.primaryMuscle ?? '');
  const [secondary, setSecondary] = useState(initial?.secondaryMuscles ?? '');
  const [measure, setMeasure] = useState<'reps' | 'time'>(initial?.measure ?? 'reps');
  const [picture, setPicture] = useState<'diagram' | 'photo'>(initial?.picture ?? 'diagram');
  const [imageUri, setImageUri] = useState<string | undefined>(initial?.imageUri);
  const [busy, setBusy] = useState(false);
  // null = derive muscles from the text fields; otherwise picked by hand on the diagram.
  const [manual, setManual] = useState<{ primary: Region[]; secondary: Region[] } | null>(
    initial?.primaryRegions?.length || initial?.secondaryRegions?.length
      ? { primary: initial.primaryRegions ?? [], secondary: initial.secondaryRegions ?? [] }
      : null,
  );

  const preview = {
    name: name || 'exercise',
    muscleGroup: group,
    primaryMuscle: primary,
    secondaryMuscles: secondary,
    primaryRegions: manual?.primary,
    secondaryRegions: manual?.secondary,
  };
  const current = exerciseRegions(preview);

  /** Tap cycles a muscle: off → primary → secondary → off. */
  const cycleRegion = (r: Region) => {
    const base = manual ?? { primary: current.primary, secondary: current.secondary };
    let next;
    if (base.primary.includes(r)) next = { primary: base.primary.filter((x) => x !== r), secondary: [...base.secondary, r] };
    else if (base.secondary.includes(r)) next = { primary: base.primary, secondary: base.secondary.filter((x) => x !== r) };
    else next = { primary: [...base.primary, r], secondary: base.secondary };
    setManual(next);
  };

  const addPhoto = async (source: 'library' | 'camera') => {
    setBusy(true);
    try {
      const uri = await pickExercisePhoto(source);
      if (uri) {
        setImageUri(uri);
        setPicture('photo');
      }
    } catch (e) {
      notify('Could not add photo', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!name.trim()) return;
    const now = nowIso();
    const hasManual = !!manual && (manual.primary.length > 0 || manual.secondary.length > 0);
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
      picture: picture === 'photo' && imageUri ? 'photo' : 'diagram',
      imageUri,
      primaryRegions: hasManual ? manual!.primary : undefined,
      secondaryRegions: hasManual ? manual!.secondary : undefined,
    });
    onDone();
  };

  return (
    <Card style={{ borderColor: colors.accent, borderWidth: 1 }}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Cable Row" autoFocus />
      <Text style={styles.label}>Muscle group</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {MUSCLE_GROUPS.map((g) => (
          <Chip key={g} label={g} selected={group === g} onPress={() => setGroup(g)} />
        ))}
      </View>
      <Field label="Primary muscle" value={primary} onChangeText={setPrimary} placeholder="e.g. Upper chest" />
      <Field label="Secondary muscles" value={secondary} onChangeText={setSecondary} placeholder="e.g. Triceps, front delts" />

      <Text style={styles.label}>Picture</Text>
      <Segmented<'diagram' | 'photo'>
        options={[
          { value: 'diagram', label: 'Body diagram' },
          { value: 'photo', label: 'Photo' },
        ]}
        value={picture}
        onChange={setPicture}
      />

      {picture === 'diagram' ? (
        <View style={{ alignItems: 'center', marginBottom: space(3) }}>
          <MuscleMap exercise={preview} size={200} legend onPressRegion={cycleRegion} />
          <Muted style={{ textAlign: 'center', marginTop: space(2) }}>
            Tap a muscle to change it: once = primary, twice = secondary, three times = off.
          </Muted>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: space(2) }}>
            {ALL_REGIONS.map((r) => {
              const state = current.primary.includes(r) ? 'primary' : current.secondary.includes(r) ? 'secondary' : 'off';
              return (
                <Chip
                  key={r}
                  label={`${REGION_LABELS[r]}${state === 'primary' ? ' ●' : state === 'secondary' ? ' ○' : ''}`}
                  selected={state !== 'off'}
                  color={state === 'primary' ? PRIMARY : '#6f9fd8'}
                  onPress={() => cycleRegion(r)}
                />
              );
            })}
          </View>
          {manual ? (
            <Button title="Reset to automatic (from muscle text)" small variant="ghost" onPress={() => setManual(null)} />
          ) : (
            <Muted>Highlighted automatically from the muscle fields above.</Muted>
          )}
        </View>
      ) : (
        <View style={{ alignItems: 'center', marginBottom: space(3) }}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={{ width: 180, height: 180, borderRadius: 12 }} accessibilityLabel="Exercise photo" />
          ) : (
            <View style={{ width: 180, height: 180, borderRadius: 12, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border }}>
              <Muted>No photo yet</Muted>
            </View>
          )}
          <Row style={{ marginTop: space(3), flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button title={imageUri ? 'Change photo' : 'Upload photo'} small disabled={busy} onPress={() => addPhoto('library')} />
            {Platform.OS !== 'web' ? <Button title="Take photo" small variant="secondary" disabled={busy} onPress={() => addPhoto('camera')} /> : null}
            {imageUri ? <Button title="Remove" small variant="danger" onPress={() => setImageUri(undefined)} /> : null}
          </Row>
          <Muted style={{ textAlign: 'center', marginTop: space(2) }}>Photos are cropped square and shrunk to save space.</Muted>
        </View>
      )}

      <Text style={styles.label}>Track</Text>
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
                  <ExerciseImage exercise={ex} size={64} />
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
