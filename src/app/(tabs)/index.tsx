import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useData } from '../../data/DataProvider';
import { colors, space } from '../../components/theme';
import { Button, Card, Chip, Muted, Row, SectionHeader, Screen, Stat, Title } from '../../components/ui';
import { addDays, formatDate, todayKey, WEEKDAYS_SHORT, weekdayIndex } from '../../lib/date';
import { newPlan } from '../../lib/plan';
import { lastWorkingSets, Suggestion, suggestTarget } from '../../lib/progression';
import { ExerciseImage } from '../../components/ExerciseImage';
import { PlannedExercise } from '../../types';
import { dayTitle, planDayForDate } from '../../lib/schedule';
import { createSession } from '../../lib/session';
import { formatNumber, summarizeSession } from '../../lib/stats';

/** "3 × 8–10 reps · 40 kg", or "3 × 20–40 s" for timed holds. */
function targetText(pe: PlannedExercise, s: Suggestion, timed: boolean, unit: string): string {
  const rule = pe.progression;
  const isRange = rule?.type === 'double' && rule.repMin !== rule.repMax;
  // Before any history, show the planned range; afterwards show today's suggested reps.
  const reps = isRange && s.reason.startsWith('First time') ? `${rule.repMin}–${rule.repMax}` : String(s.reps);
  const weight = s.weight > 0 ? ` @ ${s.weight} ${unit}` : '';
  return `${s.sets} × ${reps} ${timed ? 's' : 'reps'}${weight}`;
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <Row style={{ alignItems: 'flex-start', marginBottom: space(3) }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.accent, fontWeight: '700' }}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '600', color: colors.text }}>{title}</Text>
        <Muted>{body}</Muted>
      </View>
    </Row>
  );
}

