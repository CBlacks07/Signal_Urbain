import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Clock } from "lucide-react";
import { API_BASE } from "../api/client";
import { decodeJwt } from "../api/client";
import { saveToken } from "../api/token";
import { COLORS, FONT_DISPLAY } from "../theme";

const RESEND_SECONDS = 60;

export function LoginView({ onLogin }: { onLogin: (token: string) => void }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown > 0]);

  const requestOtp = async () => {
    setLoading(true); setError("");
    const cleanPhone = phone.replace(/\s/g, "");
    try {
      await axios.post(`${API_BASE}/auth/request-otp`, { phone: cleanPhone });
      setStep("otp");
      setCode(["", "", "", "", "", ""]);
      setCountdown(RESEND_SECONDS);
      setTimeout(() => inputsRef.current[0]?.focus(), 50);
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Erreur lors de l'envoi");
    } finally { setLoading(false); }
  };

  const verifyOtp = async (otp: string) => {
    setLoading(true); setError("");
    try {
      const { data } = await axios.post(`${API_BASE}/auth/verify-otp`, { phone: phone.replace(/\s/g, ""), code: otp });
      const token = data.access_token ?? data.accessToken;
      const decoded = decodeJwt(token);
      if (!decoded || decoded.role === "CITIZEN") {
        setError("Accès refusé. Ce tableau de bord est réservé aux agents et administrateurs.");
        return;
      }
      saveToken(token);
      onLogin(token);
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Code incorrect");
    } finally { setLoading(false); }
  };

  const onDigit = (i: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = digit;
    setCode(next);
    if (digit && i < 5) inputsRef.current[i + 1]?.focus();
    if (next.every((d) => d) && next.join("").length === 6) verifyOtp(next.join(""));
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[i] && i > 0) inputsRef.current[i - 1]?.focus();
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: COLORS.bg, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ width: 400, background: COLORS.railDark, padding: "44px 38px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 44 }}>
          <img src="/logo.png" alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }} />
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, color: "#fff", lineHeight: 1.1 }}>Signal<span style={{ color: COLORS.orangeLight }}>Urbain</span></div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Espace mairie</div>
          </div>
        </div>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, color: "#fff", margin: "0 0 14px", lineHeight: 1.3, letterSpacing: "-0.01em" }}>
          Les signalements de vos habitants, traités dans les délais.
        </h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.62)", lineHeight: 1.6, margin: 0 }}>
          Chaque dossier porte une échéance. Vous voyez d'un coup d'œil ce qui est en retard, qui l'a en charge, et ce qu'il reste à prouver.
        </p>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 44 }}>
        <div style={{ width: 348 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.label, marginBottom: 8 }}>
            Étape {step === "phone" ? "1" : "2"} sur 2
          </div>

          {step === "phone" ? (
            <>
              <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 25, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.01em" }}>Connexion à l'espace mairie</h1>
              <p style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.55, margin: "0 0 28px" }}>Un code vous sera envoyé par SMS.</p>
              <label style={{ fontSize: 11, fontWeight: 700, color: COLORS.textFaint, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Numéro de téléphone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+228 90 00 00 00" autoFocus
                onKeyDown={(e) => e.key === "Enter" && requestOtp()}
                style={{ width: "100%", padding: "13px 16px", borderRadius: 12, border: `1.5px solid ${COLORS.border}`, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 20 }} />
              <div onClick={() => !loading && phone && requestOtp()} style={{ padding: 14, borderRadius: 12, background: COLORS.green, color: "#fff", fontSize: 14.5, fontWeight: 700, textAlign: "center", cursor: loading || !phone ? "default" : "pointer", opacity: loading || !phone ? 0.7 : 1 }}>
                {loading ? "Envoi…" : "Recevoir le code"}
              </div>
            </>
          ) : (
            <>
              <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 25, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.01em" }}>Entrez le code reçu</h1>
              <p style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.55, margin: "0 0 28px" }}>
                SMS envoyé au <strong>{phone}</strong>. <span onClick={() => setStep("phone")} style={{ color: COLORS.green, fontWeight: 600, borderBottom: `1px solid ${COLORS.green}40`, cursor: "pointer" }}>Modifier le numéro</span>
              </p>
              <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                {code.map((digit, i) => (
                  <input key={i} ref={(el) => (inputsRef.current[i] = el)} value={digit} inputMode="numeric" maxLength={1}
                    onChange={(e) => onDigit(i, e.target.value)} onKeyDown={(e) => onKeyDown(i, e)}
                    style={{
                      flex: "1 1 0", width: 0, minWidth: 0, height: 62, borderRadius: 12, border: digit ? `2px solid ${COLORS.green}` : `1.5px solid ${COLORS.border}`,
                      background: "#fff", textAlign: "center", fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 700, padding: 0, boxSizing: "border-box",
                    }} />
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 13px", background: COLORS.warningBgSoft, border: `1px solid ${COLORS.warningBorder}`, borderRadius: 10, marginBottom: 24 }}>
                <Clock size={14} color={COLORS.warning} />
                <span style={{ fontSize: 12.5, color: COLORS.warning, flex: 1 }}>Réseau lent ? Le SMS peut prendre jusqu'à 2 min.</span>
                {countdown > 0 ? (
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.warning, whiteSpace: "nowrap" }}>0:{String(countdown).padStart(2, "0")}</span>
                ) : (
                  <span onClick={requestOtp} style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.warning, whiteSpace: "nowrap", cursor: "pointer", textDecoration: "underline" }}>Renvoyer</span>
                )}
              </div>
              <div onClick={() => !loading && code.every((d) => d) && verifyOtp(code.join(""))}
                style={{ padding: 14, borderRadius: 12, background: COLORS.green, color: "#fff", fontSize: 14.5, fontWeight: 700, textAlign: "center", cursor: "pointer", marginBottom: 16, opacity: loading ? 0.7 : 1 }}>
                {loading ? "Vérification…" : "Se connecter"}
              </div>
              <div style={{ fontSize: 12.5, color: COLORS.textFaint, textAlign: "center", lineHeight: 1.5 }}>
                Accès réservé aux agents municipaux.
              </div>
            </>
          )}

          {error && <div style={{ marginTop: 14, padding: "10px 14px", background: COLORS.dangerBg, borderRadius: 10, fontSize: 12.5, color: COLORS.dangerText }}>{error}</div>}
        </div>
      </div>
    </div>
  );
}
