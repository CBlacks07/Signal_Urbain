import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { apiClient, getToken, normalizeStatus } from '../../lib/api';

const COLORS = { dark: '#1A472A', orange: '#D4760A', bg: '#F5F4F2' };

const CATEGORIES: Record<string, { label: string; color: string; icon: string }> = {
  inondation: { label: "Inondation",        color: "#2B7A9B", icon: "~" },
  electrique: { label: "Poteau electrique", color: "#D4760A", icon: "/" },
  depotoir:   { label: "Depot sauvage",     color: "#6B7534", icon: "#" },
  route:      { label: "Route degradee",    color: "#8B4513", icon: "=" },
  eclairage:  { label: "Eclairage public",  color: "#5C5C8A", icon: "*" },
  eau:        { label: "Canalisation",      color: "#3A7CA5", icon: "o" },
  autre:      { label: "Autre",             color: "#6B6B6B", icon: "?" },
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  signale:  { label: "Signale",  color: "#D4760A", bg: "#FFF3E0" },
  assigne:  { label: "Assigne",  color: "#1565C0", bg: "#E3F2FD" },
  en_cours: { label: "En cours", color: "#2B7A9B", bg: "#E0F2F1" },
  resolu:   { label: "Resolu",   color: "#2E7D32", bg: "#E8F5E9" },
  rejete:   { label: "Rejete",   color: "#C62828", bg: "#FFEBEE" },
};

const FILTERS = [
  { key: "all",      label: "Tous" },
  { key: "signale",  label: "Signales" },
  { key: "en_cours", label: "En cours" },
  { key: "resolu",   label: "Resolus" },
];

type UpvoteState = { upvoted: boolean; count: number; loading: boolean };

// Icone fleche vers le haut pour upvote
function ArrowUp({ color = COLORS.dark, size = 10 }: { color?: string; size?: number }) {
  return (
    <View style={{
      width: 0, height: 0,
      borderLeftWidth: size * 0.6, borderRightWidth: size * 0.6,
      borderBottomWidth: size, borderLeftColor: 'transparent',
      borderRightColor: 'transparent', borderBottomColor: color,
    }} />
  );
}

// Icone localisation
function PinIcon({ color = '#999', size = 10 }: { color?: string; size?: number }) {
  return (
    <View style={{ alignItems: 'center', marginRight: 4 }}>
      <View style={{
        width: size, height: size,
        borderRadius: size / 2, borderWidth: 1.5, borderColor: color,
      }} />
      <View style={{
        width: 0, height: 0, marginTop: -1,
        borderLeftWidth: size * 0.3, borderRightWidth: size * 0.3,
        borderTopWidth: size * 0.4, borderLeftColor: 'transparent',
        borderRightColor: 'transparent', borderTopColor: color,
      }} />
    </View>
  );
}

