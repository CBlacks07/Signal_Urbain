import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, ActivityIndicator, Modal, Alert } from 'react-native';
import { MapPin, Phone, LogOut, UserPlus, RefreshCw, X, Check } from 'lucide-react-native';
import { formatDelay } from '@signal/types';
import { apiClient, getToken, clearToken, normalizeStatus } from '../../lib/api';
import { COLORS, FONT_FAMILY } from '../../lib/theme';
import { useOfflineQueue } from '../../lib/offlineQueue';
import { router } from 'expo-router';

type Filter = 'unassigned' | 'overdue' | 'all';

const STATUS_LABELS: Record<string, string> = {
  signale: 'Signalé', assigne: 'Assigné', en_cours: 'En cours', resolu: 'Résolu', rejete: 'Rejeté',
};
const STATUS_OPTIONS: { key: string; label: string }[] = [
  { key: 'SIGNALE', label: 'Signalé' },
  { key: 'ASSIGNE', label: 'Assigné' },
  { key: 'EN_COURS', label: 'En cours' },
  { key: 'RESOLU', label: 'Résolu' },
  { key: 'REJETE', label: 'Rejeté' },
];

export default function AdminScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [onTimeRate, setOnTimeRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('unassigned');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<any>(null);
  const [statusTarget, setStatusTarget] = useState<any>(null);
  const queue = useOfflineQueue(token);

  const isSuperAdmin = me?.role === 'SUPER_ADMIN';
  const agentsById = new Map(agents.map((a) => [a.id, a]));

  const load = useCallback(async () => {
    const tok = await getToken();
    setToken(tok);
    if (!tok) return;
    const client = apiClient(tok);
    try {
      const meRes = await client.get('/users/me');
      setMe(meRes.data);
    } catch {}
    try {
      const res = await client.get('/incidents', { params: { limit: 100, sort: 'created_at:desc' } });
      const data = (res.data?.data ?? []).map((i: any) => ({ ...i, status: normalizeStatus(i.status) }));
      data.sort((a: any, b: any) => (a.delay?.hoursRemaining ?? 999) - (b.delay?.hoursRemaining ?? 999));
      setIncidents(data);
    } catch {}
    try {
      const res = await client.get('/users/agents');
      setAgents(res.data ?? []);
    } catch {}
    try {
      const res = await client.get('/stats/delays');
      setOnTimeRate(res.data?.onTimeRate ?? null);
    } catch {}
  }, []);

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, [load]);

  const active = incidents.filter((i) => i.status !== 'resolu' && i.status !== 'rejete');
  const unassigned = active.filter((i) => !i.assignedTo);
  const overdue = active.filter((i) => i.delay?.isOverdue);
  const shown = filter === 'unassigned' ? unassigned : filter === 'overdue' ? overdue : active;

  const assign = async (incident: any, agentId: string) => {
    setAssignTarget(null);
    setBusyId(incident.id);
    try {
      const alsoSetAssigne = incident.status === 'signale';
      const { queued } = await queue.runOrQueue({
        id: `assign-${incident.id}-${Date.now()}`, type: 'ASSIGN', incidentId: incident.id, agentId, alsoSetAssigne, createdAt: Date.now(),
      });
      if (!queued) await load();
      else setIncidents((prev) => prev.map((i) => (i.id === incident.id ? { ...i, assignedTo: agentId, status: alsoSetAssigne ? 'assigne' : i.status } : i)));
    } catch (e: any) {
      Alert.alert('Assignation impossible', e?.response?.data?.message ?? 'Veuillez réessayer.');
    } finally {
      setBusyId(null);
    }
  };

  const changeStatus = async (incident: any, statusKey: string) => {
    setStatusTarget(null);
    setBusyId(incident.id);
    try {
      const { queued } = await queue.runOrQueue({
        id: `status-${incident.id}-${Date.now()}`, type: 'STATUS_UPDATE', incidentId: incident.id, status: statusKey, createdAt: Date.now(),
      });
      if (!queued) await load();
      else setIncidents((prev) => prev.map((i) => (i.id === incident.id ? { ...i, status: normalizeStatus(statusKey) } : i)));
    } catch (e: any) {
      Alert.alert('Changement impossible', e?.response?.data?.message ?? 'Veuillez réessayer.');
    } finally {
      setBusyId(null);
    }
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
            <Text style={styles.agentRole}>{isSuperAdmin ? 'Super administrateur' : 'Administrateur'} · {me?.commune?.name ?? 'Toutes les communes'}</Text>
          </View>
          <View style={[styles.onlineBadge, !queue.online && styles.offlineBadge]}>
            <View style={[styles.onlineDot, { backgroundColor: queue.online ? '#7DC98D' : COLORS.orangeLight }]} />
            <Text style={styles.onlineText}>{queue.online ? 'En ligne' : 'Hors ligne'}</Text>
          </View>
          <TouchableOpacity onPress={logout} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 10 }}>
            <LogOut size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{active.length}</Text>
            <Text style={styles.statLabel}>Actifs</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={[styles.statValue, overdue.length > 0 && { color: '#F1958A' }]}>{overdue.length}</Text>
            <Text style={styles.statLabel}>Hors délai</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{onTimeRate != null ? `${onTimeRate}%` : '—'}</Text>
            <Text style={styles.statLabel}>Dans les délais</Text>
          </View>
        </View>
      </View>

      <View style={styles.chipsRow}>
        {([
          ['unassigned', `Non assignés (${unassigned.length})`],
          ['overdue', `Hors délai (${overdue.length})`],
          ['all', `Tous (${active.length})`],
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
            <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Rien à afficher dans cette catégorie</Text>
          </View>
        )}

        {shown.map((incident) => {
          const delayLabel = incident.delay
            ? incident.delay.isOverdue ? `${formatDelay(-incident.delay.hoursRemaining)} de retard` : `${formatDelay(incident.delay.hoursRemaining)} restant`
            : null;
          const assignedAgent = incident.assignedTo ? agentsById.get(incident.assignedTo) : null;

          return (
            <View key={incident.id} style={[styles.card, { borderLeftColor: incident.delay?.isOverdue ? '#C62828' : incident.assignedTo ? '#EDECEA' : COLORS.orange }]}>
              <View style={styles.cardTop}>
                {delayLabel && (
                  <View style={[styles.delayBadge, { backgroundColor: incident.delay.isOverdue ? '#FDECEA' : '#FDF1E2' }]}>
                    <Text style={[styles.delayText, { color: incident.delay.isOverdue ? '#A31E1E' : '#9A5606' }]}>{delayLabel}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }} />
                <Text style={styles.refCode}>{incident.refCode}</Text>
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>{incident.description}</Text>
              <View style={styles.cardMeta}>
                <MapPin size={13} color={COLORS.textSecondary} />
                <Text style={styles.cardMetaText} numberOfLines={1}>{incident.address}</Text>
              </View>
              <View style={styles.assignRow}>
                <Text style={styles.assignText}>{assignedAgent ? `Assigné à ${assignedAgent.name}` : 'Non assigné'}</Text>
                <View style={styles.statusPill}><Text style={styles.statusPillText}>{STATUS_LABELS[incident.status] ?? incident.status}</Text></View>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setAssignTarget(incident)} disabled={busyId === incident.id} activeOpacity={0.8}>
                  {busyId === incident.id ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <UserPlus size={14} color="#fff" />
                      <Text style={styles.primaryBtnText}>Assigner</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStatusTarget(incident)} disabled={busyId === incident.id} activeOpacity={0.8}>
                  <RefreshCw size={14} color={COLORS.dark} />
                  <Text style={styles.secondaryBtnText}>Statut</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => incident.reporter?.phone && Linking.openURL(`tel:${incident.reporter.phone}`)}>
                  <Phone size={17} color={COLORS.dark} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Modale d'assignation */}
      <Modal visible={!!assignTarget} transparent animationType="fade" onRequestClose={() => setAssignTarget(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAssignTarget(null)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assigner à</Text>
              <TouchableOpacity onPress={() => setAssignTarget(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {agents.length === 0 && <Text style={styles.modalEmpty}>Aucun agent disponible</Text>}
              {agents.map((agent) => (
                <TouchableOpacity key={agent.id} style={styles.modalRow} onPress={() => assignTarget && assign(assignTarget, agent.id)} activeOpacity={0.7}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalRowTitle}>{agent.name}</Text>
                    <Text style={styles.modalRowSub}>{isSuperAdmin ? agent.commune?.name ?? '' : `${agent._count?.assignedIncidents ?? 0} en charge`}</Text>
                  </View>
                  {assignTarget?.assignedTo === agent.id && <Check size={16} color={COLORS.dark} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modale de changement de statut */}
      <Modal visible={!!statusTarget} transparent animationType="fade" onRequestClose={() => setStatusTarget(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setStatusTarget(null)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Changer le statut</Text>
              <TouchableOpacity onPress={() => setStatusTarget(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            {STATUS_OPTIONS.map((opt) => {
              const isCurrent = statusTarget && normalizeStatus(opt.key) === statusTarget.status;
              return (
                <TouchableOpacity key={opt.key} style={styles.modalRow} onPress={() => statusTarget && !isCurrent && changeStatus(statusTarget, opt.key)} activeOpacity={0.7} disabled={isCurrent}>
                  <Text style={[styles.modalRowTitle, isCurrent && { color: COLORS.textMuted }]}>{opt.label}</Text>
                  {isCurrent && <Check size={16} color={COLORS.dark} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
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

  statsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  statTile: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '800', fontFamily: FONT_FAMILY.displayBlack },
  statLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10.5, fontWeight: '600', marginTop: 2 },

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
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  cardMetaText: { fontSize: 12.5, color: COLORS.textSecondary, flex: 1 },

  assignRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  assignText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', flex: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: COLORS.bg },
  statusPillText: { fontSize: 10.5, fontWeight: '700', color: COLORS.textSecondary },

  actionsRow: { flexDirection: 'row', gap: 8 },
  primaryBtn: { flex: 1, flexDirection: 'row', gap: 6, paddingVertical: 12, borderRadius: 11, backgroundColor: COLORS.dark, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  secondaryBtn: { flex: 1, flexDirection: 'row', gap: 6, paddingVertical: 12, borderRadius: 11, backgroundColor: '#E9F0EA', alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: COLORS.dark, fontSize: 13, fontWeight: '700' },
  iconBtn: { width: 46, height: 44, borderRadius: 11, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  modalEmpty: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 20 },
  modalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalRowTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  modalRowSub: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 },
});
