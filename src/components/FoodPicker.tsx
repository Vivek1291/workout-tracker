import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../data/DataProvider';
import { newId, nowIso } from '../lib/id';
import { gramsFor, nutrientsFor, unitsFor } from '../lib/nutrition';
import { formatNumber } from '../lib/stats';
import { Food, FOOD_CATEGORIES, FoodCategory, FoodEntry, Meal, MEALS } from '../types';
import { MACRO_COLORS } from './NutritionVisuals';
import { colors, space } from './theme';
import { Button, Card, Chip, Field, Muted, NumberInput, Row, Segmented, styles } from './ui';

type Step = { kind: 'list' } | { kind: 'amount'; food: Food } | { kind: 'form'; food?: Food };

function MacroLine({ kcal, protein, carbs, fat }: { kcal: number; protein: number; carbs: number; fat: number }) {
  return (
    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
      <Text style={{ color: colors.text, fontWeight: '700' }}>{formatNumber(kcal)} kcal</Text>
      {'  '}
      <Text style={{ color: MACRO_COLORS.protein }}>P</Text> {formatNumber(protein)}g{'  '}
      <Text style={{ color: MACRO_COLORS.carbs }}>C</Text> {formatNumber(carbs)}g{'  '}
      <Text style={{ color: MACRO_COLORS.fat }}>F</Text> {formatNumber(fat)}g
    </Text>
  );
}

