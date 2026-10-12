import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../data/DataProvider';
import { newId, nowIso } from '../lib/id';
import { MUSCLE_GROUPS, MuscleGroup } from '../types';
import { ExerciseImage } from './ExerciseImage';
import { colors, space } from './theme';
import { Button, Chip, Field, Muted, styles } from './ui';

export function ExercisePicker({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (exerciseId: string) => void;
}) {
  const { data, saveExercise } = useData();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroup | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.exercises
      .filter((e) => (!group || e.muscleGroup === group) && (!q || e.name.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data.exercises, query, group]);

  const exactMatch = data.exercises.some((e) => e.name.toLowerCase() === query.trim().toLowerCase());

  const pick = (id: string) => {
    onSelect(id);
    setQuery('');
    onClose();
  };

  const createAndPick = async () => {
    const now = nowIso();
    const ex = { id: newId(), name: query.trim(), muscleGroup: group ?? 'Other', createdAt: now, updatedAt: now };
    await saveExercise(ex);
    pick(ex.id);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ padding: space(4), flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: space(3) }]}>
            <Text style={styles.title}>Choose exercise</Text>
            <Button title="Close" variant="ghost" small onPress={onClose} />
          </View>
          {/* Header must not shrink, or the list squeezes the search box under the chips. */}
          <View style={{ flexShrink: 0 }}>
            <Field placeholder="Search or type a new exercise…" value={query} onChangeText={setQuery} autoFocus />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }}>
              <Chip label="All" selected={!group} onPress={() => setGroup(null)} />
              {MUSCLE_GROUPS.map((g) => (
                <Chip key={g} label={g} selected={group === g} onPress={() => setGroup(group === g ? null : g)} />
              ))}
            </ScrollView>
            {query.trim() && !exactMatch ? (
              <Button
                title={`+ Create "${query.trim()}"${group ? ` (${group})` : ''}`}
                variant="secondary"
                onPress={createAndPick}
                style={{ marginBottom: space(3) }}
              />
            ) : null}
            <Muted style={{ marginBottom: space(1) }}>{list.length} exercises</Muted>
          </View>
          <FlatList
            style={{ flex: 1 }}
            data={list}
            keyExtractor={(e) => e.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Muted>No exercises match.</Muted>}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => pick(item.id)}
                style={({ pressed }) => ({
                  paddingVertical: space(2),
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View style={[styles.row, { gap: space(3) }]}>
                  <ExerciseImage exercise={item} size={48} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, color: colors.text }}>{item.name}</Text>
                    <Muted>{item.primaryMuscle ?? item.muscleGroup}</Muted>
                  </View>
                </View>
              </Pressable>
            )}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
