import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { apiClient, getToken } from '../lib/api';

const COLORS = { dark: '#1A472A', orange: '#D4760A', bg: '#F5F4F2' };

export default function EditProfileScreen() {
  const [me, setMe]           = useState<any>(null);
  const [communes, setCommunes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // Champs editables
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [communeId, setCommuneId] = useState('');
  const [pendingChange, setPendingChange] = useState<{ toCommuneId: string; toCommuneName: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const [meRes, communesRes] = await Promise.all([
          apiClient(token).get('/users/me'),
          apiClient(token).get('/communes'),
        ]);
        const user = meRes.data;
        setMe(user);
        setName(user.name ?? '');
        setEmail(user.email ?? '');
        setCommuneId(user.communeId ?? '');
        setPendingChange(user.pendingCommuneChange ?? null);
        setCommunes(communesRes.data ?? []);
      } catch {
        Alert.alert('Erreur', 'Impossible de charger le profil.');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Champ requis', 'Le nom ne peut pas etre vide.');
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const res = await apiClient(token).patch('/users/me', {
        name: name.trim(),
        email: email.trim() || undefined,
        communeId: communeId || undefined,
      });
      const updated = res.data;
      const pending = updated?.pendingCommuneChange ?? null;
      setPendingChange(pending);
      if (pending && communeId !== (me?.communeId ?? '')) {
        // La commune n'a pas change cote serveur tant que la demande n'est pas validee
        setCommuneId(me?.communeId ?? '');
        Alert.alert(
          'Demande envoyee',
          `Votre changement de commune vers ${pending.toCommuneName} est en attente de validation par l'equipe de cette commune.`,
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } else {
        setMe(updated);
        Alert.alert('Profil mis a jour', 'Vos informations ont ete enregistrees.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Impossible de sauvegarder.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg }}>
      <ActivityIndicator size="large" color={COLORS.dark} />
    </View>
  );

  const initials = me?.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() ?? 'U';
  const hasChanges = name !== (me?.name ?? '') || email !== (me?.email ?? '') || communeId !== (me?.communeId ?? '');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View style={styles.backArrow} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modifier le profil</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !hasChanges}
            style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.saveBtnText}>Sauver</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.avatarSub}>Photo de profil bientot disponible</Text>
          </View>

          {/* Informations personnelles */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>INFORMATIONS PERSONNELLES</Text>
            <View style={styles.card}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Nom complet</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Votre nom complet"
                  placeholderTextColor="#C8C5BF"
                  autoCapitalize="words"
                />
              </View>

              <View style={[styles.field, { borderBottomWidth: 0 }]}>
                <Text style={styles.fieldLabel}>Adresse email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="votre@email.com (optionnel)"
                  placeholderTextColor="#C8C5BF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          {/* Telephone (lecture seule) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONTACT</Text>
            <View style={styles.card}>
              <View style={[styles.field, { borderBottomWidth: 0 }]}>
                <Text style={styles.fieldLabel}>Numero de telephone</Text>
                <View style={styles.readonlyRow}>
                  <Text style={styles.readonlyValue}>{me?.phone ?? '—'}</Text>
                  <View style={styles.readonlyBadge}>
                    <Text style={styles.readonlyBadgeText}>Non modifiable</Text>
                  </View>
                </View>
              </View>
            </View>
            <Text style={styles.fieldHint}>Pour changer de numero, allez dans Parametres → Securite.</Text>
          </View>

          {/* Commune */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MA COMMUNE</Text>
            {pendingChange && (
              <View style={styles.pendingBanner}>
                <Text style={styles.pendingBannerText}>
                  Demande en attente : passage vers <Text style={{ fontWeight: '700' }}>{pendingChange.toCommuneName}</Text>
                </Text>
              </View>
            )}
            <View style={styles.card}>
              <Text style={[styles.fieldLabel, { padding: 16, paddingBottom: 8 }]}>Selectionnez votre commune</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setCommuneId('')}
                  style={[styles.communeChip, !communeId && styles.communeChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.communeChipText, !communeId && styles.communeChipTextActive]}>Non definie</Text>
                </TouchableOpacity>
                {communes.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setCommuneId(c.id)}
                    style={[styles.communeChip, communeId === c.id && styles.communeChipActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.communeChipText, communeId === c.id && styles.communeChipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Role */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MON COMPTE</Text>
            <View style={styles.card}>
              {[
                { label: 'Role', value: me?.role === 'SUPER_ADMIN' ? 'Super Admin' : me?.role === 'ADMIN' ? 'Administrateur' : me?.role === 'AGENT' ? 'Agent' : 'Citoyen' },
                { label: 'Statut', value: me?.isVerified ? 'Verifie' : 'En attente' },
                { label: 'Membre depuis', value: me?.createdAt ? new Date(me.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '—' },
              ].map((item, idx, arr) => (
                <View key={item.label} style={[styles.field, idx === arr.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.fieldLabel}>{item.label}</Text>
                  <Text style={styles.readonlyValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Bouton sauvegarder en bas */}
          {hasChanges && (
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[styles.saveBottomBtn, saving && { opacity: 0.6 }]}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBottomBtnText}>Enregistrer les modifications</Text>
              }
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: COLORS.bg },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, paddingTop: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EDECEA' },
  backBtn:            { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  backArrow:          { width: 9, height: 9, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#555', transform: [{ rotate: '45deg' }], marginLeft: 4 },
  headerTitle:        { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  saveBtn:            { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.dark, borderRadius: 10 },
  saveBtnDisabled:    { backgroundColor: '#C8C5BF' },
  saveBtnText:        { fontSize: 12, fontWeight: '700', color: '#fff' },

  body:               { flex: 1, padding: 16 },

  avatarSection:      { alignItems: 'center', paddingVertical: 24 },
  avatar:             { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.dark, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarText:         { fontSize: 26, fontWeight: '800', color: '#fff' },
  avatarSub:          { fontSize: 11, color: '#C8C5BF' },

  section:            { marginBottom: 20 },
  sectionTitle:       { fontSize: 10, fontWeight: '700', color: '#B0ADA8', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 },
  card:               { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#EDECEA', overflow: 'hidden' },

  field:              { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F4F2' },
  fieldLabel:         { fontSize: 10, fontWeight: '700', color: '#B0ADA8', letterSpacing: 0.5, marginBottom: 6 },
  input:              { fontSize: 15, color: '#1A1A1A', fontWeight: '500', padding: 0 },
  fieldHint:          { fontSize: 11, color: '#C8C5BF', paddingLeft: 4, marginTop: 6 },

  readonlyRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readonlyValue:      { fontSize: 14, color: '#555', fontWeight: '500' },
  readonlyBadge:      { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#F5F4F2', borderRadius: 6 },
  readonlyBadgeText:  { fontSize: 10, color: '#B0ADA8', fontWeight: '600' },

  pendingBanner:      { backgroundColor: '#FFF3E0', borderRadius: 12, borderWidth: 1, borderColor: '#FFE0B2', padding: 12, marginBottom: 8 },
  pendingBannerText:  { fontSize: 12, color: '#B26A00', fontWeight: '500', lineHeight: 17 },

  communeChip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.bg, borderWidth: 1.5, borderColor: '#EDECEA' },
  communeChipActive:  { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  communeChipText:    { fontSize: 12, fontWeight: '600', color: '#666' },
  communeChipTextActive: { color: '#fff' },

  saveBottomBtn:      { backgroundColor: COLORS.dark, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12 },
  saveBottomBtnText:  { color: '#fff', fontSize: 15, fontWeight: '700' },
});
