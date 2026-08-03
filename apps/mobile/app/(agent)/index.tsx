import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Linking, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MapPin, Navigation, Phone, Camera, LogOut } from 'lucide-react-native';
import { formatDelay } from '@signal/types';
import { apiClient, getToken, clearToken, normalizeStatus } from '../../lib/api';
import { COLORS, FONT_FAMILY } from '../../lib/theme';
import { useOfflineQueue } from '../../lib/offlineQueue';
import { router } from 'expo-router';

type Filter = 'urgent' | 'today' | 'later';

export default function AgentScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('urgent');
  const [busyId, setBusyId] = useState<string | null>(null);
  const queue = useOfflineQueue(token);

  const load = useCallback(async () => {
    const tok = await getToken();
    setToken(tok);
    if (!tok) return;
    try {
      const meRes = await apiClient(tok).get('/users/me');
      setMe(meRes.data);
      const res = await apiClient(tok).get('/incidents', { params: { assignedTo: meRes.data.id, limit: 100 } });
      const data = (res.data?.data ?? []).map((i: any) => ({ ...i, status: normalizeStatus(i.status) }));
      setIncidents(data);
    } catch {}
  }, []);

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, [load]);

  const active = incidents.filter((i) => i.status !== 'resolu' && i.status !== 'rejete');
  const overdueCount = active.filter((i) => i.delay?.isOverdue).length;
  const urgent = active.filter((i) => i.delay?.isOverdue || (i.delay?.hoursRemaining ?? 999) < 6);
  const today = active.filter((i) => !urgent.includes(i) && (i.delay?.hoursRemaining ?? 999) < 24);
  const later = active.filter((i) => !urgent.includes(i) && !today.includes(i));
  const awaitingProof = incidents.filter((i) => i.status === 'en_cours' && !(i.photos ?? []).some((p: any) => p.kind === 'APRES'));

  const shown = filter === 'urgent' ? urgent : filter === 'today' ? today : later;

  const arrive = async (incident: any) => {
    setBusyId(incident.id);
    const { queued } = await queue.runOrQueue({ id: `arrive-${incident.id}-${Date.now()}`, type: 'STATUS_UPDATE', incidentId: incident.id, status: 'EN_COURS', createdAt: Date.now() });
    if (!queued) await load();
    else setIncidents((prev) => prev.map((i) => (i.id === incident.id ? { ...i, status: 'en_cours' } : i)));
    setBusyId(null);
  };

  const closeWithProof = async (incident: any) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (result.canceled || !result.assets?.[0]) return;
    setBusyId(incident.id);
    const { queued } = await queue.runOrQueue({
      id: `close-${incident.id}-${Date.now()}`, type: 'CLOSE_WITH_PHOTO', incidentId: incident.id, photoUri: result.assets[0].uri, createdAt: Date.now(),
    });
    if (!queued) await load();
    else setIncidents((prev) => prev.map((i) => (i.id === incident.id ? { ...i, status: 'resolu' } : i)));
    setBusyId(null);
  };

  const logout = async () => { await clearToken(); router.replace('/login'); };

  if (loading) return <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={COLORS.dark} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(me?.name ?? '??').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.agentName}>{me?.name}</Text>
            <Text style={styles.agentRole}>{me?.service ?? 'Agent'} · {me?.commune?.name ?? ''}</Text>
          </View>
          <View style={[styles.onlineBadge, !queue.online && styles.offlineBadge]}>
            <View style={[styles.onlineDot, { backgroundColor: queue.online ? '#7DC98D' : COLORS.orangeLight }]} />
            <Text style={styles.onlineText}>{queue.online ? 'En ligne' : 'Hors ligne'}</Text>
          </View>
          <TouchableOpacity onPress={logout} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 10 }}>
            <LogOut size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
        <Text style={styles.tourLabel}>MA TOURNÉE DU JOUR</Text>
        <View style={styles.tourCountRow}>
          <Text style={styles.tourCount}>{active.length}</Text>
          <Text style={styles.tourSub}>interventions{overdueCount > 0 ? ` · ${overdueCount} hors délai` : ''}</Text>
        </View>
        <View style={styles.tourBars}>
          <View style={[styles.tourBar, { flex: Math.max(urgent.length, 0.3), backgroundColor: '#C62828' }]} />
          <View style={[styles.tourBar, { flex: Math.max(today.length, 0.3), backgroundColor: COLORS.orangeLight }]} />
          <View style={[styles.tourBar, { flex: Math.max(later.length, 0.3), backgroundColor: 'rgba(255,255,255,0.18)' }]} />
        </View>
      </View>

      <View style={styles.chipsRow}>
        {([
          ['urgent', `Urgent (${urgent.length})`],
          ['today', `Aujourd'hui (${today.length})`],
          ['later', 'Plus tard'],
        ] as const).map(([key, label]) => (
          <TouchableOpacity key={key} onPress={() => setFilter(key)} style={[styles.chip, filter === key && styles.chipActive]} activeOpacity={0.7}>
            <Text style={[styles.chipText, filter === key && styles.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {queue.pendingCount > 0 && (
          <View style={styles.syncBanner}>
            <Text style={styles.syncText}>{queue.pendingCount} action{queue.pendingCount > 1 ? 's' : ''} en attente de synchronisation</Text>
          </View>
        )}

        {shown.length === 0 && (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Rien à faire dans cette catégorie</Text>
          </View>
        )}

        {shown.map((incident) => {
          const isUrgent = urgent.includes(incident);
          const delayLabel = incident.delay ? (incident.delay.isOverdue ? `Retard ${formatDelay(incident.delay.hoursRemaining)}` : `Reste ${formatDelay(incident.delay.hoursRemaining)}`) : null;
          return (
            <View key={incident.id} style={[styles.card, { borderLeftColor: isUrgent ? '#C62828' : incident.status === 'en_cours' ? COLORS.orange : '#EDECEA' }]}>
              <View style={styles.cardTop}>
                {delayLabel && (
                  <View style={[styles.delayBadge, { backgroundColor: incident.delay.isOverdue ? '#FDECEA' : '#FDF1E2' }]}>
                    <Text style={[styles.delayText, { color: incident.delay.isOverdue ? '#A31E1E' : '#9A5606' }]}>{delayLabel}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }} />
                <Text style={styles.refCode}>{incident.refCode?.slice(-4)}</Text>
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>{incident.description}</Text>
              <View style={styles.cardMeta}>
                <MapPin size={13} color={COLORS.textSecondary} />
                <Text style={styles.cardMetaText} numberOfLines={1}>{incident.address}</Text>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.primaryBtn, incident.status === 'en_cours' && styles.secondaryBtn]}
                  onPress={() => arrive(incident)}
                  disabled={busyId === incident.id}
                  activeOpacity={0.8}
                >
                  {busyId === incident.id ? <ActivityIndicator color={incident.status === 'en_cours' ? COLORS.dark : '#fff'} /> : (
                    <Text style={[styles.primaryBtnText, incident.status === 'en_cours' && styles.secondaryBtnText]}>
                      {incident.status === 'en_cours' ? 'Reprendre' : "J'y suis"}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => Linking.openURL(`https://maps.google.com/?q=${incident.latitude},${incident.longitude}`)}>
                  <Navigation size={17} color={COLORS.dark} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => incident.reporter?.phone && Linking.openURL(`tel:${incident.reporter.phone}`)}>
                  <Phone size={17} color={COLORS.dark} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {awaitingProof.length > 0 && filter === 'urgent' && awaitingProof.map((incident) => (
          <View key={`proof-${incident.id}`} style={[styles.card, { borderLeftColor: '#2E7D32' }]}>
            <View style={styles.cardTop}>
              <View style={[styles.delayBadge, { backgroundColor: '#E9F0EA' }]}>
                <Text style={[styles.delayText, { color: '#226625' }]}>Terminé — preuve à envoyer</Text>
              </View>
              <View style={{ flex: 1 }} />
              <Text style={styles.refCode}>{incident.refCode?.slice(-4)}</Text>
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>{incident.description}</Text>
            <View style={styles.beforeAfterRow}>
              <View style={styles.beforeBox}>
                {incident.photos?.[0] ? <Image source={{ uri: incident.photos[0].thumbnailUrl }} style={styles.beforeImg} /> : <Text style={styles.beforeLabel}>Avant</Text>}
              </View>
              <TouchableOpacity style={styles.afterBox} onPress={() => closeWithProof(incident)} activeOpacity={0.7}>
                <Camera size={17} color={COLORS.dark} />
                <Text style={styles.afterLabel}>Photo après</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => closeWithProof(incident)} disabled={busyId === incident.id} activeOpacity={0.8}>
              {busyId === incident.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.closeBtnText}>Clore l'intervention</Text>}
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { backgroundColor: COLORS.railDark, paddingTop: 52, paddingHorizontal: 18, paddingBottom: 18 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  agentName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  agentRole: { color: 'rgba(255,255,255,0.55)', fontSize: 11 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  offlineBadge: { backgroundColor: 'rgba(232,149,15,0.2)' },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  onlineText: { color: '#fff', fontSize: 10.5, fontWeight: '700' },
  tourLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10.5, fontWeight: '700', letterSpacing: 1.2 },
  tourCountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 },
  tourCount: { color: '#fff', fontSize: 34, fontWeight: '800', fontFamily: FONT_FAMILY.displayBlack },
  tourSub: { color: 'rgba(255,255,255,0.62)', fontSize: 13 },
  tourBars: { flexDirection: 'row', gap: 6, marginTop: 14 },
  tourBar: { height: 6, borderRadius: 3 },

  chipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.railDark, borderColor: COLORS.railDark },
  chipText: { fontSize: 12.5, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: '#fff' },

  syncBanner: { backgroundColor: '#FDF1E2', borderRadius: 10, padding: 10, marginBottom: 12 },
  syncText: { fontSize: 11.5, color: '#9A5606', fontWeight: '600', textAlign: 'center' },

  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 4, borderRadius: 14, padding: 13, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  delayBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  delayText: { fontSize: 11.5, fontWeight: '700' },
  refCode: { fontSize: 11.5, color: COLORS.textMuted, fontFamily: 'monospace' },
  cardTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20, color: COLORS.textPrimary, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  cardMetaText: { fontSize: 12.5, color: COLORS.textSecondary, flex: 1 },

  actionsRow: { flexDirection: 'row', gap: 8 },
  primaryBtn: { flex: 1, paddingVertical: 13, borderRadius: 11, backgroundColor: COLORS.dark, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#E9F0EA' },
  secondaryBtnText: { color: COLORS.dark },
  iconBtn: { width: 52, height: 46, borderRadius: 11, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },

  beforeAfterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  beforeBox: { flex: 1, height: 62, borderRadius: 10, backgroundColor: '#EDECEA', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  beforeImg: { width: '100%', height: '100%' },
  beforeLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },
  afterBox: { flex: 1, height: 62, borderRadius: 10, borderWidth: 1.5, borderColor: '#B9C7BB', borderStyle: 'dashed', backgroundColor: '#F2F7F2', alignItems: 'center', justifyContent: 'center', gap: 4 },
  afterLabel: { fontSize: 10.5, fontWeight: '700', color: COLORS.dark },
  closeBtn: { paddingVertical: 13, borderRadius: 11, backgroundColor: COLORS.orange, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },
});