/** Create or edit a food. Nutrition is entered per portion (e.g. per 1 bowl of 150 g) — easier than per 100 g. */
function FoodForm({ initial, initialName, onSaved, onCancel }: { initial?: Food; initialName?: string; onSaved: (f: Food) => void; onCancel: () => void }) {
  const { saveDoc } = useData();
  const first = initial?.portions[0];
  const portionGrams = first?.grams ?? 100;
  const per = (v: number) => Math.round(((v * portionGrams) / 100) * 10) / 10;
  const [name, setName] = useState(initial?.name ?? initialName ?? '');
  const [category, setCategory] = useState<FoodCategory>(initial?.category ?? 'Other');
  const [basis, setBasis] = useState<'g' | 'ml'>(initial?.basis ?? 'g');
  const [portionName, setPortionName] = useState(first?.name ?? 'bowl');
  const [grams, setGrams] = useState(portionGrams);
  const [kcal, setKcal] = useState(initial ? per(initial.per100.kcal) : 0);
  const [protein, setProtein] = useState(initial ? per(initial.per100.protein) : 0);
  const [carbs, setCarbs] = useState(initial ? per(initial.per100.carbs) : 0);
  const [fat, setFat] = useState(initial ? per(initial.per100.fat) : 0);

  const save = async () => {
    const g = grams > 0 ? grams : 100;
    const to100 = (v: number) => Math.round(((v * 100) / g) * 10) / 10;
    const now = nowIso();
    const pName = portionName.trim() || 'serving';
    const otherPortions = (initial?.portions ?? []).slice(1).filter((p) => p.name !== pName);
    const food: Food = {
      id: initial?.id ?? newId(),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
      name: name.trim(),
      category,
      basis,
      per100: { kcal: Math.round(to100(kcal)), protein: to100(protein), carbs: to100(carbs), fat: to100(fat) },
      portions: [{ name: pName, grams: g }, ...otherPortions],
      builtIn: initial?.builtIn,
    };
    await saveDoc('foods', food);
    onSaved(food);
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <Field label="Food name" value={name} onChangeText={setName} placeholder="e.g. Mom's rajma" autoFocus={!initial} />
      <Text style={styles.label}>Category</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {FOOD_CATEGORIES.map((c) => (
          <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
        ))}
      </View>
      <Text style={styles.label}>Measured in</Text>
      <Segmented<'g' | 'ml'>
        options={[
          { value: 'g', label: 'Grams (solid)' },
          { value: 'ml', label: 'Millilitres (liquid)' },
        ]}
        value={basis}
        onChange={setBasis}
      />
      <Row style={{ alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Field label="Portion name" value={portionName} onChangeText={setPortionName} placeholder="bowl, piece, glass…" />
        </View>
        <View style={{ marginBottom: space(3) }}>
          <NumberInput label={`1 portion = ? ${basis}`} width={110} value={grams} onChange={setGrams} />
        </View>
      </Row>
      <Text style={styles.label}>Nutrition in 1 {portionName || 'portion'}</Text>
      <Row style={{ flexWrap: 'wrap', marginBottom: space(3) }}>
        <NumberInput label="Calories" width={80} value={kcal} onChange={setKcal} />
        <NumberInput label="Protein g" width={80} value={protein} onChange={setProtein} />
        <NumberInput label="Carbs g" width={80} value={carbs} onChange={setCarbs} />
        <NumberInput label="Fat g" width={80} value={fat} onChange={setFat} />
      </Row>
      <Muted style={{ marginBottom: space(3) }}>Tip: the label on packets usually lists values per serving or per 100 g (enter 100 as the portion size).</Muted>
      <Row>
        <Button title={initial ? 'Save food' : 'Create food'} disabled={!name.trim()} onPress={save} style={{ flex: 1 }} />
        <Button title="Cancel" variant="secondary" onPress={onCancel} style={{ flex: 1 }} />
      </Row>
    </ScrollView>
  );
}

/** Modal to search the food list, pick an amount and log it. */
export function FoodPicker({
  visible,
  date,
  meal: initialMeal,
  onClose,
}: {
  visible: boolean;
  date: string;
  meal: Meal;
  onClose: () => void;
}) {
  const { data, saveDoc } = useData();
  const [step, setStep] = useState<Step>({ kind: 'list' });
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FoodCategory | 'Recent' | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('');
  const [meal, setMeal] = useState<Meal>(initialMeal);

  React.useEffect(() => {
    if (visible) {
      setMeal(initialMeal);
      setStep({ kind: 'list' });
      setQuery('');
    }
  }, [visible, initialMeal]);

  const recentIds = useMemo(() => {
    const seen: string[] = [];
    for (const f of [...data.foodLogs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))) {
      if (!seen.includes(f.foodId)) seen.push(f.foodId);
      if (seen.length >= 15) break;
    }
    return seen;
  }, [data.foodLogs]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let foods = data.foods;
    if (category === 'Recent') foods = recentIds.map((id) => data.foods.find((f) => f.id === id)).filter((f): f is Food => !!f);
    else if (category) foods = foods.filter((f) => f.category === category);
    if (q) foods = foods.filter((f) => f.name.toLowerCase().includes(q));
    return category === 'Recent' ? foods : [...foods].sort((a, b) => a.name.localeCompare(b.name));
  }, [data.foods, query, category, recentIds]);

  const choose = (food: Food) => {
    const last = [...data.foodLogs].reverse().find((f) => f.foodId === food.id);
    const units = unitsFor(food);
    setUnit(last && units.includes(last.unit) ? last.unit : units[0]);
    setQuantity(last?.quantity ?? 1);
    setStep({ kind: 'amount', food });
  };

  const add = async (food: Food) => {
    const grams = gramsFor(food, quantity, unit);
    const n = nutrientsFor(food, grams);
    const now = nowIso();
    const entry: FoodEntry = { id: newId(), createdAt: now, updatedAt: now, date, meal, foodId: food.id, foodName: food.name, quantity, unit, grams, ...n };
    await saveDoc('foodLogs', entry);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ padding: space(4), flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
          <Row style={{ justifyContent: 'space-between', marginBottom: space(3) }}>
            <Text style={styles.title}>{step.kind === 'form' ? (step.food ? 'Edit food' : 'New food') : 'Add food'}</Text>
            <Button title="Close" variant="ghost" small onPress={onClose} />
          </Row>

          {step.kind === 'list' ? (
            <>
              <View style={{ flexShrink: 0 }}>
                <Field placeholder="Search foods… (roti, dal, eggs, whey)" value={query} onChangeText={setQuery} autoFocus />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
                  <Chip label="All" selected={!category} onPress={() => setCategory(null)} />
                  {recentIds.length ? <Chip label="Recent" selected={category === 'Recent'} onPress={() => setCategory('Recent')} /> : null}
                  {FOOD_CATEGORIES.map((c) => (
                    <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(category === c ? null : c)} />
                  ))}
                </ScrollView>
                <Button title={query.trim() ? `+ Create "${query.trim()}"` : '+ Create your own food'} variant="secondary" small onPress={() => setStep({ kind: 'form' })} style={{ marginBottom: space(2), alignSelf: 'flex-start' }} />
              </View>
              <FlatList
                style={{ flex: 1 }}
                data={list}
                keyExtractor={(f) => f.id}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={<Muted>No foods match. Create it with the button above.</Muted>}
                renderItem={({ item }) => {
                  const p = item.portions[0];
                  const n = nutrientsFor(item, p?.grams ?? 100);
                  return (
                    <Pressable onPress={() => choose(item)} style={({ pressed }) => ({ paddingVertical: space(2.5), borderBottomWidth: 1, borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 })}>
                      <Text style={{ fontSize: 15, color: colors.text }}>{item.name}</Text>
                      <Muted>
                        1 {p?.name ?? '100 g'} ({p?.grams ?? 100} {item.basis}) · {n.kcal} kcal · P {formatNumber(n.protein)}g
                      </Muted>
                    </Pressable>
                  );
                }}
              />
            </>
          ) : step.kind === 'amount' ? (
            <ScrollView keyboardShouldPersistTaps="handled">
              <Card>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{step.food.name}</Text>
                <Muted>{step.food.category}</Muted>
                <Text style={[styles.label, { marginTop: space(3) }]}>How much?</Text>
                <Row style={{ alignItems: 'flex-start' }}>
                  <NumberInput width={90} value={quantity} onChange={setQuantity} />
                  <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
                    {unitsFor(step.food).map((u) => {
                      const portion = step.food.portions.find((p) => p.name === u);
                      return <Chip key={u} label={portion ? `${u} (${portion.grams}${step.food.basis})` : u} selected={unit === u} onPress={() => setUnit(u)} />;
                    })}
                  </View>
                </Row>
                <Row style={{ flexWrap: 'wrap', marginTop: space(1) }}>
                  {[0.5, 1, 1.5, 2, 3].map((q) => (
                    <Chip key={q} label={`×${q}`} selected={quantity === q} onPress={() => setQuantity(q)} />
                  ))}
                </Row>
                <Text style={[styles.label, { marginTop: space(2) }]}>Meal</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {MEALS.map((m) => (
                    <Chip key={m.value} label={`${m.icon} ${m.label}`} selected={meal === m.value} onPress={() => setMeal(m.value)} />
                  ))}
                </View>
                <View style={{ backgroundColor: colors.bg, borderRadius: 10, padding: space(3), marginTop: space(2) }}>
                  <Muted>
                    {formatNumber(quantity)} {unit} = {formatNumber(gramsFor(step.food, quantity, unit))} {step.food.basis}
                  </Muted>
                  <MacroLine {...nutrientsFor(step.food, gramsFor(step.food, quantity, unit))} />
                </View>
                <Button title={`Add to ${MEALS.find((m) => m.value === meal)?.label}`} onPress={() => add(step.food)} disabled={quantity <= 0} style={{ marginTop: space(3) }} />
              </Card>
              <Row>
                <Button title="← Back" variant="ghost" small onPress={() => setStep({ kind: 'list' })} />
                <Button title="Edit this food's values" variant="ghost" small onPress={() => setStep({ kind: 'form', food: step.food })} />
              </Row>
              <Muted>Built-in values are approximate averages for home-style cooking; edit them to match your recipe or packet label.</Muted>
            </ScrollView>
          ) : (
            <FoodForm
              initial={step.food}
              initialName={query.trim()}
              onSaved={(f) => choose(f)}
              onCancel={() => setStep(step.food ? { kind: 'amount', food: step.food } : { kind: 'list' })}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
