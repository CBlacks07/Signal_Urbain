import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getToken } from '../lib/api';
import { router } from 'expo-router';

export default function RootLayout() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        router.replace('/login');
      } else {
        // Import dynamique : expo-notifications crash dans Expo Go (SDK 53+)
        try {
          const { registerPushToken } = await import('../lib/pushNotifications');
          await registerPushToken();
        } catch {}
      }
      setChecked(true);
    })();
  }, []);

  if (!checked) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="incident/[id]" options={{ presentation: 'card' }} />
      </Stack>
    </>
  );
}
