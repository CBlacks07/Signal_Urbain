import { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Check } from 'lucide-react-native';
import { router } from 'expo-router';
import { apiClient, saveToken, getToken, decodeJwt } from '../lib/api';
import { FONT_FAMILY } from '../lib/theme';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';

type Step = 'phone' | 'otp' | 'name' | 'commune' | 'guest' | 'done';
const STEP_ORDER: Step[] = ['phone', 'otp', 'name', 'commune'];
const DARK = '#1A472A';
const ACCENT = '#D4760A';

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugCode, setDebugCode] = useState('');
  const [communes, setCommunes] = useState<{ id: string; name: string }[]>([]);
  const [communeId, setCommuneId] = useState('');
  const otpInputRef = useRef<TextInput>(null);

  const fullPhone = `+228${phone.replace(/\D/g, '')}`;

  const goToHome = async () => {
    const token = await getToken();
    const decoded = token ? decodeJwt(token) : null;
    router.replace(decoded?.role === 'AGENT' ? '/(agent)' : '/(tabs)');
  };

  const requestOtp = async () => {
    if (phone.replace(/\D/g, '').length < 8) { setError('Entrez votre numéro de téléphone'); return; }
    setLoading(true); setError('');
    try {
      const res = await apiClient().post('/auth/request-otp', { phone: fullPhone });
      setDebugCode(res.data.debug_code ? `Code dev : ${res.data.debug_code}` : '');
      setOtp('');
      setStep('otp');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erreur réseau. Vérifiez votre connexion.');
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (otp.length < 6) { setError('Entrez le code à 6 chiffres'); return; }
    setLoading(true); setError('');
    try {
      const res = await apiClient().post('/auth/verify-otp', { phone: fullPhone, code: otp });
      await saveToken(res.data.access_token);
      if (res.data.needsProfile) setStep('name');
      else await goToHome();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Code incorrect ou expiré.');
    } finally { setLoading(false); }
  };

  const submitName = async () => {
    if (!name.trim()) { setError('Entrez votre nom complet'); return; }
    setLoading(true); setError('');
    try {
      const token = await getToken();
      await apiClient(token).patch('/users/me', { name: name.trim() });
      const res = await apiClient(token).get('/communes');
      setCommunes(res.data ?? []);
      setStep('commune');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Impossible d'enregistrer votre nom.");
    } finally { setLoading(false); }
  };

  const submitCommune = async () => {
    if (!communeId) { setError('Sélectionnez votre commune'); return; }
    setLoading(true); setError('');
    try {
      const token = await getToken();
      await apiClient(token).patch('/users/me', { communeId });
      setStep('done');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Impossible d'enregistrer votre commune.");
    } finally { setLoading(false); }
  };

  const currentIndex = STEP_ORDER.indexOf(step);
  const showDots = currentIndex !== -1;
  const otpDigits = Array.from({ length: 6 }, (_, i) => otp[i] ?? '');

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* En-tête */}
        <LinearGradient colors={['#1A472A', '#123821']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.blobOrange} />
          <View style={styles.blobWhite} />

          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Image source={require('../assets/mark.png')} style={styles.logoImg} resizeMode="contain" />
            </View>
            <View>
              <Text style={styles.wordmark}>Signal<Text style={{ color: '#E8950F' }}>Togo</Text></Text>
              <Text style={styles.tagline}>Votre quartier, votre voix</Text>
            </View>
          </View>

          <Text style={styles.headline}>Ensemble, améliorons{'\n'}nos quartiers.</Text>
        </LinearGradient>

        {/* Carte */}
        <View style={styles.card}>
          {showDots && (
            <View style={styles.dotsRow}>
              {STEP_ORDER.map((key, i) => {
                const filled = i <= currentIndex;
                const active = i === currentIndex;
                return <View key={key} style={[styles.dot, { width: active ? 26 : 8, backgroundColor: filled ? ACCENT : '#E3E0DA' }]} />;
              })}
            </View>
          )}

          {step === 'phone' && (
            <>
              <Text style={styles.title}>Connexion</Text>
              <Text style={styles.subtitle}>Entrez votre numéro togolais pour rejoindre les habitants de votre quartier.</Text>
              <Text style={styles.label}>NUMÉRO DE TÉLÉPHONE</Text>
              <View style={styles.inputRow}>
                <Text style={styles.prefix}>+228</Text>
                <TextInput
                  value={phone}
                  onChangeText={(v) => { setPhone(v.replace(/\D/g, '').slice(0, 8)); setError(''); }}
                  placeholder="90 00 00 00"
                  keyboardType="phone-pad"
                  style={styles.input}
                  autoFocus
                />
              </View>
              {!!error && <Text style={styles.error}>{error}</Text>}
              <TouchableOpacity onPress={requestOtp} disabled={loading} activeOpacity={0.85}>
                <LinearGradient colors={['#D4760A', '#E8950F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtn}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Recevoir le code</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.trustBox}>
                <Lock size={15} color="#2E7D32" style={{ marginTop: 1 }} />
                <Text style={styles.trustText}>Vos données restent privées et servent uniquement à vérifier votre identité.</Text>
              </View>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep('guest')} activeOpacity={0.8}>
                <Text style={styles.ghostBtnText}>Explorer sans compte</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={styles.title}>Vérification</Text>
              <Text style={styles.subtitle}>Code envoyé au {fullPhone}</Text>
              {!!debugCode && <Text style={styles.debugCode}>{debugCode}</Text>}
              <Text style={[styles.label, { marginTop: 16 }]}>CODE À 6 CHIFFRES</Text>
              <TouchableOpacity activeOpacity={1} onPress={() => otpInputRef.current?.focus()}>
                <View style={styles.otpRow}>
                  {otpDigits.map((d, i) => (
                    <View key={i} style={styles.otpBox}><Text style={styles.otpDigit}>{d}</Text></View>
                  ))}
                </View>
                <TextInput
                  ref={otpInputRef}
                  value={otp}
                  onChangeText={(v) => { setOtp(v.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.hiddenInput}
                  autoFocus
                />
              </TouchableOpacity>
              {!!error && <Text style={[styles.error, { marginTop: 10 }]}>{error}</Text>}
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: DARK, marginTop: 20 }]} onPress={verifyOtp} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Se connecter</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkBtn} onPress={() => { setStep('phone'); setOtp(''); setError(''); setDebugCode(''); }}>
                <Text style={styles.linkBtnText}>Changer le numéro</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'name' && (
            <>
              <Text style={styles.title}>Bienvenue !</Text>
              <Text style={styles.subtitle}>Comment souhaitez-vous être identifié par vos voisins ?</Text>
              <Text style={styles.label}>NOM COMPLET</Text>
              <TextInput
                value={name}
                onChangeText={(v) => { setName(v); setError(''); }}
                placeholder="Ex: Komi Agbeko"
                autoCapitalize="words"
                autoFocus
                style={styles.plainInput}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: DARK }]} onPress={submitName} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Continuer</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === 'commune' && (
            <>
              <Text style={styles.title}>Votre commune</Text>
              <Text style={styles.subtitle}>Choisissez votre commune pour voir les signalements près de chez vous.</Text>
              <Text style={styles.label}>COMMUNE</Text>
              <View style={styles.chipsWrap}>
                {communes.length === 0 ? (
                  <ActivityIndicator color={DARK} style={{ marginVertical: 16 }} />
                ) : communes.map((c) => {
                  const selected = communeId === c.id;
                  return (
                    <TouchableOpacity key={c.id} onPress={() => { setCommuneId(c.id); setError(''); }}
                      style={[styles.chip, selected && styles.chipActive]} activeOpacity={0.7}>
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{c.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {!!error && <Text style={styles.error}>{error}</Text>}
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: DARK }]} onPress={submitCommune} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Terminer</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === 'guest' && (
            <>
              <Text style={styles.title}>Mode invité</Text>
              <Text style={[styles.subtitle, { marginBottom: 20, lineHeight: 21 }]}>
                Vous pouvez consulter les signalements de votre ville, mais la création de signalement, le vote et les commentaires nécessitent un compte vérifié.
              </Text>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: DARK }]} onPress={() => setStep('phone')} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Créer un compte</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ghostBtn, { marginTop: 10 }]} onPress={() => setStep('phone')} activeOpacity={0.8}>
                <Text style={styles.ghostBtnText}>Retour</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'done' && (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <View style={styles.doneCircle}><Check size={30} color="#2E7D32" /></View>
              <Text style={[styles.title, { textAlign: 'center' }]}>Bienvenue, {name} !</Text>
              <Text style={[styles.subtitle, { textAlign: 'center', marginBottom: 22 }]}>Votre compte est prêt. Découvrez les signalements de votre quartier.</Text>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: DARK, width: '100%' }]} onPress={goToHome} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Explorer l'app</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3EF' },

  header: { position: 'relative', paddingTop: 56, paddingHorizontal: 24, paddingBottom: 64, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden' },
  blobOrange: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(212,118,10,0.22)' },
  blobWhite: { position: 'absolute', bottom: -60, left: -30, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.05)' },

  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBadge: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6 },
  logoImg: { width: 36, height: 36 },
  wordmark: { fontFamily: FONT_FAMILY.displayBold, fontWeight: '800', fontSize: 19, color: '#fff', letterSpacing: -0.2 },
  tagline: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  headline: { fontFamily: FONT_FAMILY.displayBold, fontWeight: '700', fontSize: 22, color: '#fff', lineHeight: 29, marginTop: 28 },

  card: { marginTop: -32, marginHorizontal: 16, marginBottom: 24, backgroundColor: '#fff', borderRadius: 28, padding: 26, paddingTop: 26, paddingBottom: 24, flex: 1, shadowColor: DARK, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.12, shadowRadius: 30, elevation: 8 },

  dotsRow: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  dot: { height: 8, borderRadius: 999 },

  title: { fontFamily: FONT_FAMILY.displayBold, fontWeight: '700', fontSize: 21, color: '#1A1A1A', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#5C5852', marginBottom: 22, lineHeight: 19 },
  label: { fontSize: 10, fontWeight: '700', color: '#7A756E', letterSpacing: 1, marginBottom: 8 },

  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E8E5E0', borderRadius: 14, backgroundColor: '#FAF9F7', paddingHorizontal: 14, marginBottom: 8 },
  prefix: { fontSize: 15, color: '#7A756E', fontWeight: '600', paddingRight: 8, borderRightWidth: 1.5, borderRightColor: '#E8E5E0', marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#1A1A1A' },
  plainInput: { borderWidth: 1.5, borderColor: '#E8E5E0', borderRadius: 14, backgroundColor: '#FAF9F7', padding: 14, fontSize: 15, color: '#1A1A1A', marginBottom: 8 },

  error: { fontSize: 12, color: '#C62828', marginBottom: 8 },
  debugCode: { fontSize: 12, color: DARK, backgroundColor: '#E8F5E9', padding: 10, borderRadius: 10, marginTop: 10, textAlign: 'center', fontWeight: '700' },

  primaryBtn: { width: '100%', borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  trustBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#F1F7F1', borderRadius: 12, padding: 12, paddingHorizontal: 14, marginTop: 16 },
  trustText: { flex: 1, fontSize: 11.5, color: '#3D5C3D', lineHeight: 16 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#EDECEA' },
  dividerText: { fontSize: 11, color: '#ABA69F' },

  ghostBtn: { width: '100%', borderWidth: 1.5, borderColor: '#E8E5E0', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  ghostBtnText: { color: '#5C5852', fontWeight: '600', fontSize: 14 },

  linkBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  linkBtnText: { color: '#7A756E', fontSize: 13 },

  otpRow: { flexDirection: 'row', gap: 8 },
  otpBox: { flex: 1, aspectRatio: 1, borderWidth: 1.5, borderColor: '#E8E5E0', borderRadius: 12, backgroundColor: '#FAF9F7', alignItems: 'center', justifyContent: 'center' },
  otpDigit: { fontFamily: FONT_FAMILY.displayBold, fontWeight: '700', fontSize: 20, color: '#1A1A1A' },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1.5, borderColor: '#E8E5E0', backgroundColor: '#FAF9F7' },
  chipActive: { backgroundColor: DARK, borderColor: DARK },
  chipText: { fontSize: 13, fontWeight: '600', color: '#5C5852' },
  chipTextActive: { color: '#fff' },

  doneCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
});