export default function TodayScreen() {
  const { data, settings, exerciseById, saveSession, savePlan } = useData();
  const today = todayKey();
  const plan = data.plans.find((p) => p.isActive);
  const scheduled = plan ? planDayForDate(plan, today) : null;
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const [showOtherDays, setShowOtherDays] = useState(false);
  const dayIndex = chosenIndex ?? scheduled?.index ?? 0;
  const day = plan?.days[dayIndex];
  const unit = settings.weightUnit;

  const inProgress = data.sessions.find((s) => !s.finishedAt);
  const doneToday = data.sessions.filter((s) => s.date === today && s.finishedAt);

  const preview = useMemo(
    () =>
      day && !day.isRest
        ? day.exercises.map((pe) => ({
            pe,
            ex: exerciseById(pe.exerciseId),
            name: exerciseById(pe.exerciseId)?.name ?? 'Deleted exercise',
            s: suggestTarget(pe, lastWorkingSets(data.sessions, pe.exerciseId)),
          }))
        : [],
    [day, data.sessions, exerciseById],
  );

  // Mon–Sun of the current week.
  const weekStart = addDays(today, -weekdayIndex(today));
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const planned = plan ? planDayForDate(plan, date)?.day : undefined;
    const trained = data.sessions.some((s) => s.date === date && s.finishedAt);
    return { date, planned, trained };
  });
  const plannedThisWeek = week.filter((d) => d.planned && !d.planned.isRest).length;
  const trainedThisWeek = week.filter((d) => d.trained).length;

  const start = async (withPlanDay: boolean) => {
    if (inProgress) {
      router.push(`/workout/${inProgress.id}`);
      return;
    }
    const session = createSession({
      date: today,
      sessions: data.sessions,
      plan: withPlanDay ? plan : undefined,
      day: withPlanDay ? day : undefined,
      title: withPlanDay && plan ? dayTitle(plan, dayIndex) : 'Quick workout',
    });
    await saveSession(session);
    router.push(`/workout/${session.id}`);
  };

  const createFirstPlan = async () => {
    const p = { ...newPlan('weekly'), isActive: true };
    await savePlan(p);
    router.push(`/plan/${p.id}`);
  };

  return (
    <Screen>
      <Muted>{formatDate(today)}</Muted>
      <Title>{!plan ? 'Welcome 👋' : scheduled?.day.isRest ? 'Rest day' : `Today: ${scheduled?.day.label || 'Workout'}`}</Title>

      {inProgress ? (
        <Pressable onPress={() => router.push(`/workout/${inProgress.id}`)}>
          <Card style={{ backgroundColor: colors.accent, borderColor: colors.accent }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>▶ Workout in progress</Text>
            <Text style={{ color: '#fff', opacity: 0.9, marginTop: 2 }}>
              {inProgress.title} · {summarizeSession(inProgress).sets} sets done — tap to continue
            </Text>
          </Card>
        </Pressable>
      ) : null}

      {!plan ? (
        <Card>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: space(3) }}>Get started in 3 steps</Text>
          <Step n={1} title="Create your plan" body="Pick a workout or a rest day for each day of the week." />
          <Step n={2} title="Add exercises to each day" body="Set the sets, reps and weight you're aiming for." />
          <Step n={3} title="Come back here and tap Start" body="Log each set. Next time the app suggests how much to lift." />
          <Button title="Create my weekly plan" onPress={createFirstPlan} />
          <Button title="Or just log a quick workout" variant="ghost" onPress={() => start(false)} style={{ marginTop: space(2) }} />
        </Card>
      ) : (
        <>
          {/* This week at a glance */}
          <Card>
            <Row style={{ justifyContent: 'space-between', marginBottom: space(3) }}>
              <Text style={{ fontWeight: '700', color: colors.text }}>This week</Text>
              <Muted>
                {trainedThisWeek} of {plannedThisWeek} workouts done
              </Muted>
            </Row>
            <Row style={{ justifyContent: 'space-between', gap: 0 }}>
              {week.map(({ date, planned, trained }, i) => {
                const isToday = date === today;
                const rest = planned?.isRest;
                return (
                  <View key={date} style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 11, color: isToday ? colors.accent : colors.textMuted, fontWeight: isToday ? '700' : '500' }}>
                      {WEEKDAYS_SHORT[i]}
                    </Text>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        marginVertical: 4,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: trained ? colors.success : rest ? colors.restSoft : colors.bg,
                        borderWidth: isToday ? 2 : 0,
                        borderColor: colors.accent,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: trained ? '#fff' : rest ? colors.rest : colors.textMuted }}>
                        {trained ? '✓' : rest ? 'R' : '•'}
                      </Text>
                    </View>
                    <Text numberOfLines={1} style={{ fontSize: 10, color: colors.textSecondary, maxWidth: 44 }}>
                      {planned ? (planned.isRest ? 'Rest' : planned.label || 'Workout') : ''}
                    </Text>
                  </View>
                );
              })}
            </Row>
          </Card>

          {/* Today's workout */}
          {day?.isRest ? (
            <Card style={{ backgroundColor: colors.restSoft, borderColor: colors.restSoft }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.rest }}>Rest & recover 😴</Text>
              <Muted>No workout planned today. Want to train anyway? Pick a workout below.</Muted>
            </Card>
          ) : (
            <Card>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{plan ? dayTitle(plan, dayIndex) : ''}</Text>
              {day?.focus ? <Muted>{day.focus}</Muted> : null}
              {chosenIndex !== null && chosenIndex !== scheduled?.index ? <Muted>Swapped in for today</Muted> : null}
              {preview.length === 0 ? (
                <View style={{ marginVertical: space(3) }}>
                  <Muted>No exercises in this workout yet.</Muted>
                  <Button title="Add exercises to this day" variant="secondary" small onPress={() => router.push(`/plan/${plan!.id}?day=${dayIndex}`)} style={{ marginTop: space(2), alignSelf: 'flex-start' }} />
                </View>
              ) : (
                <View style={{ marginTop: space(2) }}>
                  {preview.map(({ pe, ex, name, s }, i) => (
                    <Row key={pe.id} style={{ paddingVertical: space(2), borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' }}>
                      <ExerciseImage exercise={ex} size={44} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
                          {i + 1}. {name}
                        </Text>
                        <Text style={{ color: colors.text, fontVariant: ['tabular-nums'] }}>
                          {targetText(pe, s, ex?.measure === 'time', unit)}
                        </Text>
                        <Muted>
                          {pe.notes ? `${pe.notes} · ` : ''}
                          {s.reason}
                        </Muted>
                      </View>
                    </Row>
                  ))}
                </View>
              )}
              <Button
                title={inProgress ? 'Continue current workout' : '▶  Start workout'}
                onPress={() => start(true)}
                disabled={!inProgress && preview.length === 0}
                style={{ marginTop: space(4), paddingVertical: space(4) }}
              />
            </Card>
          )}

          <Pressable onPress={() => setShowOtherDays((v) => !v)} style={{ paddingVertical: space(2) }}>
            <Text style={{ color: colors.accent, fontWeight: '600' }}>
              {showOtherDays ? '▾' : '▸'} Do a different workout today
            </Text>
          </Pressable>
          {showOtherDays ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {plan.days.map((d, i) =>
                d.isRest ? null : (
                  <Chip
                    key={d.id}
                    label={`${plan.mode === 'weekly' ? WEEKDAYS_SHORT[i] : `Day ${i + 1}`}: ${d.label || 'Workout'}`}
                    selected={i === dayIndex}
                    onPress={() => setChosenIndex(i)}
                  />
                ),
              )}
              <Chip label="Quick workout (empty)" onPress={() => start(false)} />
            </View>
          ) : null}
        </>
      )}

      {doneToday.length > 0 ? (
        <>
          <SectionHeader>Done today ✅</SectionHeader>
          {doneToday.map((s) => {
            const sum = summarizeSession(s);
            return (
              <Pressable key={s.id} onPress={() => router.push(`/workout/${s.id}`)}>
                <Card>
                  <Text style={{ fontWeight: '600', color: colors.text }}>{s.title}</Text>
                  <Row>
                    <Stat label="Sets" value={String(sum.sets)} />
                    <Stat label="Reps" value={String(sum.reps)} />
                    <Stat label={`Volume (${unit})`} value={formatNumber(sum.volume)} />
                  </Row>
                </Card>
              </Pressable>
            );
          })}
        </>
      ) : null}
    </Screen>
  );
}
