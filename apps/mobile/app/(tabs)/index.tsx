import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Bell, MapPin, MessageSquare, Clock } from 'lucide-react-native';
import { apiClient, getToken, normalizeStatus } from '../../lib/api';
import { COLORS, FONT_FAMILY } from '../../lib/theme';
import { IncidentListSkeleton } from '../../components/Skeleton';

const CATEGORIES: Record<string, { label: string; color: string }> = {
  inondation: { label: 'Inondation', color: '#2B7A9B' },
  electrique: { label: 'Poteau electrique', color: '#D4760A' },
  depotoir: { label: 'Depot sauvage', color: '#6B7534' },
  route: { label: 'Route degradee', color: '#8B4513' },
  eclairage: { label: 'Eclairage public', color: '#5C5C8A' },
  eau: { label: 'Canalisation', color: '#3A7CA5' },
  autre: { label: 'Autre', color: '#6B6B6B' },
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; step: number }> = {
  signale: { label: 'Signalé', color: '#9A5606', bg: '#FDF1E2', step: 1 },
  assigne: { label: 'Assigné', color: '#10529E', bg: '#E7F0FA', step: 2 },
  en_cours: { label: 'Prise en charge', color: '#8A6208', bg: '#FDF9E2', step: 3 },
  resolu: { label: 'Réglé', color: '#226625', bg: '#E9F0EA', step: 4 },
  rejete: { label: 'Rejeté', color: '#C62828', bg: '#FDECEA', step: 0 },
};

const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'signale', label: 'Signalés' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'resolu', label: 'Résolus' },
];

type UpvoteState = { upvoted: boolean; count: number; loading: boolean };

function ArrowUp({ color = COLORS.dark, size = 10 }: { color?: string; size?: number }) {
  return (
    <View style={{ width: 0, height: 0, borderLeftWidth: size * 0.6, borderRightWidth: size * 0.6, borderBottomWidth: size, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color }} />
  );
}

function getTimeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return `il y a ${Math.floor(days / 7)} sem`;
}