export default function HomeScreen() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [filter, setFilter]       = useState("all");
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState('');
  const [upvotes, setUpvotes]     = useState<Record<string, UpvoteState>>({});
  const [myCommune, setMyCommune] = useState<{ id: string | null; name: string | null }>({ id: null, name: null });
  const myUserIdRef               = useRef<string | null>(null);
  const myCommuneRef              = useRef<{ id: string | null; name: string | null }>({ id: null, name: null });

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
        uv[i.id] = {
          upvoted: (i.upvotes ?? []).some((u: any) => u.userId === myId),
          count: i.upvotesCount ?? 0,
          loading: false,
        };
      }
      setUpvotes(uv);
      setError('');
    } catch {
      setError('Impossible de charger les incidents.');
    }
  }, []);

  useEffect(() => {
    (async () => { await fetchIncidents(); setLoading(false); })();
  }, [fetchIncidents]);

  const onRefresh = async () => { setRefreshing(true); await fetchIncidents(); setRefreshing(false); };

  const toggleUpvote = async (incidentId: string) => {
    const cur = upvotes[incidentId];
    if (!cur || cur.loading) return;
    setUpvotes(prev => ({ ...prev, [incidentId]: { ...prev[incidentId], loading: true } }));
    try {
      const token = await getToken();
      if (cur.upvoted) {
        await apiClient(token).delete(`/incidents/${incidentId}/upvote`);
        setUpvotes(prev => ({ ...prev, [incidentId]: { upvoted: false, count: prev[incidentId].count - 1, loading: false } }));
      } else {
        await apiClient(token).post(`/incidents/${incidentId}/upvote`);
        setUpvotes(prev => ({ ...prev, [incidentId]: { upvoted: true, count: prev[incidentId].count + 1, loading: false } }));
      }
    } catch {
      setUpvotes(prev => ({ ...prev, [incidentId]: { ...prev[incidentId], loading: false } }));
    }
  };

  const filtered = filter === 'all' ? incidents : incidents.filter(i => i.status === filter);
  const counts: Record<string, number> = {
    all:      incidents.length,
    signale:  incidents.filter(i => i.status === 'signale').length,
    en_cours: incidents.filter(i => i.status === 'en_cours').length,
    resolu:   incidents.filter(i => i.status === 'resolu').length,
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg }}>
      <ActivityIndicator size="large" color={COLORS.dark} />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.logo}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>ST</Text>
          </View>
          <View>
            <Text style={styles.logoText}>Signal<Text style={{ color: COLORS.orange }}>Togo</Text></Text>
            <Text style={styles.logoSub}>Plateforme citoyenne</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.dark} />}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>
            {myCommune.name ? `${myCommune.name.toUpperCase()}  --  SIGNALEMENTS ACTIFS` : 'SIGNALEMENTS ACTIFS'}
          </Text>
          <View style={styles.heroCount}>
            <Text style={styles.heroNumber}>{counts.all}</Text>
            <Text style={styles.heroSub}>incidents reportes</Text>
          </View>
          <View style={styles.heroStats}>
            {[
              { key: "signale",  label: "En attente", color: "#FFA726" },
              { key: "en_cours", label: "En cours",   color: "#26C6DA" },
              { key: "resolu",   label: "Resolus",    color: "#66BB6A" },
            ].map(s => (
              <View key={s.key} style={styles.heroStatCard}>
                <View style={[styles.heroStatDot, { backgroundColor: s.color }]} />
                <Text style={styles.heroStatNum}>{counts[s.key]}</Text>
                <Text style={styles.heroStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {!myCommune.id && (
          <TouchableOpacity style={styles.communeBanner} onPress={() => router.push('/edit-profile')} activeOpacity={0.8}>
            <Text style={styles.communeBannerText}>
              Definissez votre commune pour voir les signalements de votre quartier en priorite.
            </Text>
            <Text style={styles.communeBannerLink}>Choisir ma commune ›</Text>
          </TouchableOpacity>
        )}

        {/* Filtres */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]} activeOpacity={0.7}>
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label} ({counts[f.key] ?? 0})</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Liste */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {filtered.length === 0 && !error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Aucun incident</Text>
              <Text style={styles.emptySub}>Tirez vers le bas pour actualiser</Text>
            </View>
          ) : filtered.map(incident => {
            const cat = CATEGORIES[incident.category] ?? CATEGORIES.autre;
            const st  = STATUS_MAP[incident.status]   ?? STATUS_MAP.signale;
            const uv  = upvotes[incident.id];
            const timeAgo = getTimeAgo(incident.createdAt);
            return (
              <TouchableOpacity key={incident.id} style={styles.card} onPress={() => router.push(`/incident/${incident.id}`)} activeOpacity={0.7}>
                {/* Barre de couleur categorie */}
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
                      <PinIcon />
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
                          <Text style={[styles.upvoteText, uv?.upvoted && { color: '#fff' }]}>
                            {uv?.count ?? incident.upvotesCount ?? 0}
                          </Text>
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

function getTimeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "a l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  return `il y a ${Math.floor(days / 7)} sem`;
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bg },
  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, paddingTop: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EDECEA' },
  logo:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoIcon:     { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.dark, alignItems: 'center', justifyContent: 'center' },
  logoIconText: { fontSize: 13, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  logoText:     { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  logoSub:      { fontSize: 10, color: '#B0ADA8', fontWeight: '500' },

  hero:         { backgroundColor: COLORS.dark, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 },
  heroLabel:    { fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5, fontWeight: '600' },
  heroCount:    { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 },
  heroNumber:   { fontSize: 44, fontWeight: '800', color: '#fff', lineHeight: 52 },
  heroSub:      { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  heroStats:    { flexDirection: 'row', gap: 8, marginTop: 16 },
  heroStatCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 10, alignItems: 'center' },
  heroStatDot:  { width: 6, height: 6, borderRadius: 3, marginBottom: 6 },
  heroStatNum:  { fontSize: 20, fontWeight: '800', color: '#fff' },
  heroStatLabel:{ fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 2, fontWeight: '500' },

  communeBanner:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF3E0', borderRadius: 12, borderWidth: 1, borderColor: '#FFE0B2', padding: 12, marginHorizontal: 16, marginTop: 14, gap: 10 },
  communeBannerText: { flex: 1, fontSize: 12, color: '#B26A00', fontWeight: '500', lineHeight: 17 },
  communeBannerLink: { fontSize: 12, color: COLORS.dark, fontWeight: '700' },

  filterRow:    { paddingVertical: 12 },
  filterBtn:    { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EDECEA' },
  filterBtnActive: { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  filterText:   { fontSize: 12, fontWeight: '600', color: '#888' },
  filterTextActive: { color: '#fff' },

  errorText:    { color: '#C62828', textAlign: 'center', marginBottom: 12, fontSize: 13 },
  emptyState:   { alignItems: 'center', paddingTop: 60 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: '#999' },
  emptySub:     { fontSize: 12, color: '#C8C5BF', marginTop: 4 },

  card:         { backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#EDECEA', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
  cardAccent:   { height: 3 },
  cardBody:     { padding: 14 },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catTag:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catLabel:     { fontSize: 11, fontWeight: '600' },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusDot:    { width: 5, height: 5, borderRadius: 2.5 },
  statusText:   { fontSize: 10, fontWeight: '700' },
  cardDesc:     { fontSize: 13, lineHeight: 19, color: '#333', marginBottom: 10 },
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardMetaRow:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardMeta:     { fontSize: 11, color: '#999', flex: 1 },
  cardTime:     { fontSize: 10, color: '#C8C5BF', fontWeight: '500' },
  cardActions:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F5F4F2' },

  upvoteBtn:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.dark + '30', minWidth: 48, justifyContent: 'center' },
  upvoteBtnActive: { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  upvoteContent:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  upvoteText:      { fontSize: 12, fontWeight: '700', color: COLORS.dark },
  soutienLabel:    { fontSize: 11, color: '#999', fontWeight: '500' },
});
