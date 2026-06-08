import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const API_BASE = 'https://signal-urbain.onrender.com/api/v1';
export const TOKEN_KEY = 'signal_token';

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);
export const saveToken = (t: string) => SecureStore.setItemAsync(TOKEN_KEY, t);
export const clearToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);

export const apiClient = (token?: string | null) =>
  axios.create({
    baseURL: API_BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    // Le serveur (Render, plan gratuit) peut se rendormir et mettre 30-60s a redemarrer :
    // un timeout court declenchait de faux "impossible de charger" au premier appel
    timeout: 45000,
  });

// Normalise le statut API (SIGNALE → signale)
export const normalizeStatus = (s: string) => s?.toLowerCase() ?? 'signale';
