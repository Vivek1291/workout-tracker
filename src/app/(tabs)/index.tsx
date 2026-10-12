import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useData } from '../../data/DataProvider';
import { colors, space } from '../../components/theme';
import { Button, Card, Chip, Empty, Muted, Row, Screen, SectionHeader, Stat, Title } from '../../components/ui';
import { addDays, formatDate, formatShortDate, todayKey, WEEKDAYS_SHORT, weekdayIndex } from '../../lib/date';
import { lastWorkingSets, suggestTarget } from '../../lib/progression';
import { dayTitle, planDayForDate } from '../../lib/schedule';
import { createSession } from '../../lib/session';
import { formatNumber, summarizeSession } from '../../lib/stats';

export default function TodayScreen() {
  const { data, settings, exerciseById, saveSession } = useData();
  const today = todayKey();
  const plan = data.plans.find((p) => p.isActive);
  const scheduled = plan ? planDayForDate(plan, today) : null;
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const dayIndex = chosenIndex ?? scheduled?.index ?? 0;
  const day = plan?.days[dayIndex];

  const inProgress = data.sessions.find((s) => !s.finishedAt);
  const doneToday = data.sessions.filter((s) => s.date === today && s.finishedAt);

  const preview = useMemo(
    () =>
      day && !day.isRest
        ? day.exercises.map((pe) => ({
            pe,
            name: exerciseById(pe.exerciseId)?.name ?? 'Deleted exercise',
            s: suggestTarget(pe, lastWorkingSets(data.sessions, pe.exerciseId)),
          }))
        : [],
    [day, data.sessions, exerciseById],
  );

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
      title: withPlanDay && plan ? dayTitle(plan, dayIndex) : 'Freestyle workout',
    });
    await saveSession(session);
    router.push(`/workout/${session.id}`);
  };

  return (
    <Screen>
      <Muted>{formatDate(today)}</Muted>
      <Title>{plan ? dayTitle(plan, scheduled?.index ?? 0) : 'Ready to train?'}</Title>

      {inProgress ? (
        <Card style={{ borderColor: colors.accent, borderWidth: 1 }}>
          <Text style={{ fontWeight: '600', color: colors.text }}>Workout in progress: {inProgress.title}</Text>
          <Muted>Started {formatShortDate(inProgress.date)}</Muted>
          <Button title="Resume workout" onPress={() => router.push(`/workout/${inProgress.id}`)} style={{ marginTop: space(3) }} />
        </Card>
      ) : null}

      {!plan ? (
        <Empty
          title="No active plan"
          body="Create a weekly or rotating plan and mark it active — or just start a freestyle workout."
          action={<Button title="Create a plan" onPress={() => router.push('/plans')} />}
        />
      ) : (
        <>
          <SectionHeader>Choose today's workout</SectionHeader>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {plan.days.map((d, i) => (
              <Chip
                key={d.id}
                label={`${plan.mode === 'weekly' ? WEEKDAYS_SHORT[i] : `D${i + 1}`} · ${d.isRest ? 'Rest' : d.label || 'Workout'}${i === scheduled?.index ? ' ★' : ''}`}
                selected={i === dayIndex}
                color={d.isRest ? colors.rest : colors.accent}
                onPress={() => setChosenIndex(i)}
              />
            ))}
          </View>
          <Muted style={{ marginBottom: space(3) }}>★ = scheduled for today. Pick another day to swap workouts.</Muted>

          {day?.isRest ? (
            <Card style={{ backgroundColor: colors.restSoft, borderColor: colors.restSoft }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.rest }}>Rest day 😴</Text>
              <Muted>Recover well. You can still log a freestyle session if you want.</Muted>
            </Card>
          ) : (
            <Card>
              {preview.length === 0 ? (
                <Muted>This day has no exercises yet. Edit the plan to add some.</Muted>
              ) : (
                preview.map(({ pe, name, s }) => (
                  <View key={pe.id} style={{ paddingVertical: space(2), borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, flexShrink: 1 }}>{name}</Text>
                      <Text style={{ color: colors.text, fontVariant: ['tabular-nums'] }}>
                        {s.sets} × {s.reps} @ {s.weight} {settings.weightUnit}
                      </Text>
                    </Row>
                    <Muted>{s.reason}</Muted>
                  </View>
                ))
              )}
              <Button
                title={inProgress ? 'Resume current workout' : 'Start workout'}
                onPress={() => start(true)}
                style={{ marginTop: space(4) }}
              />
            </Card>
          )}

          <SectionHeader>Next 7 days</SectionHeader>
          <Card>
            {Array.from({ length: 7 }, (_, i) => addDays(today, i + 1)).map((date) => {
              const r = planDayForDate(plan, date);
              return (
                <Row key={date} style={{ justifyContent: 'space-between', paddingVertical: space(1.5) }}>
                  <Text style={{ color: colors.textSecondary, width: 90 }}>
                    {WEEKDAYS_SHORT[weekdayIndex(date)]} {formatShortDate(date)}
                  </Text>
                  <Text style={{ color: r?.day.isRest ? colors.rest : colors.text, fontWeight: '500' }}>
                    {r ? (r.day.isRest ? 'Rest' : r.day.label || 'Workout') : '—'}
                  </Text>
                </Row>
              );
            })}
          </Card>
        </>
      )}

      <Button title="Start freestyle workout" variant="secondary" onPress={() => start(false)} style={{ marginTop: space(3) }} />

      {doneToday.length > 0 ? (
        <>
          <SectionHeader>Completed today</SectionHeader>
          {doneToday.map((s) => {
            const sum = summarizeSession(s);
            return (
              <Pressable key={s.id} onPress={() => router.push(`/workout/${s.id}`)}>
                <Card>
                  <Text style={{ fontWeight: '600', color: colors.text }}>{s.title}</Text>
                  <Row>
                    <Stat label="Sets" value={String(sum.sets)} />
                    <Stat label="Reps" value={String(sum.reps)} />
                    <Stat label={`Volume (${settings.weightUnit})`} value={formatNumber(sum.volume)} />
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
