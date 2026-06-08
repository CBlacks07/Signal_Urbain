import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { apiClient, getToken, API_BASE } from '../../lib/api';

const COLORS = { dark: '#1A472A', orange: '#D4760A', bg: '#F5F4F2' };

const CATEGORIES = [
  { id: "inondation", label: "Inondation",        color: "#2B7A9B" },
  { id: "electrique", label: "Poteau electrique", color: "#D4760A" },
  { id: "depotoir",   label: "Depot sauvage",     color: "#6B7534" },
  { id: "route",      label: "Route degradee",    color: "#8B4513" },
  { id: "eclairage",  label: "Eclairage public",  color: "#5C5C8A" },
  { id: "eau",        label: "Canalisation",      color: "#3A7CA5" },
  { id: "autre",      label: "Autre incident",    color: "#6B6B6B" },
];

const COMMUNES = [
  "Golfe 1", "Golfe 2", "Golfe 3", "Golfe 4", "Golfe 5", "Golfe 6", "Golfe 7",
  "Agoe-Nyive 1", "Agoe-Nyive 2", "Agoe-Nyive 3", "Agoe-Nyive 4", "Agoe-Nyive 5",
];

const STEPS = [
  { num: 1, label: "Categorie" },
  { num: 2, label: "Description" },
  { num: 3, label: "Localisation" },
];

