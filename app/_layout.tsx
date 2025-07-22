import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { Text as RNText } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DailyLogProvider , useDailyLog } from '../services/DailyLogContext';


export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/Janna LT Bold.ttf'), // 👈 your font file
  });

  useDailyLog();

  useEffect(() => {
    if (loaded) {
      // Monkey patch RN's Text to apply default font family globally
      const defaultFont = 'Janna LT Bold';

      const oldRender = (RNText as any).render;
      if (!(RNText as any).__hasBeenPatched) {
        (RNText as any).render = function (...args: unknown[]) {
          const origin = oldRender.call(this, ...args);
          return {
            ...origin,
            props: {
              ...origin.props,
              style: [{ fontFamily: defaultFont }, origin.props.style],
            },
          };
        };
        (RNText as any).__hasBeenPatched = true; // avoid double patching
      }
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <DailyLogProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="info-form" options={{ headerShown: false }} />
          <Stack.Screen name="home" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="calendar" options={{ headerShown: false }} />
          <Stack.Screen name="ai" options={{ headerShown: false }} />


          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </DailyLogProvider>
  );
}
