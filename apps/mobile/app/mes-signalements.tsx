import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { apiClient, getToken, normalizeStatus } from '../lib/api';
import { COLORS } from '../lib/theme';

const CATEGORIES: Record<string, { label: string; color: string }> = {
  inondation: { label: "Inondation",        color: "#2B7A9B" },
  electrique: { label: "Poteau electrique", color: "#D4760A" },
  depotoir:   { label: "Depot sauvage",     color: "#6B7534" },
  route:      { label: "Route degradee",    color: "#8B4513" },
  eclairage:  { label: "Eclairage public",  color: "#5C5C8A" },
  eau:        { label: "Canalisation",      color: "#3A7CA5" },
  autre:      { label: "Autre",             color: "#6B6B6B" },
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  signale:  { label: "Signale",  color: "#D4760A", bg: "#FFF3E0" },
  assigne:  { label: "Assigne",  color: "#1565C0", bg: "#E3F2FD" },
  en_cours: { label: "En cours", color: "#2B7A9B", bg: "#E0F2F1" },
  resolu:   { label: "Resolu",   color: "#2E7D32", bg: "#E8F5E9" },
  rejete:   { label: "Rejete",   color: "#C62828", bg: "#FFEBEE" },
};

function getTimeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function MesSignalementsScreen() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]       = useState<string>('all');

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      // On charge les incidents du user connecte
      const meRes = await apiClient(token).get('/users/me');
      const userId = meRes.data.id;
      const res = await apiClient(token).get(`/incidents?reporterId=${userId}&limit=100`);
      const data = (res.data?.data ?? res.data ?? []).map((i: any) => ({
        ...i,
        status: normalizeStatus(i.status),
        category: i.category?.toLowerCase() ?? 'autre',
      }));
      setIncidents(data);
    } catch {
      setIncidents([]);
    }
  }, []);

  useEffect(() => {
    (async () => { await load(); setLoading(false); })();
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const FILTERS = [
    { key: 'all',      label: 'Tous',      count: incidents.length },
    { key: 'signale',  label: 'Signales',  count: incidents.filter(i => i.status === 'signale').length },
    { key: 'en_cours', label: 'En cours',  count: incidents.filter(i => i.status === 'en_cours').length },
    { key: 'resolu',   label: 'Resolus',   count: incidents.filter(i => i.status === 'resolu').length },
  ];

  const filtered = filter === 'all' ? incidents : incidents.filter(i => i.status === filter);

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg }}>
      <ActivityIndicator size="large" color={COLORS.dark} />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <View style={styles.backArrow} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes signalements</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Stats rapides */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{incidents.length}</Text>
          <Text style={styles.statLbl}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#D4760A' }]}>
            {incidents.filter(i => i.status === 'signale').length}
          </Text>
          <Text style={styles.statLbl}>En attente</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#2B7A9B' }]}>
            {incidents.filter(i => i.status === 'en_cours').length}
          </Text>
          <Text style={styles.statLbl}>En cours</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#2E7D32' }]}>
            {incidents.filter(i => i.status === 'resolu').length}
          </Text>
          <Text style={styles.statLbl}>Resolus</Text>
        </View>
      </View>

      {/* Filtres */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={[styles.chip, filter === f.key && styles.chipActive]} activeOpacity={0.7}>
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label} ({f.count})</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Liste */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.dark} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>!</Text>
            </View>
            <Text style={styles.emptyTitle}>Aucun signalement</Text>
            <Text style={styles.emptySub}>Vous n'avez pas encore signale d'incident</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.replace('/(tabs)/report')} activeOpacity={0.8}>
              <Text style={styles.emptyBtnText}>Faire un signalement</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.map(incident => {
          const cat = CATEGORIES[incident.category] ?? CATEGORIES.autre;
          const st  = STATUS_MAP[incident.status]   ?? STATUS_MAP.signale;
          return (
            <TouchableOpacity
              key={incident.id}
              style={styles.card}
              onPress={() => router.push(`/incident/${incident.id}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.cardAccent, { backgroundColor: cat.color }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardRef}>{incident.refCode}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                    <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                    <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>
                <View style={styles.catRow}>
                  <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                  <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
                </View>
                <Text style={styles.cardDesc} numberOfLines={2}>{incident.description}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardAddr} numberOfLines={1}>{incident.address}</Text>
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardTime}>{getTimeAgo(incident.createdAt)}</Text>
                    <View style={styles.upvoteTag}>
                      <View style={styles.upvoteArrow} />
                      <Text style={styles.upvoteCount}>{incident.upvotesCount ?? 0}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.bg },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, paddingTop: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EDECEA' },
  backBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  backArrow:     { width: 9, height: 9, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#555', transform: [{ rotate: '45deg' }], marginLeft: 4 },
  headerTitle:   { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  statsBar:      { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#EDECEA' },
  statItem:      { flex: 1, alignItems: 'center' },
  statNum:       { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  statLbl:       { fontSize: 9, color: '#999', marginTop: 2, fontWeight: '500' },
  statDivider:   { width: 1, backgroundColor: '#EDECEA', marginVertical: 4 },

  filterRow:     { paddingVertical: 12, maxHeight: 52 },
  chip:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EDECEA' },
  chipActive:    { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  chipText:      { fontSize: 12, fontWeight: '600', color: '#888' },
  chipTextActive:{ color: '#fff' },

  emptyState:    { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon:     { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.dark + '14', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyIconText: { fontSize: 24, fontWeight: '900', color: COLORS.dark },
  emptyTitle:    { fontSize: 17, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptySub:      { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn:      { backgroundColor: COLORS.dark, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },

  card:          { backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#EDECEA', elevation: 1 },
  cardAccent:    { height: 3 },
  cardBody:      { padding: 14 },
  cardTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardRef:       { fontSize: 11, fontWeight: '700', color: '#999', letterSpacing: 0.5 },
  statusBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusDot:     { width: 5, height: 5, borderRadius: 2.5 },
  statusText:    { fontSize: 10, fontWeight: '700' },
  catRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  catDot:        { width: 7, height: 7, borderRadius: 3.5 },
  catLabel:      { fontSize: 11, fontWeight: '600' },
  cardDesc:      { fontSize: 13, color: '#333', lineHeight: 19, marginBottom: 10 },
  cardFooter:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F5F4F2' },
  cardAddr:      { fontSize: 11, color: '#999', flex: 1 },
  cardMeta:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTime:      { fontSize: 10, color: '#C8C5BF', fontWeight: '500' },
  upvoteTag:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  upvoteArrow:   { width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderBottomWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: COLORS.dark },
  upvoteCount:   { fontSize: 11, fontWeight: '700', color: COLORS.dark },
});