export default function ReportScreen() {
  const [step, setStep]             = useState(1);
  const [category, setCategory]     = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [address, setAddress]       = useState('');
  const [commune, setCommune]       = useState('');
  const [latitude, setLatitude]     = useState<number | null>(null);
  const [longitude, setLongitude]   = useState<number | null>(null);
  const [locating, setLocating]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos]         = useState<string[]>([]); // URIs locales

  const pickPhoto = async () => {
    if (photos.length >= 3) {
      Alert.alert('Maximum atteint', '3 photos maximum par signalement.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusee', "Autorisez l'acces a la galerie dans les parametres.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  const removePhoto = (uri: string) => {
    setPhotos(prev => prev.filter(p => p !== uri));
  };

  const handleLocate = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusee', "Autorisez l'acces a la localisation dans les parametres.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      const [place] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (place) {
        const parts = [place.street, place.district, place.city].filter(Boolean);
        setAddress(parts.join(', ') || 'Position GPS detectee');
      } else {
        setAddress('Position GPS detectee');
      }
    } catch {
      setAddress('Position GPS detectee');
      setLatitude(6.1375); setLongitude(1.2123);
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (!category || !description || (!address.trim() && !commune)) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      const communesRes = await apiClient(token).get('/communes');
      const communeData = (communesRes.data ?? []).find((c: any) => c.name === commune);
      const incidentRes = await apiClient(token).post('/incidents', {
        category,
        description,
        address: address || commune,
        latitude:  latitude  ?? 6.1375,
        longitude: longitude ?? 1.2123,
        communeId: communeData?.id,
      });

      // Upload des photos si presentes
      if (photos.length > 0 && incidentRes.data?.id) {
        const incidentId = incidentRes.data.id;
        for (const uri of photos) {
          try {
            const formData = new FormData();
            const filename = uri.split('/').pop() ?? 'photo.jpg';
            formData.append('file', { uri, name: filename, type: 'image/jpeg' } as any);
            formData.append('incidentId', incidentId);
            await apiClient(token).post('/uploads/photo', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          } catch { /* photo non critique */ }
        }
      }
      Alert.alert(
        'Signalement envoye',
        `Votre signalement a ete transmis a la mairie de ${commune || 'votre commune'}.`,
        [{ text: 'Voir les signalements', onPress: () => {
          setStep(1); setCategory(null); setDescription('');
          setAddress(''); setCommune(''); setLatitude(null); setLongitude(null);
          router.replace('/(tabs)');
        }}]
      );
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? "Impossible d'envoyer le signalement.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCat = CATEGORIES.find(c => c.id === category);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => step > 1 ? setStep(step - 1) : router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.backArrow} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouveau signalement</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Progress stepper */}
      <View style={styles.stepper}>
        {STEPS.map((s, idx) => (
          <View key={s.num} style={styles.stepperItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.stepCircle, step >= s.num && styles.stepCircleActive, step > s.num && styles.stepCircleDone]}>
                {step > s.num ? (
                  <View style={styles.checkmark} />
                ) : (
                  <Text style={[styles.stepNum, step >= s.num && { color: '#fff' }]}>{s.num}</Text>
                )}
              </View>
              {idx < STEPS.length - 1 && (
                <View style={[styles.stepLine, step > s.num && styles.stepLineActive]} />
              )}
            </View>
            <Text style={[styles.stepLabel, step === s.num && styles.stepLabelActive]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ETAPE 1 — Categorie */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Type d'incident</Text>
            <Text style={styles.stepSub}>Selectionnez la categorie qui correspond le mieux</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => { setCategory(cat.id); setStep(2); }}
                  style={[styles.categoryCard, category === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '0D' }]}
                  activeOpacity={0.65}
                >
                  <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                  <Text style={[styles.categoryLabel, category === cat.id && { color: cat.color, fontWeight: '700' }]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ETAPE 2 — Description */}
        {step === 2 && (
          <View>
            {selectedCat && (
              <View style={[styles.selectedCatBanner, { backgroundColor: selectedCat.color + '12', borderLeftColor: selectedCat.color }]}>
                <View style={[styles.categoryDot, { backgroundColor: selectedCat.color }]} />
                <Text style={[styles.selectedCatText, { color: selectedCat.color }]}>{selectedCat.label}</Text>
              </View>
            )}
            <Text style={styles.stepTitle}>Decrivez l'incident</Text>
            <Text style={styles.stepSub}>Plus de details = traitement plus rapide</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Decrivez ce que vous voyez, depuis quand c'est la, les risques potentiels..."
              multiline
              style={styles.textarea}
              textAlignVertical="top"
              placeholderTextColor="#C8C5BF"
            />
            <View style={styles.charRow}>
              <Text style={[styles.charCount, description.length >= 20 && { color: COLORS.dark }]}>
                {description.length} / 20 min.
              </Text>
              {description.length >= 20 && <Text style={styles.charOk}>Bon</Text>}
            </View>

            {/* Photos */}
            <Text style={styles.fieldLabel}>PHOTOS (optionnel, max 3)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 10 }}>
              {photos.map(uri => (
                <View key={uri} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.photoImg} />
                  <TouchableOpacity onPress={() => removePhoto(uri)} style={styles.photoRemove}>
                    <Text style={styles.photoRemoveText}>x</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 3 && (
                <TouchableOpacity onPress={pickPhoto} style={styles.photoAdd} activeOpacity={0.7}>
                  <Text style={styles.photoAddIcon}>+</Text>
                  <Text style={styles.photoAddText}>Ajouter</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setStep(3)}
              disabled={description.length < 20}
              style={[styles.btn, description.length < 20 && styles.btnDisabled]}
              activeOpacity={0.8}
            >
              <Text style={styles.btnText}>Continuer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ETAPE 3 — Localisation */}
        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Localisation</Text>
            <Text style={styles.stepSub}>La localisation aide la mairie a intervenir rapidement</Text>

            {/* GPS */}
            <TouchableOpacity
              onPress={handleLocate}
              disabled={locating}
              style={[styles.gpsBtn, latitude && styles.gpsBtnSuccess]}
              activeOpacity={0.7}
            >
              {locating ? (
                <ActivityIndicator color={COLORS.dark} size="small" />
              ) : (
                <View style={styles.gpsBtnInner}>
                  <View style={[styles.gpsDot, latitude && { backgroundColor: '#2E7D32' }]} />
                  <Text style={[styles.gpsBtnText, latitude && { color: '#2E7D32' }]}>
                    {latitude ? 'Position GPS obtenue' : 'Detecter ma position GPS'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Adresse manuelle */}
            <Text style={styles.fieldLabel}>ADRESSE OU POINT DE REPERE</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Ex: Carrefour AGF, Rue 54, Lome..."
              style={styles.input}
              placeholderTextColor="#C8C5BF"
            />

            {/* Communes */}
            <Text style={styles.fieldLabel}>COMMUNE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }} contentContainerStyle={{ gap: 8 }}>
              {COMMUNES.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCommune(c)}
                  style={[styles.chip, commune === c && styles.chipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, commune === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Recapitulatif */}
            {(selectedCat || description || address || commune) && (
              <View style={styles.recap}>
                <Text style={styles.recapTitle}>RECAPITULATIF</Text>
                {selectedCat && <Text style={styles.recapLine}>Categorie : <Text style={styles.recapValue}>{selectedCat.label}</Text></Text>}
                {description && <Text style={styles.recapLine}>Description : <Text style={styles.recapValue} numberOfLines={2}>{description}</Text></Text>}
                {(address || commune) && <Text style={styles.recapLine}>Lieu : <Text style={styles.recapValue}>{address || commune}</Text></Text>}
              </View>
            )}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || (!address.trim() && !commune)}
              style={[styles.btnSubmit, (submitting || (!address.trim() && !commune)) && styles.btnDisabled]}
              activeOpacity={0.8}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Envoyer le signalement</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.bg },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, paddingTop: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EDECEA' },
  backBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  backArrow:      { width: 9, height: 9, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#555', transform: [{ rotate: '45deg' }], marginLeft: 4 },
  headerTitle:    { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },

  stepper:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', backgroundColor: '#fff', paddingHorizontal: 24, paddingBottom: 16, paddingTop: 12, gap: 0 },
  stepperItem:    { alignItems: 'center', flex: 1 },
  stepCircle:     { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8E6E2', alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: COLORS.dark },
  stepCircleDone: { backgroundColor: '#2E7D32' },
  checkmark:      { width: 8, height: 5, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#fff', transform: [{ rotate: '-45deg' }, { translateY: -1 }] },
  stepNum:        { fontSize: 12, fontWeight: '700', color: '#999' },
  stepLine:       { width: 32, height: 2, backgroundColor: '#E8E6E2', marginHorizontal: 4 },
  stepLineActive: { backgroundColor: '#2E7D32' },
  stepLabel:      { fontSize: 9, color: '#C8C5BF', marginTop: 4, fontWeight: '600', letterSpacing: 0.3 },
  stepLabelActive: { color: COLORS.dark },

  content:        { flex: 1, padding: 20 },
  stepTitle:      { fontSize: 19, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  stepSub:        { fontSize: 12, color: '#999', marginBottom: 20 },

  selectedCatBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderLeftWidth: 3, marginBottom: 16 },
  selectedCatText:   { fontSize: 12, fontWeight: '700' },

  categoryGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryCard:   { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#EDECEA' },
  categoryDot:    { width: 8, height: 8, borderRadius: 4 },
  categoryLabel:  { fontSize: 12, fontWeight: '500', color: '#444', flex: 1 },

  textarea:       { borderRadius: 12, borderWidth: 1.5, borderColor: '#EDECEA', padding: 14, fontSize: 14, backgroundColor: '#fff', minHeight: 120, color: '#1A1A1A', lineHeight: 22 },
  charRow:        { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 20 },
  charCount:      { fontSize: 11, color: '#C8C5BF', fontWeight: '500' },
  charOk:         { fontSize: 10, color: COLORS.dark, fontWeight: '700', backgroundColor: COLORS.dark + '14', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },

  btn:            { backgroundColor: COLORS.dark, borderRadius: 12, padding: 15, alignItems: 'center' },
  btnSubmit:      { backgroundColor: COLORS.orange, borderRadius: 12, padding: 16, alignItems: 'center' },
  btnDisabled:    { backgroundColor: '#C8C5BF' },
  btnText:        { color: '#fff', fontSize: 15, fontWeight: '700' },

  gpsBtn:         { borderWidth: 1.5, borderColor: COLORS.dark + '40', borderRadius: 12, padding: 14, marginBottom: 20, alignItems: 'center', backgroundColor: '#fff' },
  gpsBtnSuccess:  { borderColor: '#2E7D32', backgroundColor: '#F1F8F2' },
  gpsBtnInner:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gpsDot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.dark },
  gpsBtnText:     { fontSize: 14, fontWeight: '600', color: COLORS.dark },

  dividerRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  dividerLine:    { flex: 1, height: 1, backgroundColor: '#EDECEA' },
  dividerText:    { fontSize: 12, color: '#C8C5BF', fontWeight: '500' },

  fieldLabel:     { fontSize: 10, fontWeight: '700', color: '#999', letterSpacing: 1, marginBottom: 8 },
  input:          { borderWidth: 1.5, borderColor: '#EDECEA', borderRadius: 12, padding: 14, fontSize: 14, backgroundColor: '#fff', marginBottom: 20, color: '#1A1A1A' },

  photoThumb:     { width: 80, height: 80, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  photoImg:       { width: 80, height: 80 },
  photoRemove:    { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  photoRemoveText:{ color: '#fff', fontSize: 11, fontWeight: '700', lineHeight: 14 },
  photoAdd:       { width: 80, height: 80, borderRadius: 10, borderWidth: 1.5, borderColor: '#EDECEA', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  photoAddIcon:   { fontSize: 22, color: '#C8C5BF', lineHeight: 28 },
  photoAddText:   { fontSize: 10, color: '#C8C5BF', fontWeight: '600' },

  chip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#EDECEA' },
  chipActive:     { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  chipText:       { fontSize: 12, fontWeight: '600', color: '#666' },
  chipTextActive: { color: '#fff' },

  recap:          { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#EDECEA' },
  recapTitle:     { fontSize: 9, fontWeight: '700', color: '#C8C5BF', letterSpacing: 1.2, marginBottom: 10 },
  recapLine:      { fontSize: 12, color: '#888', marginBottom: 4 },
  recapValue:     { color: '#1A1A1A', fontWeight: '600' },
});
