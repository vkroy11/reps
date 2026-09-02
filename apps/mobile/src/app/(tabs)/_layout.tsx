import { color, font, space } from '@reps/ui';
import { Tabs } from 'expo-router';
import { TabIcon } from '../../components/tab-icons';

/**
 * Four tabs, deliberately. Today is the only screen with a decision on it;
 * the rest are places to look things up. No feed, no leagues, no shop.
 */
export default function TabLayout() {
  return (
    <Tabs
      // tabBarIcon hands back a ColorValue, which may be an opaque native
      // colour rather than a string, so the tint comes from our tokens.
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.brand,
        tabBarInactiveTintColor: color.iconDecorative,
        sceneStyle: { backgroundColor: color.surfacePage },
        tabBarStyle: {
          backgroundColor: color.surfaceCard,
          borderTopColor: color.borderDefault,
          height: 76,
          paddingTop: space.sm,
        },
        tabBarLabelStyle: { fontFamily: font.extrabold, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => (
            <TabIcon.Home
              size={23}
              color={focused ? color.brand : color.iconDecorative}
              strokeWidth={2.2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="path"
        options={{
          title: 'Path',
          tabBarIcon: ({ focused }) => (
            <TabIcon.Route
              size={23}
              color={focused ? color.brand : color.iconDecorative}
              strokeWidth={2.2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notes',
          tabBarIcon: ({ focused }) => (
            <TabIcon.Notebook
              size={23}
              color={focused ? color.brand : color.iconDecorative}
              strokeWidth={2.2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarIcon: ({ focused }) => (
            <TabIcon.User
              size={23}
              color={focused ? color.brand : color.iconDecorative}
              strokeWidth={2.2}
            />
          ),
        }}
      />
    </Tabs>
  );
}
