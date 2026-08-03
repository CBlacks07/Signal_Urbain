import { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { apiClient, getToken } from '../../lib/api';
import { COLORS } from '../../lib/theme';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';

const CATEGORIES: Record<string, { label: string; color: string }> = {
  inondation: { label: "Inondation",         color: "#2B7A9B" },
  electrique: { label: "Poteau électrique",  color: "#D4760A" },
  depotoir:   { label: "Dépotoir sauvage",   color: "#6B7534" },
  route:      { label: "Route dégradée",     color: "#8B4513" },
  eclairage:  { label: "Éclairage public",   color: "#5C5C8A" },
  eau:        { label: "Canalisation / Eau", color: "#3A7CA5" },
  autre:      { label: "Autre",              color: "#6B6B6B" },
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  signale:  { label: "Signalé",  color: "#E65100", bg: "#FFF3E0" },
  assigne:  { label: "Assigné",  color: "#1565C0", bg: "#E3F2FD" },
  en_cours: { label: "En cours", color: "#F9A825", bg: "#FFFDE7" },
  resolu:   { label: "Résolu",   color: "#2E7D32", bg: "#E8F5E9" },
  rejete:   { label: "Rejeté",   color: "#C62828", bg: "#FFEBEE" },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  critique: { label: "Critique", color: "#C62828" },
  haute:    { label: "Haute",    color: "#E65100" },
  moyenne:  { label: "Moyenne",  color: "#F9A825" },
  basse:    { label: "Basse",    color: "#2E7D32" },
};

export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [incident, setIncident] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [upvoted, setUpvoted]   = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [upvoteLoading, setUpvoteLoading] = useState(false);
  const [comment, setComment]   = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const [incRes, commRes, meRes] = await Promise.all([
        apiClient(token).get(`/incidents/${id}`),
        apiClient(token).get(`/incidents/${id}/comments`),
        apiClient(token).get('/users/me'),
      ]);
      const inc = incRes.data;
      setIncident(inc);
      setUpvoteCount(inc.upvotesCount ?? 0);
      setComments(commRes.data ?? []);
      setMyUserId(meRes.data.id);
      // Vérifie si l'utilisateur a déjà upvoté
      const alreadyUpvoted = (inc.upvotes ?? []).some((u: any) => u.userId === meRes.data.id);
      setUpvoted(alreadyUpvoted);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger l\'incident.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const toggleUpvote = async () => {
    if (upvoteLoading) return;
    setUpvoteLoading(true);
    try {
      const token = await getToken();
      if (upvoted) {
        await apiClient(token).delete(`/incidents/${id}/upvote`);
        setUpvoteCount(c => c - 1);
        setUpvoted(false);
      } else {
        await apiClient(token).post(`/incidents/${id}/upvote`);
        setUpvoteCount(c => c + 1);
        setUpvoted(true);
      }
    } catch {}
    finally { setUpvoteLoading(false); }
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    setSendingComment(true);
    try {
      const token = await getToken();
      await apiClient(token).post(`/incidents/${id}/comments`, { content: comment.trim() });
      setComment('');
      const res = await apiClient(token).get(`/incidents/${id}/comments`);
      setComments(res.data ?? []);
    } catch {}
    finally { setSendingComment(false); }
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgLight }}>
      <ActivityIndicator size="large" color={COLORS.dark} />
    </View>
  );
  if (!incident) return null;

  const cat = CATEGORIES[incident.category?.toLowerCase()] ?? CATEGORIES.autre;
  const st  = STATUS_MAP[incident.status?.toLowerCase()] ?? STATUS_MAP.signale;
  const pr  = PRIORITY_MAP[incident.priority?.toLowerCase()] ?? PRIORITY_MAP.moyenne;
  const dateStr = incident.createdAt ? new Date(incident.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ fontSize: 20, color: '#fff' }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerRef}>{incident.refCode}</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAwareScrollView>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: cat.color }]}>
          <View style={styles.heroBadges}>
            <View style={[styles.badge, { backgroundColor: st.bg }]}>
              <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
            </View>
            <Text style={[styles.priorityText, { color: pr.color }]}>{pr.label}</Text>
          </View>
          <Text style={styles.heroCategory}>{cat.label}</Text>
          <Text style={styles.heroDate}>{dateStr}</Text>
        </View>

        <View style={styles.body}>
          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{incident.description}</Text>
          </View>

          {/* Localisation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Localisation</Text>
            <Text style={styles.metaLine}>{incident.address}</Text>
            {incident.commune?.name && <Text style={styles.metaLine}>{incident.commune.name}</Text>}
          </View>

          {/* Photos avant / après */}
          {(incident.photos ?? []).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Constat avant</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: (incident.photos ?? []).some((p: any) => p.kind === 'APRES') ? 16 : 0 }}>
                {(incident.photos ?? []).filter((p: any) => p.kind !== 'APRES').map((p: any) => (
                  <Image key={p.id} source={{ uri: p.thumbnailUrl || p.url }} style={styles.photoThumb} />
                ))}
              </ScrollView>
              {(incident.photos ?? []).some((p: any) => p.kind === 'APRES') && (
                <>
                  <Text style={styles.sectionTitle}>Preuve après intervention</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {(incident.photos ?? []).filter((p: any) => p.kind === 'APRES').map((p: any) => (
                      <Image key={p.id} source={{ uri: p.thumbnailUrl || p.url }} style={styles.photoThumb} />
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
          )}

          {/* Signalé par */}
          {incident.reporter && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Signalé par</Text>
              <Text style={styles.metaLine}>{incident.reporter.name}</Text>
            </View>
          )}

          {/* Upvote */}
          <TouchableOpacity onPress={toggleUpvote} disabled={upvoteLoading} style={[styles.upvoteBtn, upvoted && styles.upvoteBtnActive]}>
            <Text style={[styles.upvoteIcon, upvoted && { color: '#fff' }]}>▲</Text>
            <Text style={[styles.upvoteText, upvoted && { color: '#fff' }]}>
              {upvoted ? 'Soutenu' : 'Soutenir ce signalement'} · {upvoteCount}
            </Text>
          </TouchableOpacity>

          {/* Commentaires */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Commentaires ({comments.length})</Text>

            {/* Saisie */}
            <View style={styles.commentInputRow}>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Ajouter un commentaire..."
                style={styles.commentInput}
                multiline
              />
              <TouchableOpacity onPress={sendComment} disabled={sendingComment || !comment.trim()} style={[styles.sendBtn, (!comment.trim()) && { opacity: 0.4 }]}>
                {sendingComment ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Envoyer</Text>}
              </TouchableOpacity>
            </View>

            {comments.length === 0 ? (
              <Text style={{ color: '#bbb', fontSize: 13, textAlign: 'center', marginTop: 16 }}>Aucun commentaire</Text>
            ) : comments.map((c: any) => (
              <View key={c.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{c.user?.name ?? 'Inconnu'}</Text>
                  <Text style={styles.commentDate}>{new Date(c.createdAt).toLocaleDateString('fr-FR')}</Text>
                </View>
                <Text style={styles.commentContent}>{c.content}</Text>
              </View>
            ))}
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.bgLight },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 52, backgroundColor: COLORS.dark },
  backBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerRef:       { fontSize: 14, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  hero:            { padding: 24, paddingBottom: 28 },
  heroBadges:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  badge:           { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeText:       { fontSize: 12, fontWeight: '700' },
  priorityText:    { fontSize: 12, fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  heroCategory:    { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  heroDate:        { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  body:            { padding: 20 },
  section:         { marginBottom: 20 },
  sectionTitle:    { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  description:     { fontSize: 14, lineHeight: 22, color: '#2c2c2c' },
  metaLine:        { fontSize: 13, color: '#555', marginBottom: 4 },
  photoThumb:      { width: 96, height: 96, borderRadius: 10, marginRight: 8, backgroundColor: '#EDECEA' },
  upvoteBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 14, borderWidth: 2, borderColor: COLORS.dark, marginBottom: 20 },
  upvoteBtnActive: { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  upvoteIcon:      { fontSize: 16, color: COLORS.dark },
  upvoteText:      { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  commentInputRow: { flexDirection: 'row', gap: 10, marginBottom: 14, alignItems: 'flex-end' },
  commentInput:    { flex: 1, borderWidth: 1.5, borderColor: '#e8e5e0', borderRadius: 12, padding: 12, fontSize: 13, color: '#333', minHeight: 44, maxHeight: 100 },
  sendBtn:         { backgroundColor: COLORS.dark, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  commentCard:     { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f0ede8' },
  commentHeader:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  commentAuthor:   { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },
  commentDate:     { fontSize: 11, color: '#bbb' },
  commentContent:  { fontSize: 13, color: '#444', lineHeight: 20 },
});
