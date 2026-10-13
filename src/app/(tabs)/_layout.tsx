import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, Tabs } from 'expo-router';
import { ColorValue, Pressable, View } from 'react-native';
import { HeaderBrand, ProfileButton } from '../../components/Brand';
import { colors } from '../../components/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Filled icon for the selected tab, outline otherwise. */
const icon =
  (name: string) =>
  ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <Ionicons name={(focused ? name : `${name}-outline`) as IconName} color={color as string} size={size} />
  );

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text },
        sceneStyle: { backgroundColor: colors.bg },
        headerLeft: () => <HeaderBrand />,
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 10 }}>
            <ProfileButton />
            <Link href="/settings" asChild>
              <Pressable accessibilityLabel="Settings" style={{ paddingHorizontal: 8 }}>
                <Ionicons name="settings-outline" size={22} color={colors.accent} />
              </Pressable>
            </Link>
          </View>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('today') }} />
      <Tabs.Screen name="plans" options={{ title: 'Plans', tabBarIcon: icon('calendar') }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: icon('time') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('trending-up') }} />
      <Tabs.Screen name="exercises" options={{ title: 'Exercises', tabBarIcon: icon('barbell') }} />
    </Tabs>
  );
}
