import { color, font, space, useBreakpoint } from '@reps/ui';
import { Tabs } from 'expo-router';
import { TabIcon } from '../../components/tab-icons';

/**
 * Four tabs, deliberately. Today is the only screen with a decision on it;
 * the rest are places to look things up. No feed, no leagues, no shop.
 *
 * From 960px up the bar moves to the left edge and becomes a rail. Bottom tabs
 * on a desktop window put navigation as far from the pointer as the screen
 * allows, and waste the one axis a wide window has to spare - so the same four
 * destinations change position rather than changing what they are.
 *
 * `tabBarPosition` is honoured by the navigator itself, so this is a prop
 * change rather than a second navigator. A custom sidebar would have meant
 * reimplementing focus, history and deep links.
 */
export default function TabLayout() {
  const { isWide } = useBreakpoint();

  return (
    <Tabs
      // tabBarIcon hands back a ColorValue, which may be an opaque native
      // colour rather than a string, so the tint comes from our tokens.
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.brand,
        tabBarInactiveTintColor: color.iconDecorative,
        /*
          The left rail draws a filled pill behind the active item, which the
          bottom bar does not. Left at the default that pill is brand-filled
          under brand-tinted label and icon - invisible. brandSoft under brand
          measures 5.17, and matches the selected-chip language elsewhere.
        */
        tabBarActiveBackgroundColor: isWide ? color.brandSoft : undefined,
        sceneStyle: { backgroundColor: color.surfacePage },
        tabBarPosition: isWide ? 'left' : 'bottom',
        tabBarStyle: isWide
          ? {
              backgroundColor: color.surfaceCard,
              borderRightColor: color.borderDefault,
              borderRightWidth: 1,
              width: 216,
              paddingTop: space.lg,
            }
          : {
              backgroundColor: color.surfaceCard,
              borderTopColor: color.borderDefault,
              height: 76,
              paddingTop: space.sm,
            },
        tabBarLabelStyle: {
          fontFamily: font.extrabold,
          fontSize: isWide ? 14 : 11,
        },
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