export default function HomeScreen() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [upvotes, setUpvotes] = useState<Record<string, UpvoteState>>({});
  const [myCommune, setMyCommune] = useState<{ id: string | null; name: string | null }>({ id: null, name: null });
  const myUserIdRef = useRef<string | null>(null);
  const myCommuneRef = useRef<{ id: string | null; name: string | null }>({ id: null, name: null });

  const fetchIncidents = useCallback(async () => {
    try {
      const token = await getToken();
      if (!myUserIdRef.current) {
        const meRes = await apiClient(token).get('/users/me');
        myUserIdRef.current = meRes.data.id;
        myCommuneRef.current = { id: meRes.data.communeId ?? null, name: meRes.data.commune?.name ?? null };
        setMyCommune(myCommuneRef.current);
      }
      const { id: communeId } = myCommuneRef.current;
      const params = new URLSearchParams({ limit: '50' });
      if (communeId) params.set('communeId', communeId);
      const incRes = await apiClient(token).get(`/incidents?${params.toString()}`);
      const myId = myUserIdRef.current;
      const data = (incRes.data?.data ?? incRes.data ?? []).map((i: any) => ({
        ...i,
        status: normalizeStatus(i.status),
        category: i.category?.toLowerCase() ?? 'autre',
      }));
      setIncidents(data);
      const uv: Record<string, UpvoteState> = {};
      for (const i of data) {
        uv[i.id] = { upvoted: (i.upvotes ?? []).some((u: any) => u.userId === myId), count: i.upvotesCount ?? 0, loading: false };
      }
      setUpvotes(uv);
      setError('');
    } catch {
      setError('Impossible de charger les incidents.');
    }
  }, []);

  useEffect(() => { (async () => { await fetchIncidents(); setLoading(false); })(); }, [fetchIncidents]);

  const onRefresh = async () => { setRefreshing(true); await fetchIncidents(); setRefreshing(false); };

  const toggleUpvote = async (incidentId: string) => {
    const cur = upvotes[incidentId];
    if (!cur || cur.loading) return;
    setUpvotes((prev) => ({ ...prev, [incidentId]: { ...prev[incidentId], loading: true } }));
    try {
      const token = await getToken();
      if (cur.upvoted) {
        await apiClient(token).delete(`/incidents/${incidentId}/upvote`);
        setUpvotes((prev) => ({ ...prev, [incidentId]: { upvoted: false, count: prev[incidentId].count - 1, loading: false } }));
      } else {
        await apiClient(token).post(`/incidents/${incidentId}/upvote`);
        setUpvotes((prev) => ({ ...prev, [incidentId]: { upvoted: true, count: prev[incidentId].count + 1, loading: false } }));
      }
    } catch {
      setUpvotes((prev) => ({ ...prev, [incidentId]: { ...prev[incidentId], loading: false } }));
    }
  };

  const myId = myUserIdRef.current;
  const myReports = incidents.filter((i) => i.reporterId === myId).slice(0, 3);
  const resolvedThisMonth = incidents.filter((i) => {
    if (i.status !== 'resolu' || !i.resolvedAt) return false;
    const d = new Date(i.resolvedAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const filtered = filter === 'all' ? incidents : incidents.filter((i) => i.status === filter);
  const counts: Record<string, number> = {
    all: incidents.length,
    signale: incidents.filter((i) => i.status === 'signale').length,
    en_cours: incidents.filter((i) => i.status === 'en_cours').length,
    resolu: incidents.filter((i) => i.status === 'resolu').length,
  };

  const TopBar = (
    <View style={styles.topBar}>
      <View style={styles.logoBadge}>
        <Image source={require('../../assets/mark.png')} style={styles.logoIcon} resizeMode="contain" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.logoText}>Signal<Text style={{ color: COLORS.orange }}>Togo</Text></Text>
        <Text style={styles.logoSub}>{myCommune.name ? `${myCommune.name} · votre quartier` : 'Plateforme citoyenne'}</Text>
      </View>
      <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.bellBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Bell size={16} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  if (loading) return (
    <View style={styles.container}>
      {TopBar}
      <IncidentListSkeleton count={6} />
    </View>
  );

  return (
    <View style={styles.container}>
      {TopBar}

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.dark} />}>
        {/* Bandeau vert "quartier" */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>CE QUE VOTRE QUARTIER A OBTENU</Text>
          <View style={styles.heroCount}>
            <Text style={styles.heroNumber}>{resolvedThisMonth}</Text>
            <Text style={styles.heroSub}>incidents réglés ce mois-ci</Text>
          </View>
          <View style={styles.heroNote}>
            <Clock size={14} color={COLORS.orangeLight ?? COLORS.orange} />
            <Text style={styles.heroNoteText}>La mairie répond en <Text style={{ fontWeight: '700' }}>6 h</Text> en moyenne et intervient sous <Text style={{ fontWeight: '700' }}>72 h</Text>.</Text>
          </View>
        </View>

        {!myCommune.id && (
          <TouchableOpacity style={styles.communeBanner} onPress={() => router.push('/edit-profile')} activeOpacity={0.8}>
            <Text style={styles.communeBannerText}>Définissez votre commune pour voir les signalements de votre quartier en priorité.</Text>
            <Text style={styles.communeBannerLink}>Choisir ma commune ›</Text>
          </TouchableOpacity>
        )}

        {/* Mes signalements */}
        {myReports.length > 0 && (
          <View style={styles.mySection}>
            <View style={styles.mySectionHeader}>
              <Text style={styles.mySectionTitle}>Mes signalements</Text>
              <TouchableOpacity onPress={() => router.push('/mes-signalements')}>
                <Text style={styles.mySectionLink}>Tout voir</Text>
              </TouchableOpacity>
            </View>
            {myReports.map((incident) => {
              const st = STATUS_MAP[incident.status] ?? STATUS_MAP.signale;
              const uv = upvotes[incident.id];
              return (
                <TouchableOpacity key={incident.id} style={styles.trackCard} onPress={() => router.push(`/incident/${incident.id}`)} activeOpacity={0.7}>
                  <View style={styles.trackTop}>
                    <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                    <View style={{ flex: 1 }} />
                    <Text style={styles.trackTime}>{getTimeAgo(incident.createdAt)}</Text>
                  </View>
                  <Text style={styles.trackDesc} numberOfLines={2}>{incident.description}</Text>
                  <View style={styles.progressRow}>
                    {[1, 2, 3, 4].map((step) => (
                      <View key={step} style={[styles.progressSeg, { backgroundColor: step <= st.step ? (step === st.step ? COLORS.orange : COLORS.dark) : COLORS.border }]} />
                    ))}
                  </View>
                  <View style={styles.trackFooter}>
                    <View style={styles.supportPill}>
                      <ArrowUp color="#fff" size={7} />
                      <Text style={styles.supportPillText}>{uv?.count ?? incident.upvotesCount ?? 0}</Text>
                    </View>
                    <Text style={styles.trackFooterText}>voisins vous soutiennent</Text>
                    <View style={{ flex: 1 }} />
                    <MessageSquare size={13} color={COLORS.textSecondary} />
                    <Text style={styles.trackFooterCount}>{incident.commentsCount ?? 0}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Filtres communaute */}
        <View style={styles.communitySectionHeader}>
          <Text style={styles.mySectionTitle}>Le quartier signale</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {FILTERS.map((f) => (
            <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]} activeOpacity={0.7}>
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label} ({counts[f.key] ?? 0})</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {filtered.length === 0 && !error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Aucun incident</Text>
              <Text style={styles.emptySub}>Tirez vers le bas pour actualiser</Text>
            </View>
          ) : filtered.map((incident) => {
            const cat = CATEGORIES[incident.category] ?? CATEGORIES.autre;
            const st = STATUS_MAP[incident.status] ?? STATUS_MAP.signale;
            const uv = upvotes[incident.id];
            const timeAgo = getTimeAgo(incident.createdAt);
            return (
              <TouchableOpacity key={incident.id} style={styles.card} onPress={() => router.push(`/incident/${incident.id}`)} activeOpacity={0.7}>
                <View style={[styles.cardAccent, { backgroundColor: cat.color }]} />
                <View style={styles.cardBody}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.catTag, { backgroundColor: cat.color + '14' }]}>
                      <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                      <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                      <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>

                  <Text style={styles.cardDesc} numberOfLines={2}>{incident.description}</Text>

                  <View style={styles.cardFooter}>
                    <View style={styles.cardMetaRow}>
                      <MapPin size={11} color={COLORS.textMuted} />
                      <Text style={styles.cardMeta} numberOfLines={1}>{incident.address}</Text>
                    </View>
                    <Text style={styles.cardTime}>{timeAgo}</Text>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation?.(); toggleUpvote(incident.id); }}
                      disabled={uv?.loading}
                      style={[styles.upvoteBtn, uv?.upvoted && styles.upvoteBtnActive]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.6}
                    >
                      {uv?.loading ? (
                        <ActivityIndicator size={10} color={uv.upvoted ? '#fff' : COLORS.dark} />
                      ) : (
                        <View style={styles.upvoteContent}>
                          <ArrowUp color={uv?.upvoted ? '#fff' : COLORS.dark} />
                          <Text style={[styles.upvoteText, uv?.upvoted && { color: '#fff' }]}>{uv?.count ?? incident.upvotesCount ?? 0}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <Text style={styles.soutienLabel}>Soutenir</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, paddingTop: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  logoBadge: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  logoIcon: { width: 22, height: 22 },
  logoText: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  logoSub: { fontSize: 10.5, color: COLORS.textMuted, fontWeight: '500' },
  bellBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },

  hero: { backgroundColor: COLORS.dark, paddingHorizontal: 16, paddingVertical: 16 },
  heroLabel: { fontSize: 10.5, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.2, fontWeight: '700' },
  heroCount: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 },
  heroNumber: { fontSize: 30, fontWeight: '800', color: '#fff', fontFamily: FONT_FAMILY.displayBlack },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  heroNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 9, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroNoteText: { flex: 1, fontSize: 12, color: '#fff', lineHeight: 17 },

  communeBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF3E0', borderRadius: 12, borderWidth: 1, borderColor: '#FFE0B2', padding: 12, marginHorizontal: 16, marginTop: 14, gap: 10 },
  communeBannerText: { flex: 1, fontSize: 12, color: '#B26A00', fontWeight: '500', lineHeight: 17 },
  communeBannerLink: { fontSize: 12, color: COLORS.dark, fontWeight: '700' },

  mySection: { paddingHorizontal: 16, paddingTop: 14 },
  mySectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  mySectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  mySectionLink: { fontSize: 12.5, fontWeight: '700', color: COLORS.dark },

  trackCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 13, marginBottom: 10 },
  trackTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  trackTime: { fontSize: 11, color: COLORS.textMuted },
  trackDesc: { fontSize: 14, fontWeight: '600', lineHeight: 19, color: COLORS.textPrimary, marginBottom: 10 },
  progressRow: { flexDirection: 'row', gap: 5, marginBottom: 10 },
  progressSeg: { flex: 1, height: 5, borderRadius: 3 },
  trackFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.bg },
  supportPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.dark, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  supportPillText: { color: '#fff', fontSize: 11.5, fontWeight: '700' },
  trackFooterText: { fontSize: 11.5, color: COLORS.textSecondary, fontWeight: '500' },
  trackFooterCount: { fontSize: 11.5, color: COLORS.textSecondary, fontWeight: '600' },

  communitySectionHeader: { paddingHorizontal: 16, paddingTop: 16 },

  filterRow: { paddingVertical: 12 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border },
  filterBtnActive: { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  filterText: { fontSize: 12, fontWeight: '600', color: '#888' },
  filterTextActive: { color: '#fff' },

  errorText: { color: '#C62828', textAlign: 'center', marginBottom: 12, fontSize: 13 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
  emptySub: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },

  card: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
  cardAccent: { height: 3 },
  cardBody: { padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catLabel: { fontSize: 11, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontSize: 10, fontWeight: '700' },
  cardDesc: { fontSize: 13, lineHeight: 19, color: '#333', marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  cardMeta: { fontSize: 11, color: COLORS.textSecondary, flex: 1 },
  cardTime: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.bg },

  upvoteBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.dark + '30', minWidth: 48, justifyContent: 'center' },
  upvoteBtnActive: { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  upvoteContent: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  upvoteText: { fontSize: 12, fontWeight: '700', color: COLORS.dark },
  soutienLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
});
