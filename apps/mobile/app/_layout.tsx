import { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold } from '@expo-google-fonts/outfit';
import { getToken, decodeJwt } from '../lib/api';
import { router } from 'expo-router';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [checked, setChecked] = useState(false);
  const [fontsLoaded] = useFonts({
    DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold,
    Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold,
  });

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        router.replace('/login');
      } else {
        const decoded = decodeJwt(token);
        if (decoded?.role === 'AGENT') {
          router.replace('/(agent)');
        }
        // Import dynamique : expo-notifications crash dans Expo Go (SDK 53+)
        try {
          const { registerPushToken } = await import('../lib/pushNotifications');
          await registerPushToken();
        } catch {}
      }
      setChecked(true);
    })();
  }, []);

  const onLayout = useCallback(() => {
    if (checked && fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [checked, fontsLoaded]);

  if (!checked || !fontsLoaded) return null;

  return (
    <SafeAreaProvider onLayout={onLayout}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(agent)" />
        <Stack.Screen name="incident/[id]" options={{ presentation: 'card' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
