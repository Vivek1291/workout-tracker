import React, { useState } from 'react';
import { Platform, Share, Text, View } from 'react-native';
import { useData } from '../data/DataProvider';
import { confirm, notify } from '../components/confirm';
import { colors, space } from '../components/theme';
import { Button, Card, Chip, Field, Muted, Row, Screen, SectionHeader } from '../components/ui';
import { todayKey } from '../lib/date';
import { Settings } from '../types';

export default function SettingsScreen() {
  const { data, settings, updateSettings, importData, storageName } = useData();
  const [draft, setDraft] = useState<Settings>(settings);
  const [importText, setImportText] = useState('');
  const [busy, setBusy] = useState(false);

  const json = JSON.stringify(data, null, 2);

  const exportData = async () => {
    if (Platform.OS === 'web') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workout-tracker-${todayKey()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      await Share.share({ message: json, title: 'Workout tracker data' });
    }
  };

  const doImport = async () => {
    try {
      const parsed = JSON.parse(importText);
      if (!(await confirm('Replace all data?', 'Your current exercises, plans and workouts will be replaced by the imported JSON.', 'Replace'))) return;
      await importData(parsed);
      setImportText('');
      notify('Import complete');
    } catch (e) {
      notify('Import failed', (e as Error).message);
    }
  };

  const applyStorage = async (copyData: boolean) => {
    setBusy(true);
    try {
      await updateSettings(draft, { copyData });
      notify('Storage updated', `Now using ${draft.storage === 'remote' ? draft.remoteUrl : 'on-device storage'}.`);
    } catch (e) {
      notify('Could not switch storage', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const storageDirty =
    draft.storage !== settings.storage || draft.remoteUrl !== settings.remoteUrl || draft.remoteApiKey !== settings.remoteApiKey;

  return (
    <Screen>
      <SectionHeader>Units</SectionHeader>
      <View style={{ flexDirection: 'row' }}>
        {(['kg', 'lb'] as const).map((u) => (
          <Chip
            key={u}
            label={u}
            selected={settings.weightUnit === u}
            onPress={() => {
              setDraft((d) => ({ ...d, weightUnit: u }));
              updateSettings({ ...settings, weightUnit: u });
            }}
          />
        ))}
      </View>
      <Muted>Only the label changes — numbers are stored exactly as you enter them.</Muted>

      <SectionHeader>Storage</SectionHeader>
      <Card>
        <Text style={{ color: colors.text, marginBottom: space(2) }}>
          Currently using: <Text style={{ fontWeight: '700' }}>{storageName}</Text>
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Chip label="This device (local JSON)" selected={draft.storage === 'local'} onPress={() => setDraft((d) => ({ ...d, storage: 'local' }))} />
          <Chip label="Remote API (MongoDB)" selected={draft.storage === 'remote'} onPress={() => setDraft((d) => ({ ...d, storage: 'remote' }))} />
        </View>
        {draft.storage === 'remote' ? (
          <>
            <Field
              label="API base URL"
              placeholder="https://your-server.example.com/api"
              autoCapitalize="none"
              autoCorrect={false}
              value={draft.remoteUrl}
              onChangeText={(remoteUrl) => setDraft((d) => ({ ...d, remoteUrl }))}
            />
            <Field
              label="API key (optional)"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              value={draft.remoteApiKey}
              onChangeText={(remoteApiKey) => setDraft((d) => ({ ...d, remoteApiKey }))}
            />
            <Muted>See server/README.md in the project for a ready-made Express + MongoDB API.</Muted>
          </>
        ) : null}
        {storageDirty ? (
          <Row style={{ marginTop: space(3), flexWrap: 'wrap' }}>
            <Button title="Switch & copy my data" disabled={busy || (draft.storage === 'remote' && !draft.remoteUrl.trim())} onPress={() => applyStorage(true)} />
            <Button title="Switch only" variant="secondary" disabled={busy || (draft.storage === 'remote' && !draft.remoteUrl.trim())} onPress={() => applyStorage(false)} />
          </Row>
        ) : null}
      </Card>

      <SectionHeader>Export (JSON)</SectionHeader>
      <Card>
        <Muted>
          {data.exercises.length} exercises · {data.plans.length} plans · {data.sessions.length} workouts
        </Muted>
        <Button title={Platform.OS === 'web' ? 'Download JSON' : 'Share JSON'} onPress={exportData} style={{ marginTop: space(3) }} />
      </Card>

      <SectionHeader>Import (JSON)</SectionHeader>
      <Card>
        <Field
          placeholder='Paste exported JSON here: { "version": 1, "exercises": [...], ... }'
          value={importText}
          onChangeText={setImportText}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          style={{ minHeight: 120, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 12 }}
        />
        <Button title="Import & replace" variant="danger" disabled={!importText.trim()} onPress={doImport} />
      </Card>
    </Screen>
  );
}
