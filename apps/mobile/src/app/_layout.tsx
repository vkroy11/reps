// Imported per weight, not from the package barrel. The barrel require()s all
// 16 TTFs (every weight plus italics) and Metro cannot tree-shake font assets,
// which shipped 2.09 MB of fonts for the three faces we actually use.
import { useFonts } from 'expo-font';
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { KeyboardAvoider, color } from '@reps/ui';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '../providers/app-provider';

// Held until the fonts resolve so text never reflows on first paint - the
// splash is a better wait than a visible font swap.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    // Hide on error too: shipping system-font text beats a stuck splash.
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    // Required at the root for gesture-driven surfaces (bottom sheets, cards).
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppProvider>
          {/*
            Wrapped once here rather than per screen. Every text input in the
            app - the skill field, a free-text answer, the note composer - sits
            below the fold on its screen, and each one previously went under
            the keyboard on iOS along with the CTA beneath it.
          */}
          <KeyboardAvoider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: color.surfacePage },
              }}
            />
          </KeyboardAvoider>
          <StatusBar style="dark" />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
