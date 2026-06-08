import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import { apiClient, saveToken, getToken, API_BASE } from '../lib/api';

const COLORS = { dark: '#1A472A', bg: '#FDFCFA' };

export default function LoginScreen() {
  const [step, setStep]           = useState<'phone' | 'otp' | 'name'>('phone');
  const [phone, setPhone]         = useState('');
  const [otp, setOtp]             = useState('');
  const [name, setName]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [debugCode, setDebugCode] = useState('');

  const requestOtp = async () => {
    if (!phone.trim()) { setError('Entrez votre numéro de téléphone'); return; }
    setLoading(true); setError('');
    try {
      const res = await apiClient().post('/auth/request-otp', { phone: phone.trim() });
      if (res.data.debug_code) setDebugCode(`Code dev : ${res.data.debug_code}`);
      setStep('otp');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) { setError('Entrez le code OTP'); return; }
    setLoading(true); setError('');
    try {
      const res = await apiClient().post('/auth/verify-otp', { phone: phone.trim(), code: otp.trim() });
      await saveToken(res.data.access_token);
      if (res.data.needsProfile) {
        setStep('name');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Code incorrect ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  const submitName = async () => {
    if (!name.trim()) { setError('Entrez votre nom complet'); return; }
    setLoading(true); setError('');
    try {
      const token = await getToken();
      await apiClient(token).patch('/users/me', { name: name.trim() });
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Impossible d'enregistrer votre nom.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image source={require('../assets/icon.png')} style={styles.logoImage} resizeMode="contain" />
        </View>

        {/* Card */}
        <View style={styles.card}>
          {step === 'name' ? (
            <>
              <Text style={styles.cardTitle}>Bienvenue !</Text>
              <Text style={styles.cardSub}>Comment souhaitez-vous être identifié ?</Text>
              <Text style={styles.label}>NOM COMPLET</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ex: Komi Agbeko"
                autoCapitalize="words"
                autoFocus
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity style={styles.btn} onPress={submitName} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Continuer</Text>}
              </TouchableOpacity>
            </>
          ) : step === 'phone' ? (
            <>
              <Text style={styles.cardTitle}>Connexion</Text>
              <Text style={styles.cardSub}>Entrez votre numéro togolais</Text>
              <Text style={styles.label}>NUMÉRO DE TÉLÉPHONE</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+228 90 00 00 00"
                keyboardType="phone-pad"
                autoFocus
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity style={styles.btn} onPress={requestOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Recevoir le code</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Code OTP</Text>
              <Text style={styles.cardSub}>Code envoyé au {phone}</Text>
              {debugCode ? <Text style={styles.debugCode}>{debugCode}</Text> : null}
              <Text style={styles.label}>CODE À 6 CHIFFRES</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                value={otp}
                onChangeText={setOtp}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity style={styles.btn} onPress={verifyOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Se connecter</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.backBtn} onPress={() => { setStep('phone'); setError(''); setOtp(''); }}>
                <Text style={styles.backText}>Changer le numéro</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#EDECEA' },
  inner:      { flex: 1, justifyContent: 'center', padding: 24 },
  logoWrap:   { alignItems: 'center', marginBottom: 32 },
  logoImage:  { width: 160, height: 160 },
  card:       { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  cardTitle:  { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  cardSub:    { fontSize: 13, color: '#999', marginBottom: 20 },
  label:      { fontSize: 10, fontWeight: '700', color: '#888', letterSpacing: 1, marginBottom: 6 },
  input:      { borderWidth: 1.5, borderColor: '#e8e5e0', borderRadius: 14, padding: 14, fontSize: 15, color: '#1A1A1A', backgroundColor: '#faf9f7', marginBottom: 8 },
  otpInput:   { fontSize: 24, fontWeight: '700', textAlign: 'center', letterSpacing: 8 },
  error:      { fontSize: 12, color: '#C62828', marginBottom: 10 },
  debugCode:  { fontSize: 12, color: COLORS.dark, backgroundColor: '#E8F5E9', padding: 10, borderRadius: 10, marginBottom: 12, textAlign: 'center', fontWeight: '700' },
  btn:        { backgroundColor: COLORS.dark, borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 8 },
  btnText:    { color: '#fff', fontSize: 15, fontWeight: '700' },
  backBtn:    { padding: 12, alignItems: 'center' },
  backText:   { fontSize: 13, color: '#999' },
});
