import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { apiClient, getToken, clearToken } from '../../lib/api';
import { COLORS } from '../../lib/theme';

const ROLE_LABELS: Record<string, string> = {
  CITIZEN: 'Citoyen',
  AGENT: 'Agent',
  ADMIN: 'Administrateur',
  SUPER_ADMIN: 'Super Admin',
};

// Icones dessinées avec des View purs
function ChevronRight({ color = '#C8C5BF' }: { color?: string }) {
  return (
    <View style={{
      width: 8, height: 8,
      borderRightWidth: 2, borderBottomWidth: 2,
      borderColor: color, transform: [{ rotate: '-45deg' }],
    }} />
  );
}

function SettingsIcon() {
  return (
    <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#999', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, borderWidth: 1.5, borderColor: '#999' }} />
    </View>
  );
}

export default function ProfileScreen() {
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Recharge le profil a chaque fois que l'onglet reprend le focus,
  // pour refleter les changements faits depuis "Modifier le profil"
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const token = await getToken();
          const res = await apiClient(token).get('/users/me');
          if (!cancelled) setMe(res.data);
        } catch {
          if (!cancelled) {
            await clearToken();
            router.replace('/login');
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [])
  );

  const handleLogout = () => {
    Alert.alert(
      'Deconnexion',
      'Voulez-vous vraiment vous deconnecter de Signal Urbain Togo ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se deconnecter', style: 'destructive',
          onPress: async () => { await clearToken(); router.replace('/login'); },
        },
      ]
    );
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg }}>
      <ActivityIndicator size="large" color={COLORS.dark} />
    </View>
  );

  const initials = me?.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() ?? 'U';
  const displayName = me?.name ?? 'Utilisateur';
  const roleLabel = ROLE_LABELS[me?.role] ?? 'Citoyen';
  const signalements = me?._count?.reportedIncidents ?? 0;
  const soutiens = me?._count?.upvotes ?? 0;
  const communeName = me?.commune?.name ?? null;
  const pendingChange = me?.pendingCommuneChange ?? null;

  const MENU_ITEMS = [
    { label: 'Mes signalements', subtitle: `${signalements} signalement${signalements > 1 ? 's' : ''}`, action: () => router.push('/mes-signalements') },
    { label: 'Notifications', subtitle: 'Alertes et mises a jour', action: () => router.push('/notifications') },
    { label: 'Ma commune', subtitle: pendingChange ? `En attente de validation vers ${pendingChange.toCommuneName}` : (communeName ?? 'Non definie'), action: () => router.push('/edit-profile') },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Profil</Text>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/edit-profile')}>
            <SettingsIcon />
          </TouchableOpacity>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.phone}>{me?.phone ?? ''}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{roleLabel}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Statistiques */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{signalements}</Text>
            <Text style={styles.statLabel}>Signalements</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{soutiens}</Text>
            <Text style={styles.statLabel}>Soutiens</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { fontSize: communeName ? 16 : 22 }]}>
              {communeName ? communeName.split(' ').pop() : '--'}
            </Text>
            <Text style={styles.statLabel}>Commune</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>GENERAL</Text>
          <View style={styles.menuCard}>
            {MENU_ITEMS.map((item, idx) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuItem, idx < MENU_ITEMS.length - 1 && styles.menuItemBorder]}
                onPress={item.action}
                activeOpacity={0.6}
              >
                <View style={styles.menuContent}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSub}>{item.subtitle}</Text>
                </View>
                <ChevronRight />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Deconnexion */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>COMPTE</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout} activeOpacity={0.6}>
              <View style={styles.menuContent}>
                <Text style={[styles.menuLabel, { color: '#C62828' }]}>Deconnexion</Text>
                <Text style={styles.menuSub}>Fermer la session en cours</Text>
              </View>
              <ChevronRight color="#C62828" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Version */}
        <Text style={styles.version}>Signal Urbain Togo v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bg },
  header:       { backgroundColor: '#fff', paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#EDECEA' },
  headerTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  settingsBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F4F2', alignItems: 'center', justifyContent: 'center' },
  profileRow:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar:       { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.dark, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 20, fontWeight: '800', color: '#fff' },
  profileInfo:  { flex: 1 },
  name:         { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  phone:        { fontSize: 13, color: '#888', marginTop: 2 },
  roleBadge:    { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: COLORS.dark + '12' },
  roleText:     { fontSize: 10, fontWeight: '700', color: COLORS.dark, letterSpacing: 0.5 },
  body:         { flex: 1, padding: 16 },
  statsRow:     { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#EDECEA' },
  statCard:     { flex: 1, alignItems: 'center' },
  statDivider:  { width: 1, backgroundColor: '#EDECEA', marginVertical: 4 },
  statValue:    { fontSize: 22, fontWeight: '800', color: COLORS.dark },
  statLabel:    { fontSize: 10, color: '#999', marginTop: 4, fontWeight: '500' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#999', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 },
  menuSection:  { marginBottom: 20 },
  menuCard:     { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#EDECEA', overflow: 'hidden' },
  menuItem:     { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F4F2' },
  menuContent:  { flex: 1 },
  menuLabel:    { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  menuSub:      { fontSize: 11, color: '#999', marginTop: 2 },
  version:      { textAlign: 'center', fontSize: 11, color: '#C8C5BF', marginTop: 12, marginBottom: 32 },
});
