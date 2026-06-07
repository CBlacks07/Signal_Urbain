import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient, getToken } from './api';

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export async function registerPushToken(): Promise<void> {
  // expo-notifications push distant ne fonctionne pas dans Expo Go (SDK 53+)
  if (isExpoGo()) return;

  try {
    const Notifications = await import('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Signal Urbain Togo',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1A472A',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;

    const jwt = await getToken();
    if (jwt) {
      await apiClient(jwt).patch('/users/me', { fcmToken: pushToken });
    }
  } catch {
    // Silencieux : push non critique
  }
}
