import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { apiClient, getToken } from '../lib/api';

const COLORS = { dark: '#1A472A', orange: '#D4760A', bg: '#F5F4F2' };

const NOTIF_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  STATUS_UPDATE: { label: "Mise a jour",    color: "#2B7A9B", bg: "#E0F2F1" },
  NEW_COMMENT:   { label: "Commentaire",    color: "#5C5C8A", bg: "#EDE7F6" },
  UPVOTE:        { label: "Soutien",        color: "#D4760A", bg: "#FFF3E0" },
  SYSTEM:        { label: "Systeme",        color: "#6B6B6B", bg: "#F5F5F5" },
};

function getTimeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "a l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await apiClient(token).get('/notifications?limit=50');
      setNotifications(res.data?.data ?? res.data ?? []);
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    (async () => { await load(); setLoading(false); })();
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const markAsRead = async (id: string) => {
    try {
      const token = await getToken();
      await apiClient(token).patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch {}
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      const token = await getToken();
      await apiClient(token).patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
    finally { setMarkingAll(false); }
  };

  const handlePress = async (notif: any) => {
    if (!notif.isRead) await markAsRead(notif.id);
    if (notif.incidentId) router.push(`/incident/${notif.incidentId}`);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} disabled={markingAll} style={styles.markAllBtn}>
            {markingAll
              ? <ActivityIndicator size="small" color={COLORS.dark} />
              : <Text style={styles.markAllText}>Tout lire</Text>
            }
          </TouchableOpacity>
        ) : <View style={{ width: 60 }} />}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <View style={styles.bellTop} />
            <View style={styles.bellBody} />
          </View>
          <Text style={styles.emptyTitle}>Aucune notification</Text>
          <Text style={styles.emptySub}>Vous serez notifie des mises a jour de vos signalements</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.dark} />}
        >
          {/* Section non-lus */}
          {unreadCount > 0 && (
            <View>
              <Text style={styles.sectionLabel}>NON LUS ({unreadCount})</Text>
              {notifications.filter(n => !n.isRead).map(notif => (
                <NotifCard key={notif.id} notif={notif} onPress={() => handlePress(notif)} />
              ))}
            </View>
          )}

          {/* Section lus */}
          {notifications.filter(n => n.isRead).length > 0 && (
            <View>
              <Text style={styles.sectionLabel}>LUES</Text>
              {notifications.filter(n => n.isRead).map(notif => (
                <NotifCard key={notif.id} notif={notif} onPress={() => handlePress(notif)} />
              ))}
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

function NotifCard({ notif, onPress }: { notif: any; onPress: () => void }) {
  const config = NOTIF_CONFIG[notif.type] ?? NOTIF_CONFIG.SYSTEM;
  return (
    <TouchableOpacity
      style={[styles.card, !notif.isRead && styles.cardUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {!notif.isRead && <View style={styles.unreadDot} />}
      <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
        <View style={[styles.iconDot, { backgroundColor: config.color }]} />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.typeText, { color: config.color }]}>{config.label}</Text>
          </View>
          <Text style={styles.cardTime}>{getTimeAgo(notif.createdAt)}</Text>
        </View>
        <Text style={[styles.cardTitle, !notif.isRead && { fontWeight: '700', color: '#1A1A1A' }]}>
          {notif.title}
        </Text>
        <Text style={styles.cardBody} numberOfLines={2}>{notif.body}</Text>
        {notif.incidentId && (
          <Text style={styles.cardLink}>Voir le signalement</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.bg },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, paddingTop: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EDECEA' },
  backBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  backArrow:       { width: 9, height: 9, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#555', transform: [{ rotate: '45deg' }], marginLeft: 4 },
  headerCenter:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:     { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  unreadBadge:     { backgroundColor: COLORS.orange, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  unreadBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  markAllBtn:      { paddingHorizontal: 10, paddingVertical: 6 },
  markAllText:     { fontSize: 12, fontWeight: '700', color: COLORS.dark },

  sectionLabel:    { fontSize: 10, fontWeight: '700', color: '#B0ADA8', letterSpacing: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },

  card:            { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EDECEA', position: 'relative', gap: 12 },
  cardUnread:      { borderColor: COLORS.dark + '30', backgroundColor: '#FAFFF8' },
  unreadDot:       { position: 'absolute', top: 14, right: 14, width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.orange },
  iconBox:         { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconDot:         { width: 14, height: 14, borderRadius: 7 },
  cardContent:     { flex: 1 },
  cardTop:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  typeBadge:       { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  typeText:        { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  cardTime:        { fontSize: 10, color: '#C8C5BF' },
  cardTitle:       { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 3 },
  cardBody:        { fontSize: 12, color: '#888', lineHeight: 18 },
  cardLink:        { fontSize: 11, color: COLORS.dark, fontWeight: '700', marginTop: 6 },

  emptyState:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon:       { alignItems: 'center', marginBottom: 20 },
  bellTop:         { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D0CCC6', marginBottom: -2 },
  bellBody:        { width: 36, height: 30, borderRadius: 10, backgroundColor: '#D0CCC6' },
  emptyTitle:      { fontSize: 17, fontWeight: '700', color: '#555', marginBottom: 8 },
  emptySub:        { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20 },
});
