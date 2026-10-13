import { router } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { initials, Logo } from '../components/Brand';
import { notify } from '../components/confirm';
import { colors, space } from '../components/theme';
import { Button, Card, Chip, Field, Muted, NumberInput, Row, Screen, SectionHeader, Segmented, styles } from '../components/ui';
import { useData } from '../data/DataProvider';
import { nowIso } from '../lib/id';
import { ACTIVITY, currentWeightKg, GOALS, targets } from '../lib/nutrition';
import { Profile } from '../types';

export default function ProfileScreen() {
  const { profile, saveDoc, data, settings, updateSettings } = useData();
  const [p, setP] = useState<Profile>(profile);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));

  const weight = currentWeightKg(p, data.bodyLogs, settings.weightUnit);
  const t = targets(p, weight, false);
  const loggedWeight = weight !== p.weightKg;

  const save = async () => {
    await saveDoc('profile', { ...p, name: p.name.trim(), updatedAt: nowIso() });
    notify('Profile saved', 'Your targets have been updated.');
    router.back();
  };

  return (
    <Screen>
      <Row style={{ marginBottom: space(3) }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.accent }}>
          <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 22 }}>{initials(p.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{p.name || 'Your profile'}</Text>
          <Muted>Used to calculate calorie, protein and water targets.</Muted>
        </View>
        <Logo size={36} />
      </Row>

      <Field label="Name" value={p.name} onChangeText={(v) => set('name', v)} placeholder="Your name" />
      <Text style={styles.label}>Sex (for the BMR formula)</Text>
      <Segmented<Profile['sex']>
        options={[
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
        ]}
        value={p.sex}
        onChange={(v) => set('sex', v)}
      />
      <Row style={{ flexWrap: 'wrap', marginBottom: space(3) }}>
        <NumberInput label="Age" width={80} decimal={false} value={p.age} onChange={(v) => set('age', v)} />
        <NumberInput label="Height (cm)" width={100} value={p.heightCm} onChange={(v) => set('heightCm', v)} />
        <NumberInput label="Weight (kg)" width={100} value={p.weightKg} onChange={(v) => set('weightKg', v)} />
      </Row>
      {loggedWeight ? <Muted style={{ marginBottom: space(2) }}>Targets use your latest logged body weight ({weight} kg) from Body measurements.</Muted> : null}

      <Text style={styles.label}>Activity level</Text>
      {ACTIVITY.map((a) => (
        <Chip key={a.value} label={`${a.label} — ${a.help}`} selected={p.activity === a.value} onPress={() => set('activity', a.value)} />
      ))}
      <Text style={[styles.label, { marginTop: space(2) }]}>Goal</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {GOALS.map((g) => (
          <Chip key={g.value} label={`${g.label} (${g.help})`} selected={p.goal === g.value} onPress={() => set('goal', g.value)} />
        ))}
      </View>

      <SectionHeader>Your daily targets</SectionHeader>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Muted>BMR (at rest)</Muted>
          <Text style={{ color: colors.text }}>{t.bmr} kcal</Text>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Muted>Maintenance (with activity)</Muted>
          <Text style={{ color: colors.text }}>{t.tdee} kcal</Text>
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: space(1) }}>
          <Text style={{ fontWeight: '700', color: colors.text }}>Calories</Text>
          <Text style={{ fontWeight: '700', color: colors.text }}>{t.kcal} kcal</Text>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Muted>Protein · Carbs · Fat</Muted>
          <Text style={{ color: colors.text }}>
            {t.protein} g · {t.carbs} g · {t.fat} g
          </Text>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Muted>Water</Muted>
          <Text style={{ color: colors.text }}>{(t.waterMl / 1000).toFixed(2)} L (+0.5 L on workout days)</Text>
        </Row>
        <Muted style={{ marginTop: space(2) }}>
          Calculated with Mifflin-St Jeor × activity, {GOALS.find((g) => g.value === p.goal)?.label.toLowerCase()} adjustment, {GOALS.find((g) => g.value === p.goal)?.proteinPerKg} g protein per kg and 35 ml water per kg. Override any of them below
          (0 = use the calculated value).
        </Muted>
        <Row style={{ flexWrap: 'wrap', marginTop: space(2) }}>
          <NumberInput label="Calories override" width={120} decimal={false} value={p.kcalTarget ?? 0} onChange={(v) => set('kcalTarget', v || undefined)} />
          <NumberInput label="Protein override (g)" width={130} decimal={false} value={p.proteinTarget ?? 0} onChange={(v) => set('proteinTarget', v || undefined)} />
          <NumberInput label="Water override (ml)" width={130} decimal={false} value={p.waterTargetMl ?? 0} onChange={(v) => set('waterTargetMl', v || undefined)} />
        </Row>
      </Card>

      <SectionHeader>Units</SectionHeader>
      <Row style={{ flexWrap: 'wrap' }}>
        <Text style={[styles.label, { width: 120 }]}>Body measurements</Text>
        <Chip label="cm" selected={p.lengthUnit === 'cm'} onPress={() => set('lengthUnit', 'cm')} />
        <Chip label="inches" selected={p.lengthUnit === 'in'} onPress={() => set('lengthUnit', 'in')} />
      </Row>
      <Row style={{ flexWrap: 'wrap' }}>
        <Text style={[styles.label, { width: 120 }]}>Lifting & body weight</Text>
        {(['kg', 'lb'] as const).map((u) => (
          <Chip key={u} label={u} selected={settings.weightUnit === u} onPress={() => updateSettings({ ...settings, weightUnit: u })} />
        ))}
      </Row>

      <Button title="Save profile" onPress={save} style={{ marginTop: space(4) }} />
      <Button title="Settings & data (backup, storage)" variant="ghost" onPress={() => router.push('/settings')} style={{ marginTop: space(2) }} />
    </Screen>
  );
}
