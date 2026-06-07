import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Sur émulateur Android → 10.0.2.2 | iOS simulator → localhost | Appareil physique → IP de la machine
export const API_BASE = 'http://192.168.1.39:3015/api/v1';
export const TOKEN_KEY = 'signal_token';

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);
export const saveToken = (t: string) => SecureStore.setItemAsync(TOKEN_KEY, t);
export const clearToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);

export const apiClient = (token?: string | null) =>
  axios.create({
    baseURL: API_BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    timeout: 10000,
  });

// Normalise le statut API (SIGNALE → signale)
export const normalizeStatus = (s: string) => s?.toLowerCase() ?? 'signale';
