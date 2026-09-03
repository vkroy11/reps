import { Stack } from 'expo-router';
import { motion } from '@reps/ui';

/**
 * The questionnaire's own stack.
 *
 * Each step paints its own full-bleed panel colour, so a cross-fade between
 * screens *is* the panel cross-fade the design calls for - the outgoing colour
 * dissolves into the incoming one with no colour interpolation to run and no
 * shared background to keep in sync.
 *
 * `animationDuration` is honoured by react-native-screens on Android; iOS uses
 * its own fade timing, which is close to but not exactly the 450ms below.
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: motion.panelFade.duration,
        // Transparent, so the fading screens show each other's panels through
        // the gap rather than a flash of page grey between them.
        contentStyle: { backgroundColor: 'transparent' },
      }}
    />
  );
}
