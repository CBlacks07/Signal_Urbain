// ─── File d'attente hors-ligne pour l'agent terrain et l'admin mobile ─────────
// Les actions (arrivée sur site, clôture avec photo, assignation, changement de
// statut) sont tentées immédiatement ; en cas d'échec réseau, elles sont mises
// en file (AsyncStorage) et rejouées automatiquement à la reconnexion (NetInfo)
// ou sur demande.

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiClient } from './api';

const STORAGE_KEY = 'signal_offline_queue';

export type PendingAction =
  | { id: string; type: 'STATUS_UPDATE'; incidentId: string; status: string; createdAt: number }
  | { id: string; type: 'CLOSE_WITH_PHOTO'; incidentId: string; photoUri: string; createdAt: number }
  | { id: string; type: 'ASSIGN'; incidentId: string; agentId: string; alsoSetAssigne: boolean; createdAt: number };

async function readQueue(): Promise<PendingAction[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: PendingAction[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

async function runAction(token: string, action: PendingAction): Promise<void> {
  if (action.type === 'STATUS_UPDATE') {
    await apiClient(token).patch(`/incidents/${action.incidentId}`, { status: action.status });
    return;
  }
  if (action.type === 'ASSIGN') {
    await apiClient(token).patch(`/incidents/${action.incidentId}`, {
      assignedTo: action.agentId,
      ...(action.alsoSetAssigne ? { status: 'ASSIGNE' } : {}),
    });
    return;
  }
  const form = new FormData();
  form.append('incidentId', action.incidentId);
  form.append('kind', 'APRES');
  form.append('file', { uri: action.photoUri, name: 'apres.jpg', type: 'image/jpeg' } as any);
  await apiClient(token).post('/uploads/photo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  await apiClient(token).patch(`/incidents/${action.incidentId}`, { status: 'RESOLU' });
}

/** Tente de rejouer toute la file ; les actions qui échouent encore restent en attente. */
export async function flushQueue(token: string): Promise<PendingAction[]> {
  const queue = await readQueue();
  const remaining: PendingAction[] = [];
  for (const action of queue) {
    try {
      await runAction(token, action);
    } catch {
      remaining.push(action);
    }
  }
  await writeQueue(remaining);
  return remaining;
}

export async function enqueueAction(action: PendingAction): Promise<void> {
  const queue = await readQueue();
  queue.push(action);
  await writeQueue(queue);
}

export function useOfflineQueue(token: string | null) {
  const [pending, setPending] = useState<PendingAction[]>([]);
  const [online, setOnline] = useState(true);

  const refresh = useCallback(async () => setPending(await readQueue()), []);

  const flush = useCallback(async () => {
    if (!token) return;
    const remaining = await flushQueue(token);
    setPending(remaining);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = !!state.isConnected && state.isInternetReachable !== false;
      setOnline(isOnline);
      if (isOnline) flush();
    });
    return () => unsubscribe();
  }, [flush]);

  /**
   * Essaie l'action immédiatement ; si ça échoue faute de réseau, la met en file pour
   * plus tard. Une erreur avec réponse HTTP (ex. 400 "photo après manquante") n'est PAS
   * mise en file — la rejouer sans changement échouerait à l'identique indéfiniment — elle
   * est relancée pour que l'appelant l'affiche immédiatement à l'utilisateur.
   */
  const runOrQueue = useCallback(async (action: PendingAction) => {
    if (!token) return { queued: true };
    try {
      await runAction(token, action);
      return { queued: false };
    } catch (e: any) {
      if (e?.response) throw e;
      await enqueueAction(action);
      await refresh();
      return { queued: true };
    }
  }, [token, refresh]);

  return { pending, pendingCount: pending.length, online, flush, runOrQueue };
}
