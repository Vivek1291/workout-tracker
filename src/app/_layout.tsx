import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DataProvider, useData } from '../data/DataProvider';
import { colors } from '../components/theme';
import { Loading } from '../components/ui';

function ErrorBanner() {
  const { error, clearError } = useData();
  if (!error) return null;
  return (
    <Pressable onPress={clearError} style={{ backgroundColor: colors.dangerSoft, padding: 12 }}>
      <Text style={{ color: colors.danger, fontSize: 13 }}>{error} (tap to dismiss)</Text>
    </Pressable>
  );
}

function Root() {
  const { ready } = useData();
  if (!ready) return <Loading />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="plan/[id]" options={{ title: 'Edit plan' }} />
        <Stack.Screen name="workout/[id]" options={{ title: 'Workout' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings & data' }} />
      </Stack>
      <ErrorBanner />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DataProvider>
        <StatusBar style="dark" />
        <Root />
      </DataProvider>
    </SafeAreaProvider>
  );
}
