import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { useData } from '../../data/DataProvider';
import { ExercisePicker } from '../../components/ExercisePicker';
import { confirm } from '../../components/confirm';
import { colors, space } from '../../components/theme';
import { Button, Card, Chip, Empty, Field, Muted, NumberInput, Row, Screen, SectionHeader } from '../../components/ui';
import { addDays, isValidDateKey, todayKey, WEEKDAYS } from '../../lib/date';
import { newId } from '../../lib/id';
import { blankDay } from '../../lib/plan';
import { DEFAULT_PROGRESSION, PROGRESSION_OPTIONS } from '../../lib/progression';
import { planDayForDate } from '../../lib/schedule';
import { PlanDay, PlannedExercise, WorkoutPlan } from '../../types';

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const copy = list.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export default function PlanEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, savePlan, exerciseById, settings } = useData();
  const stored = data.plans.find((p) => p.id === id);
  const [draft, setDraft] = useState<WorkoutPlan | null>(stored ? JSON.parse(JSON.stringify(stored)) : null);
  const [dirty, setDirty] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | null>(null); // day id
  const [startDateText, setStartDateText] = useState(stored?.startDate ?? todayKey());

  useEffect(() => {
    if (!draft && stored) setDraft(JSON.parse(JSON.stringify(stored)));
  }, [stored, draft]);

  if (!draft) return <Screen><Empty title="Plan not found" /></Screen>;

  const update = (fn: (p: WorkoutPlan) => WorkoutPlan) => {
    setDraft((p) => (p ? fn(p) : p));
    setDirty(true);
  };
  const updateDay = (dayId: string, fn: (d: PlanDay) => PlanDay) =>
    update((p) => ({ ...p, days: p.days.map((d) => (d.id === dayId ? fn(d) : d)) }));
  const updateExercise = (dayId: string, peId: string, fn: (e: PlannedExercise) => PlannedExercise) =>
    updateDay(dayId, (d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === peId ? fn(e) : e)) }));

  const save = async () => {
    if (draft.isActive) {
      for (const other of data.plans) {
        if (other.id !== draft.id && other.isActive) await savePlan({ ...other, isActive: false });
      }
    }
    await savePlan(draft);
    setDirty(false);
    router.back();
  };

  const switchMode = (mode: WorkoutPlan['mode']) =>
    update((p) => {
      if (p.mode === mode) return p;
      let days = p.days;
      if (mode === 'weekly') {
        days = days.slice(0, 7);
        while (days.length < 7) days = [...days, blankDay('Rest', true)];
      }
      return { ...p, mode, days };
    });

  const todayIndex = planDayForDate(draft, todayKey())?.index;

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: dirty ? 'Edit plan •' : 'Edit plan',
          headerRight: () => <Button title="Save" small onPress={save} />,
        }}
      />
      <Field label="Plan name" value={draft.name} onChangeText={(name) => update((p) => ({ ...p, name }))} />

      <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: space(1) }}>Schedule type</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <Chip label="Weekly (Mon–Sun)" selected={draft.mode === 'weekly'} onPress={() => switchMode('weekly')} />
        <Chip label="Rotation (N-day cycle)" selected={draft.mode === 'cycle'} onPress={() => switchMode('cycle')} />
      </View>

      {draft.mode === 'cycle' ? (
        <Card>
          <Field
            label="Cycle start date (YYYY-MM-DD) — Day 1 falls on this date"
            value={startDateText}
            onChangeText={(t) => {
              setStartDateText(t);
              if (isValidDateKey(t)) update((p) => ({ ...p, startDate: t }));
            }}
          />
          <Muted>Today is Day {(todayIndex ?? 0) + 1}. Tap a day below to make it today's workout:</Muted>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: space(2) }}>
            {draft.days.map((d, i) => (
              <Chip
                key={d.id}
                label={`Day ${i + 1}`}
                selected={i === todayIndex}
                onPress={() => {
                  const start = addDays(todayKey(), -i);
                  setStartDateText(start);
                  update((p) => ({ ...p, startDate: start }));
                }}
              />
            ))}
          </View>
        </Card>
      ) : null}

      <Row style={{ justifyContent: 'space-between', marginVertical: space(2) }}>
        <Text style={{ color: colors.text, fontSize: 15 }}>Active plan (drives the Today screen)</Text>
        <Switch value={draft.isActive} onValueChange={(isActive) => update((p) => ({ ...p, isActive }))} />
      </Row>

      <SectionHeader>Days</SectionHeader>
      {draft.days.map((day, di) => (
        <Card key={day.id} style={day.isRest ? { backgroundColor: colors.restSoft, borderColor: colors.restSoft } : undefined}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: day.isRest ? colors.rest : colors.text }}>
              {draft.mode === 'weekly' ? WEEKDAYS[di] : `Day ${di + 1}`}
              {di === todayIndex ? '  · today' : ''}
            </Text>
            <Row>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Rest day</Text>
              <Switch
                value={day.isRest}
                onValueChange={(isRest) =>
                  updateDay(day.id, (d) => ({ ...d, isRest, label: isRest ? 'Rest' : d.label === 'Rest' ? 'Workout' : d.label }))
                }
              />
            </Row>
          </Row>

          {!day.isRest ? (
            <>
              <Field
                label="Workout name"
                value={day.label}
                placeholder="e.g. Push, Upper body, Legs"
                onChangeText={(label) => updateDay(day.id, (d) => ({ ...d, label }))}
                style={{ marginTop: space(2) }}
              />
              {day.exercises.map((pe, ei) => {
                const rule = pe.progression ?? DEFAULT_PROGRESSION;
                return (
                  <View
                    key={pe.id}
                    style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: space(3) }}
                  >
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, flexShrink: 1 }}>
                        {ei + 1}. {exerciseById(pe.exerciseId)?.name ?? 'Deleted exercise'}
                      </Text>
                      <Row>
                        <Button title="↑" small variant="ghost" onPress={() => updateDay(day.id, (d) => ({ ...d, exercises: move(d.exercises, ei, ei - 1) }))} />
                        <Button title="↓" small variant="ghost" onPress={() => updateDay(day.id, (d) => ({ ...d, exercises: move(d.exercises, ei, ei + 1) }))} />
                        <Button
                          title="✕"
                          small
                          variant="ghost"
                          onPress={() => updateDay(day.id, (d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== pe.id) }))}
                        />
                      </Row>
                    </Row>
                    <Row style={{ marginTop: space(2) }}>
                      <NumberInput label="Sets" width={64} decimal={false} value={pe.targetSets} onChange={(v) => updateExercise(day.id, pe.id, (e) => ({ ...e, targetSets: v }))} />
                      <NumberInput label="Reps" width={64} decimal={false} value={pe.targetReps} onChange={(v) => updateExercise(day.id, pe.id, (e) => ({ ...e, targetReps: v }))} />
                      <NumberInput label={`Weight (${settings.weightUnit})`} width={96} value={pe.targetWeight} onChange={(v) => updateExercise(day.id, pe.id, (e) => ({ ...e, targetWeight: v }))} />
                    </Row>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: space(3), marginBottom: space(1) }}>Progression</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {PROGRESSION_OPTIONS.map((o) => (
                        <Chip
                          key={o.value}
                          label={o.label}
                          selected={rule.type === o.value}
                          onPress={() => updateExercise(day.id, pe.id, (e) => ({ ...e, progression: { ...rule, type: o.value } }))}
                        />
                      ))}
                    </View>
                    <Muted>{PROGRESSION_OPTIONS.find((o) => o.value === rule.type)?.help}</Muted>
                    {rule.type === 'linear' || rule.type === 'double' ? (
                      <Row style={{ marginTop: space(2) }}>
                        <NumberInput
                          label={`+ ${settings.weightUnit}`}
                          width={72}
                          value={rule.weightIncrement}
                          onChange={(v) => updateExercise(day.id, pe.id, (e) => ({ ...e, progression: { ...rule, weightIncrement: v } }))}
                        />
                        {rule.type === 'double' ? (
                          <>
                            <NumberInput label="Min reps" width={72} decimal={false} value={rule.repMin} onChange={(v) => updateExercise(day.id, pe.id, (e) => ({ ...e, progression: { ...rule, repMin: v } }))} />
                            <NumberInput label="Max reps" width={72} decimal={false} value={rule.repMax} onChange={(v) => updateExercise(day.id, pe.id, (e) => ({ ...e, progression: { ...rule, repMax: v } }))} />
                          </>
                        ) : null}
                      </Row>
                    ) : null}
                  </View>
                );
              })}
              <Button title="+ Add exercise" variant="secondary" small onPress={() => setPickerFor(day.id)} style={{ marginTop: space(2) }} />
            </>
          ) : (
            <Muted>Rest and recover.</Muted>
          )}

          {draft.mode === 'cycle' ? (
            <Row style={{ marginTop: space(3), flexWrap: 'wrap' }}>
              <Button title="Move up" small variant="ghost" onPress={() => update((p) => ({ ...p, days: move(p.days, di, di - 1) }))} />
              <Button title="Move down" small variant="ghost" onPress={() => update((p) => ({ ...p, days: move(p.days, di, di + 1) }))} />
              <Button
                title="Remove day"
                small
                variant="danger"
                disabled={draft.days.length <= 1}
                onPress={async () => {
                  if (await confirm('Remove day?', `Day ${di + 1} will be removed from the rotation.`, 'Remove'))
                    update((p) => ({ ...p, days: p.days.filter((d) => d.id !== day.id) }));
                }}
              />
            </Row>
          ) : null}
        </Card>
      ))}

      {draft.mode === 'cycle' ? (
        <Row style={{ marginBottom: space(3) }}>
          <Button title="+ Training day" variant="secondary" style={{ flex: 1 }} onPress={() => update((p) => ({ ...p, days: [...p.days, blankDay('Workout')] }))} />
          <Button title="+ Rest day" variant="secondary" style={{ flex: 1 }} onPress={() => update((p) => ({ ...p, days: [...p.days, blankDay('Rest', true)] }))} />
        </Row>
      ) : null}

      <Button title="Save plan" onPress={save} />

      <ExercisePicker
        visible={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        onSelect={(exerciseId) => {
          const dayId = pickerFor;
          if (!dayId) return;
          updateDay(dayId, (d) => ({
            ...d,
            exercises: [
              ...d.exercises,
              { id: newId(), exerciseId, targetSets: 3, targetReps: 10, targetWeight: 0, progression: { ...DEFAULT_PROGRESSION } },
            ],
          }));
        }}
      />
    </Screen>
  );
}
