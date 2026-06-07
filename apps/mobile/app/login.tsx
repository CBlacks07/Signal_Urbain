import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { apiClient, saveToken, API_BASE } from '../lib/api';

const COLORS = { dark: '#1A472A', orange: '#D4760A', bg: '#FDFCFA' };

export default function LoginScreen() {
  const [step, setStep]           = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone]         = useState('');
  const [otp, setOtp]             = useState('');
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
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Code incorrect ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoIcon}>
            <Text style={{ fontSize: 28, color: '#fff', fontWeight: '800' }}>S</Text>
          </View>
          <Text style={styles.logoText}>Signal<Text style={{ color: COLORS.orange }}>Togo</Text></Text>
          <Text style={styles.logoSub}>Signalement citoyen — Togo</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {step === 'phone' ? (
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
  logoIcon:   { width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logoText:   { fontSize: 26, fontWeight: '800', color: '#1A1A1A' },
  logoSub:    { fontSize: 12, color: '#888', marginTop: 4 },
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
