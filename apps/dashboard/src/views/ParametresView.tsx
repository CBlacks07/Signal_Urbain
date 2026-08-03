import { useEffect, useState } from "react";
import { ChevronRight, LogOut } from "lucide-react";
import { apiClient } from "../api/client";
import { COLORS, FONT_DISPLAY } from "../theme";
import { Modal } from "../components/Modal";
import { ToggleSwitch } from "../components/ui";

const NOTIF_KEY = "signal_notif_prefs";

export function ParametresView({ token, onLogout }: any) {
  const [me, setMe] = useState<any>(null);
  const [modal, setModal] = useState<"phone" | "notif" | "logout" | null>(null);

  const [phoneStep, setPhoneStep] = useState<"input" | "otp">("input");
  const [newPhone, setNewPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [phoneMsg, setPhoneMsg] = useState("");
  const [phoneErr, setPhoneErr] = useState("");
  const [phoneLoad, setPhoneLoad] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(NOTIF_KEY) ?? "{}"); } catch { return {}; }
  });
  const [logoutLoad, setLogoutLoad] = useState(false);

  const logoutAllDevices = async () => {
    setLogoutLoad(true);
    try { await apiClient(token).post("/auth/logout-all"); }
    catch { /* on déconnecte localement quoi qu'il arrive */ }
    finally { setLogoutLoad(false); onLogout(); }
  };

  useEffect(() => { apiClient(token).get("/users/me").then((r) => setMe(r.data)).catch(() => {}); }, [token]);

  const saveNotif = (key: string, val: boolean) => {
    const updated = { ...notifPrefs, [key]: val };
    setNotifPrefs(updated);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
  };

  const sendOtp = async () => {
    if (!newPhone) { setPhoneErr("Entrez le nouveau numéro"); return; }
    setPhoneLoad(true); setPhoneErr("");
    try {
      await apiClient(token).post("/auth/request-otp", { phone: newPhone });
      setPhoneStep("otp");
      setPhoneMsg("Code OTP envoyé.");
    } catch (e: any) { setPhoneErr(e?.response?.data?.message ?? "Erreur lors de l'envoi"); }
    finally { setPhoneLoad(false); }
  };

  const confirmPhone = async () => {
    if (!otpCode) { setPhoneErr("Entrez le code OTP"); return; }
    setPhoneLoad(true); setPhoneErr("");
    try {
      await apiClient(token).post("/auth/change-phone", { newPhone, code: otpCode });
      setMe((m: any) => ({ ...m, phone: newPhone }));
      setModal(null);
      setPhoneStep("input"); setNewPhone(""); setOtpCode("");
    } catch (e: any) { setPhoneErr(e?.response?.data?.message ?? "Code invalide ou expiré"); }
    finally { setPhoneLoad(false); }
  };

  const inp: React.CSSProperties = { width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontSize: 14, fontFamily: "inherit", background: "#FBFAF8", boxSizing: "border-box" };
  const btn = (bg: string, color = "#fff"): React.CSSProperties => ({ width: "100%", padding: 12, background: bg, color, border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 8 });

  return (
    <div style={{ animation: "fadeIn 0.4s ease" }}>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800, margin: "0 0 24px", letterSpacing: "-0.01em" }}>Paramètres</h1>

      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: 26, marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 18 }}>Mon profil</div>
        {[
          { label: "Nom", value: me?.name ?? "—" },
          { label: "Téléphone", value: me?.phone ?? "—" },
          { label: "Commune", value: me?.commune?.name ?? "—" },
          { label: "Rôle", value: me?.role ?? "—" },
        ].map((r, i, arr) => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: i < arr.length - 1 ? `1px solid ${COLORS.borderLight}` : "none" }}>
            <span style={{ fontSize: 13, color: COLORS.textFaint, fontWeight: 600 }}>{r.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{r.value}</span>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: 26 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 18 }}>Accès & sécurité</div>
        {[
          { key: "phone", label: "Changer de numéro", sub: "Mise à jour via OTP", danger: false },
          { key: "notif", label: "Notifications push", sub: "Configurer les alertes", danger: false },
          { key: "logout", label: "Déconnexion de tous appareils", sub: "Révoquer tous les tokens actifs", danger: true },
        ].map((item, i, arr) => (
          <div key={item.key} onClick={() => setModal(item.key as any)}
            style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: i < arr.length - 1 ? `1px solid ${COLORS.borderLight}` : "none", cursor: "pointer" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: item.danger ? COLORS.dangerText : COLORS.text }}>{item.label}</div>
              <div style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 2 }}>{item.sub}</div>
            </div>
            <ChevronRight size={14} color={item.danger ? COLORS.dangerText : COLORS.textFaint} style={{ marginLeft: "auto" }} />
          </div>
        ))}
      </div>

      {modal === "phone" && (
        <Modal title="Changer de numéro" onClose={() => { setModal(null); setPhoneStep("input"); setNewPhone(""); setOtpCode(""); setPhoneErr(""); }}>
          {phoneStep === "input" ? (
            <>
              <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16, lineHeight: 1.5 }}>Entrez votre nouveau numéro. Vous recevrez un code OTP pour confirmer.</p>
              <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+22890000000" style={inp} />
              {phoneErr && <div style={{ fontSize: 12, color: COLORS.danger, marginTop: 8 }}>{phoneErr}</div>}
              <button onClick={sendOtp} disabled={phoneLoad} style={btn(COLORS.green)}>{phoneLoad ? "Envoi..." : "Envoyer le code OTP"}</button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: COLORS.success, marginBottom: 16, lineHeight: 1.5 }}>{phoneMsg}</p>
              <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="Code à 6 chiffres" maxLength={6} style={inp} />
              {phoneErr && <div style={{ fontSize: 12, color: COLORS.danger, marginTop: 8 }}>{phoneErr}</div>}
              <button onClick={confirmPhone} disabled={phoneLoad} style={btn(COLORS.green)}>{phoneLoad ? "Vérification..." : "Confirmer le changement"}</button>
              <button onClick={() => { setPhoneStep("input"); setPhoneErr(""); }} style={btn(COLORS.bg, COLORS.textMuted)}>Retour</button>
            </>
          )}
        </Modal>
      )}

      {modal === "notif" && (
        <Modal title="Notifications push" onClose={() => setModal(null)}>
          <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 20, lineHeight: 1.5 }}>Choisissez les événements pour lesquels vous souhaitez être notifié.</p>
          {[
            { key: "new_incident", label: "Nouveau signalement citoyen" },
            { key: "status_update", label: "Changement de statut d'un incident" },
            { key: "new_comment", label: "Nouveau commentaire sur un incident" },
            { key: "critical", label: "Incident critique signalé" },
          ].map((n, i, arr) => (
            <div key={n.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < arr.length - 1 ? `1px solid ${COLORS.borderLight}` : "none" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{n.label}</span>
              <ToggleSwitch checked={!!notifPrefs[n.key]} onChange={(v) => saveNotif(n.key, v)} />
            </div>
          ))}
          <button onClick={() => setModal(null)} style={btn(COLORS.green)}>Sauvegarder</button>
        </Modal>
      )}

      {modal === "logout" && (
        <Modal title="Déconnexion de tous appareils" onClose={() => setModal(null)}>
          <div style={{ textAlign: "center", padding: "8px 0 20px" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: COLORS.dangerBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <LogOut size={24} color={COLORS.danger} />
            </div>
            <p style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6, margin: "0 0 8px" }}>
              Vous allez être déconnecté de <strong>tous les appareils</strong> et toutes les sessions actives seront révoquées.
            </p>
            <p style={{ fontSize: 12, color: COLORS.textFaint, lineHeight: 1.5, margin: 0 }}>Vous devrez vous reconnecter via OTP pour accéder à nouveau au dashboard.</p>
          </div>
          <button onClick={logoutAllDevices} disabled={logoutLoad} style={btn(COLORS.danger)}>{logoutLoad ? "Révocation…" : "Confirmer la déconnexion"}</button>
          <button onClick={() => setModal(null)} disabled={logoutLoad} style={btn(COLORS.bg, COLORS.textMuted)}>Annuler</button>
        </Modal>
      )}
    </div>
  );
}
