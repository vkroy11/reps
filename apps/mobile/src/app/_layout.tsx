// Imported per weight, not from the package barrel. The barrel require()s all
// 16 TTFs (every weight plus italics) and Metro cannot tree-shake font assets,
// which shipped 2.09 MB of fonts for the three faces we actually use.
import { useFonts } from 'expo-font';
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { color } from '@reps/ui';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FrameMeter } from '../features/dev/FrameMeter';
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
            Keyboard avoidance is per screen, not here. A KeyboardAvoidingView
            around the navigator pads a container the screens are laid out
            inside, so nothing they render ever reflows - see KeyboardAvoider.
          */}
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: color.surfacePage },
            }}
          />
          {/*
            Above the navigator so it floats over every screen, and only in
            development. FPS has to be read on real hardware - a simulator
            renders in software and the browser runs Reanimated through a
            different path, so neither gives a number worth quoting.
          */}
          {__DEV__ ? <FrameMeter /> : null}
          <StatusBar style="dark" />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
