import { useState, useMemo, useEffect, useCallback } from "react";
import {
  LayoutDashboard, FileText, Map, Users, BarChart2, Settings,
  AlertTriangle, Clock, Activity, CheckCircle2, Search, MapPin,
  Building2, Calendar, MessageSquare, Building, Zap, X, Check,
  ChevronRight, LogOut, ArrowUp, Image,
} from "lucide-react";
import axios from "axios";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";

const CATEGORIES: Record<string, { label: string; color: string }> = {
  inondation:  { label: "Inondation",          color: "#2B7A9B" },
  electrique:  { label: "Poteau électrique",   color: "#D4760A" },
  depotoir:    { label: "Dépotoir sauvage",    color: "#6B7534" },
  route:       { label: "Route dégradée",      color: "#8B4513" },
  eclairage:   { label: "Éclairage public",    color: "#5C5C8A" },
  eau:         { label: "Canalisation / Eau",  color: "#3A7CA5" },
  autre:       { label: "Autre",               color: "#6B6B6B" },
};

const STATUS: Record<string, { label: string; color: string; bg: string; step: number }> = {
  signale:  { label: "Signalé",   color: "#E65100", bg: "#FFF3E0", step: 1 },
  assigne:  { label: "Assigné",   color: "#1565C0", bg: "#E3F2FD", step: 2 },
  en_cours: { label: "En cours",  color: "#F9A825", bg: "#FFFDE7", step: 3 },
  resolu:   { label: "Résolu",    color: "#2E7D32", bg: "#E8F5E9", step: 4 },
  rejete:   { label: "Rejeté",    color: "#C62828", bg: "#FFEBEE", step: 0 },
};

const PRIORITY: Record<string, { label: string; color: string }> = {
  critique: { label: "Critique", color: "#C62828" },
  haute:    { label: "Haute",    color: "#E65100" },
  moyenne:  { label: "Moyenne",  color: "#F9A825" },
  basse:    { label: "Basse",    color: "#2E7D32" },
};

// ─── API ──────────────────────────────────────────────────────────────────────

const TOKEN_KEY = "signal_token";
const getToken = () => localStorage.getItem(TOKEN_KEY);
const saveToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const apiClient = (token?: string | null) =>
  axios.create({
    baseURL: API_BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

const decodeJwt = (token: string): { sub: string; role: string } | null => {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
};

function mapIncident(raw: any) {
  return {
    id:       raw.refCode,
    _id:      raw.id,
    category: raw.category?.toLowerCase() ?? "autre",
    desc:     raw.description,
    address:  raw.address,
    commune:  raw.commune?.name ?? "",
    status:   raw.status?.toLowerCase() ?? "signale",   // EN_COURS → en_cours
    priority: raw.priority?.toLowerCase() ?? "moyenne",
    date:     raw.createdAt,
    upvotes:  raw.upvotesCount ?? 0,
    comments: raw.commentsCount ?? 0,
    service:  raw.service ?? null,
    agent:    raw.assignedAgent
      ? { name: raw.assignedAgent.name, role: raw.assignedAgent.role }
      : null,
    lat: raw.latitude ?? null,
    lng: raw.longitude ?? null,
  };
}

// ─── MICRO COMPONENTS ────────────────────────────────────────────────────────

const Pill = ({
  color, bg, children, small,
}: { color: string; bg: string; children: React.ReactNode; small?: boolean }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: small ? "2px 8px" : "4px 12px",
    borderRadius: 20, fontSize: small ? 10 : 11.5,
    fontWeight: 700, color, background: bg,
    letterSpacing: "0.02em", whiteSpace: "nowrap",
  }}>{children}</span>
);

const Avatar = ({ initials, size = 32, color = "#1A472A" }: { initials: string; size?: number; color?: string }) => (
  <div style={{
    width: size, height: size, minWidth: size, borderRadius: "50%",
    background: `linear-gradient(135deg, ${color}dd, ${color}99)`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.38, fontWeight: 700, color: "#fff", letterSpacing: "0.05em",
  }}>{initials}</div>
);

const Dot = ({ color, size = 8 }: { color: string; size?: number }) => (
  <span style={{
    display: "inline-block", width: size, height: size, minWidth: size,
    borderRadius: "50%", background: color,
  }} />
);

const StatCard = ({ icon: Icon, label, value, trend, trendUp, color, delay }: any) => (
  <div style={{
    background: "#fff", borderRadius: 16, padding: 20,
    border: "1px solid #ede9e3", animation: `cardIn 0.5s ease ${delay}s both`,
    position: "relative", overflow: "hidden",
  }}>
    <div style={{ position: "absolute", top: -10, right: -10, width: 60, height: 60, borderRadius: "50%", background: `${color}0c` }} />
    <div style={{ color, marginBottom: 10 }}><Icon size={22} /></div>
    <div style={{ fontSize: 28, fontWeight: 800, color: "#1a1a1a", lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>{value}</div>
    <div style={{ fontSize: 12, color: "#999", marginTop: 4, fontWeight: 500 }}>{label}</div>
    {trend && (
      <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: trendUp ? "#2E7D32" : "#C62828" }}>
        {trendUp ? "↑" : "↓"} {trend}
      </div>
    )}
  </div>
);

// ─── LOGIN ────────────────────────────────────────────────────────────────────

function LoginView({ onLogin }: { onLogin: (token: string) => void }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestOtp = async () => {
    setLoading(true); setError("");
    const cleanPhone = phone.replace(/\s/g, "");
    try {
      await axios.post(`${API_BASE}/auth/request-otp`, { phone: cleanPhone });
      setStep("otp");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Erreur lors de l'envoi");
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    setLoading(true); setError("");
    try {
      const { data } = await axios.post(`${API_BASE}/auth/verify-otp`, { phone: phone.replace(/\s/g, ""), code: otp });
      const token = data.access_token ?? data.accessToken;
      const decoded = decodeJwt(token);
      if (!decoded || decoded.role === "CITIZEN") {
        setError("Accès refusé. Ce tableau de bord est réservé aux agents et administrateurs. Utilisez l'application mobile Signal Urbain Togo.");
        return;
      }
      saveToken(token);
      onLogin(token);
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Code incorrect");
    } finally { setLoading(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 16px", borderRadius: 12,
    border: "1.5px solid #e8e5e0", fontSize: 14, fontFamily: "inherit",
    outline: "none", boxSizing: "border-box",
  };
  const btnStyle: React.CSSProperties = {
    width: "100%", padding: 13,
    background: "linear-gradient(135deg, #1A472A, #2B7A3E)",
    color: "#fff", border: "none", borderRadius: 12,
    fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer",
    opacity: loading ? 0.7 : 1,
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F3EF" }}>
      <div style={{ width: 380, background: "#fff", borderRadius: 20, padding: 40, border: "1px solid #ede9e3", boxShadow: "0 8px 40px rgba(0,0,0,0.06)" }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <img src="/logo.png" alt="Signal Urbain" style={{ width: 64, height: 64, borderRadius: 16, objectFit: "cover", margin: "0 auto 16px", display: "block" }} />
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a", fontFamily: "'Outfit', sans-serif" }}>Signal<span style={{ color: "#D4760A" }}>Urbain</span></div>
          <div style={{ fontSize: 13, color: "#999", marginTop: 4 }}>Espace Mairie — Connexion</div>
        </div>

        {step === "phone" ? (
          <>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Numéro de téléphone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+228 90 00 00 00" style={inputStyle} onKeyDown={e => e.key === "Enter" && requestOtp()} autoFocus />
            <p style={{ fontSize: 11.5, color: "#aaa", margin: "8px 0 20px", lineHeight: 1.5 }}>Un code OTP vous sera envoyé par SMS.</p>
            <button onClick={requestOtp} disabled={loading || !phone} style={btnStyle}>{loading ? "Envoi..." : "Recevoir le code"}</button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>Code envoyé au <strong>{phone}</strong></p>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Code OTP</label>
            <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456" maxLength={6}
              style={{ ...inputStyle, letterSpacing: "0.3em", fontSize: 20, textAlign: "center" }}
              onKeyDown={e => e.key === "Enter" && verifyOtp()} autoFocus />
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep("phone")} style={{ ...btnStyle, background: "#f5f2ed", color: "#666", flex: "0 0 auto", width: "auto", padding: "13px 20px" }}>Retour</button>
              <button onClick={verifyOtp} disabled={loading || otp.length < 4} style={{ ...btnStyle, flex: 1 }}>{loading ? "Vérification..." : "Connexion"}</button>
            </div>
          </>
        )}

        {error && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "#FFEBEE", borderRadius: 10, fontSize: 12.5, color: "#C62828" }}>{error}</div>
        )}
      </div>
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "dashboard",  Icon: LayoutDashboard, label: "Tableau de bord" },
  { id: "incidents",  Icon: FileText,         label: "Incidents" },
  { id: "carte",      Icon: Map,              label: "Carte" },
  { id: "equipes",    Icon: Users,            label: "Équipes" },
  { id: "stats",      Icon: BarChart2,        label: "Statistiques" },
  { id: "parametres", Icon: Settings,         label: "Paramètres" },
];

const SA_NAV_ITEMS = [
  { id: "sa-communes",     Icon: Building,  label: "Communes" },
  { id: "sa-utilisateurs", Icon: Users,     label: "Utilisateurs" },
];

function Sidebar({ active, onNav, collapsed, onToggle, onLogout, isSuperAdmin, isAgent, me }: any) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const initials = me?.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ?? "??";
  const displayName = me?.name ?? "Chargement...";
  const displayRole = me?.role === "SUPER_ADMIN" ? "Super Admin" : me?.role === "ADMIN" ? "Administrateur" : me?.role === "AGENT" ? "Agent" : "Mairie";

  // Les agents ne voient pas la gestion des équipes
  const visibleNavItems = NAV_ITEMS.filter(item => !(isAgent && item.id === "equipes"));

  return (
    <div style={{
      width: collapsed ? 68 : 240, minHeight: "100vh",
      background: "linear-gradient(180deg, #0f2b1a 0%, #153824 40%, #1a4430 100%)",
      display: "flex", flexDirection: "column",
      transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)",
      position: "relative", zIndex: 10,
    }}>
      <div style={{ padding: collapsed ? "20px 0" : 20, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 8 }}>
        <img src="/logo.png" alt="Signal Urbain" style={{ width: 34, height: 34, minWidth: 34, borderRadius: 10, objectFit: "cover" }} />
        {!collapsed && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>Signal<span style={{ color: "#D4760A" }}>Urbain</span></div>
            <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.4)", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase" }}>Espace Mairie</div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: "4px 8px" }}>
        {visibleNavItems.map(({ id, Icon, label }) => (
          <button key={id} onClick={() => onNav(id)} style={{
            display: "flex", alignItems: "center", gap: 12, width: "100%",
            padding: collapsed ? "12px 0" : "11px 14px",
            justifyContent: collapsed ? "center" : "flex-start",
            background: active === id ? "rgba(255,255,255,0.12)" : "transparent",
            border: "none", borderRadius: 10, cursor: "pointer", marginBottom: 2, transition: "all 0.2s",
          }}>
            <Icon size={17} color={active === id ? "#fff" : "rgba(255,255,255,0.5)"} />
            {!collapsed && <span style={{ fontSize: 13, fontWeight: active === id ? 700 : 500, color: active === id ? "#fff" : "rgba(255,255,255,0.55)" }}>{label}</span>}
          </button>
        ))}

        {isSuperAdmin && (
          <>
            {!collapsed && <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em", textTransform: "uppercase", padding: "12px 14px 4px" }}>Administration</div>}
            {SA_NAV_ITEMS.map(({ id, Icon, label }) => (
              <button key={id} onClick={() => onNav(id)} style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%",
                padding: collapsed ? "12px 0" : "11px 14px",
                justifyContent: collapsed ? "center" : "flex-start",
                background: active === id ? "rgba(212,118,10,0.25)" : "transparent",
                border: "none", borderRadius: 10, cursor: "pointer", marginBottom: 2, transition: "all 0.2s",
              }}>
                <Icon size={17} color={active === id ? "#D4760A" : "rgba(255,255,255,0.4)"} />
                {!collapsed && <span style={{ fontSize: 13, fontWeight: active === id ? 700 : 500, color: active === id ? "#D4760A" : "rgba(255,255,255,0.45)" }}>{label}</span>}
              </button>
            ))}
          </>
        )}
      </div>

      <button onClick={onToggle} style={{ margin: 8, padding: 10, background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10, cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
        {collapsed ? "→" : "← Réduire"}
      </button>

      <div style={{ padding: collapsed ? "16px 0" : 16, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 10 }}>
        <Avatar initials={initials} size={34} color="#D4760A" />
        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{displayRole}</div>
            </div>
            <button onClick={() => setConfirmLogout(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: 4, display: "flex" }}>
              <LogOut size={15} />
            </button>
          </>
        )}
      </div>

      {confirmLogout && (
        <Modal title="Déconnexion" onClose={() => setConfirmLogout(false)}>
          <div style={{ textAlign: "center", padding: "8px 0 20px" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#FFEBEE", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <LogOut size={22} color="#C62828" />
            </div>
            <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, margin: 0 }}>
              Voulez-vous vous déconnecter de l'espace mairie ?
            </p>
          </div>
          <button onClick={onLogout}
            style={{ width: "100%", padding: 12, background: "#C62828", color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>
            Se déconnecter
          </button>
          <button onClick={() => setConfirmLogout(false)}
            style={{ width: "100%", padding: 12, background: "#f5f2ed", color: "#666", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Annuler
          </button>
        </Modal>
      )}
    </div>
  );
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────

function TopBar({ token, me }: { token: string; me: any }) {
  const [unread, setUnread]       = useState(0);
  const [open, setOpen]           = useState(false);
  const [notifs, setNotifs]       = useState<any[]>([]);
  const [marking, setMarking]     = useState(false);

  const NOTIF_COLORS: Record<string, string> = {
    STATUS_UPDATE: "#2B7A9B",
    NEW_COMMENT:   "#5C5C8A",
    UPVOTE:        "#D4760A",
    SYSTEM:        "#6B6B6B",
  };

  const loadCount = useCallback(async () => {
    try {
      const { data } = await apiClient(token).get("/notifications/unread-count");
      setUnread(typeof data === "number" ? data : data?.count ?? 0);
    } catch {}
  }, [token]);

  const loadNotifs = async () => {
    try {
      const { data } = await apiClient(token).get("/notifications?limit=10");
      setNotifs(data?.data ?? data ?? []);
    } catch {}
  };

  const markAll = async () => {
    setMarking(true);
    try {
      await apiClient(token).patch("/notifications/read-all");
      setUnread(0);
      setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
    finally { setMarking(false); }
  };

  useEffect(() => { loadCount(); const t = setInterval(loadCount, 30000); return () => clearInterval(t); }, [loadCount]);

  const handleOpen = () => { setOpen(o => !o); if (!open) loadNotifs(); };

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "à l'instant";
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}j`;
  };

  const initials = me?.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ?? "??";

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 28, gap: 12 }}>
      {/* Cloche notifications */}
      <div style={{ position: "relative" }}>
        <button onClick={handleOpen} style={{
          position: "relative", width: 40, height: 40, borderRadius: 12,
          background: open ? "#1A472A" : "#fff", border: "1px solid #ede9e3",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={open ? "#fff" : "#666"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unread > 0 && (
            <span style={{
              position: "absolute", top: -4, right: -4, minWidth: 18, height: 18,
              background: "#D4760A", borderRadius: 9, fontSize: 10, fontWeight: 800,
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 4px", border: "2px solid #F5F3EF",
            }}>{unread > 99 ? "99+" : unread}</span>
          )}
        </button>

        {open && (
          <div style={{
            position: "absolute", top: 48, right: 0, width: 360, background: "#fff",
            borderRadius: 16, border: "1px solid #ede9e3", boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
            zIndex: 200, overflow: "hidden",
          }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #f5f2ed", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>
                Notifications {unread > 0 && <span style={{ fontSize: 11, color: "#D4760A", fontWeight: 800 }}>({unread} non lues)</span>}
              </div>
              {unread > 0 && (
                <button onClick={markAll} disabled={marking} style={{ fontSize: 11, color: "#1A472A", fontWeight: 700, border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, background: "#E8F5E9" } as any}>
                  {marking ? "..." : "Tout lire"}
                </button>
              )}
            </div>
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {notifs.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "#bbb", fontSize: 13 }}>Aucune notification</div>
              ) : notifs.map(n => (
                <div key={n.id} style={{
                  padding: "12px 16px", borderBottom: "1px solid #faf8f5",
                  background: n.isRead ? "transparent" : "#FAFFF8",
                  display: "flex", gap: 10, alignItems: "flex-start",
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: n.isRead ? "transparent" : "#D4760A", marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: NOTIF_COLORS[n.type] ?? "#666" }}>{n.title}</span>
                      <span style={{ fontSize: 10, color: "#ccc", flexShrink: 0, marginLeft: 8 }}>{timeAgo(n.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#666", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Avatar utilisateur */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px 6px 6px", background: "#fff", borderRadius: 12, border: "1px solid #ede9e3" }}>
        <Avatar initials={initials} size={28} color="#1A472A" />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a", lineHeight: 1.2 }}>{me?.name ?? "..."}</div>
          <div style={{ fontSize: 10, color: "#aaa" }}>{me?.commune?.name ?? "Signal Urbain"}</div>
        </div>
      </div>

      {/* Overlay pour fermer le dropdown */}
      {open && <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 199 }} />}
    </div>
  );
}

// ─── DASHBOARD VIEW ───────────────────────────────────────────────────────────

function DashboardView({ reports, onOpenDetail }: any) {
  const critiques   = reports.filter((r: any) => r.priority === "critique" && r.status !== "resolu");
  const resolus     = reports.filter((r: any) => r.status === "resolu").length;
  const enAttente   = reports.filter((r: any) => r.status === "signale").length;
  const enTraitement = reports.filter((r: any) => r.status === "en_cours" || r.status === "assigne").length;

  return (
    <div style={{ animation: "fadeIn 0.4s ease" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a1a", margin: "0 0 4px", fontFamily: "'Outfit', sans-serif" }}>Tableau de bord</h1>
        <p style={{ fontSize: 13.5, color: "#999", margin: 0 }}>
          {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard icon={AlertTriangle} label="Total incidents"  value={reports.length} color="#1A472A" delay={0} />
        <StatCard icon={Clock}         label="En attente"       value={enAttente}      trend={`${critiques.length} critiques`} trendUp={false} color="#E65100" delay={0.05} />
        <StatCard icon={Activity}      label="En traitement"    value={enTraitement}   trendUp={true}  color="#1565C0" delay={0.1} />
        <StatCard icon={CheckCircle2}  label="Résolus"          value={resolus}        trend={reports.length ? `${Math.round(resolus / reports.length * 100)}% résolution` : undefined} trendUp={true} color="#2E7D32" delay={0.15} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Incidents critiques */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9e3", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f5f2ed", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={15} color="#C62828" />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>Incidents critiques</span>
            </div>
            <Pill color="#C62828" bg="#FFEBEE" small>{critiques.length}</Pill>
          </div>
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {critiques.length === 0 && <div style={{ padding: "24px 20px", fontSize: 13, color: "#bbb", textAlign: "center" }}>Aucun incident critique</div>}
            {critiques.map((r: any) => (
              <div key={r.id} onClick={() => onOpenDetail(r)} style={{ padding: "14px 20px", borderBottom: "1px solid #faf8f5", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#fdfcfa")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "#333" }}>{r.id}</span>
                  <Pill color={STATUS[r.status]?.color ?? "#999"} bg={STATUS[r.status]?.bg ?? "#eee"} small>{STATUS[r.status]?.label ?? r.status}</Pill>
                </div>
                <p style={{ fontSize: 12.5, color: "#666", margin: "0 0 6px", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{r.desc}</p>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#aaa" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MapPin size={10} /> {r.commune}</span>
                  <span style={{ color: "#D4760A", fontWeight: 700 }}>+{r.upvotes}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Répartition par catégorie */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9e3", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f5f2ed" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>Par catégorie</span>
          </div>
          <div style={{ padding: "16px 20px" }}>
            {Object.entries(CATEGORIES).map(([key, cat]) => {
              const count = reports.filter((r: any) => r.category === key).length;
              const pct = reports.length ? Math.round(count / reports.length * 100) : 0;
              return (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4, alignItems: "center" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#666" }}><Dot color={cat.color} /> {cat.label}</span>
                    <span style={{ fontWeight: 700, color: cat.color }}>{count}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "#f0ede8" }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${cat.color}, ${cat.color}aa)`, transition: "width 0.8s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── INCIDENTS VIEW ───────────────────────────────────────────────────────────

function IncidentsView({ reports, onOpenDetail }: any) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  const filtered = useMemo(() => {
    let list = [...reports];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((r: any) => r.id.toLowerCase().includes(s) || r.desc.toLowerCase().includes(s) || r.address.toLowerCase().includes(s));
    }
    if (filterStatus !== "all") list = list.filter((r: any) => r.status === filterStatus);
    if (filterPriority !== "all") list = list.filter((r: any) => r.priority === filterPriority);
    list.sort((a: any, b: any) => {
      if (sortBy === "date") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === "upvotes") return b.upvotes - a.upvotes;
      if (sortBy === "priority") {
        const ord: any = { critique: 0, haute: 1, moyenne: 2, basse: 3 };
        return ord[a.priority] - ord[b.priority];
      }
      return 0;
    });
    return list;
  }, [reports, search, filterStatus, filterPriority, sortBy]);

  const sel: React.CSSProperties = { padding: "8px 12px", borderRadius: 10, border: "1.5px solid #e8e5e0", fontSize: 12, fontFamily: "inherit", background: "#fdfcfa", outline: "none", cursor: "pointer", color: "#555" };

  return (
    <div style={{ animation: "fadeIn 0.4s ease" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a1a", margin: "0 0 4px", fontFamily: "'Outfit', sans-serif" }}>Incidents</h1>
        <p style={{ fontSize: 13, color: "#999", margin: 0 }}>{filtered.length} signalement{filtered.length > 1 ? "s" : ""}</p>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
          <Search size={14} color="#aaa" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ width: "100%", padding: "10px 14px 10px 38px", borderRadius: 12, border: "1.5px solid #e8e5e0", fontSize: 13, fontFamily: "inherit", background: "#fdfcfa", outline: "none" }} />
        </div>
        <select value={filterStatus}   onChange={e => setFilterStatus(e.target.value)}   style={sel}>
          <option value="all">Tous les statuts</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={sel}>
          <option value="all">Toutes priorités</option>
          {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={sortBy}         onChange={e => setSortBy(e.target.value)}         style={sel}>
          <option value="date">Par date</option>
          <option value="upvotes">Par soutiens</option>
          <option value="priority">Par priorité</option>
        </select>
      </div>

      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9e3", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "110px 2fr 140px 130px 100px 90px 70px", padding: "12px 20px", background: "#faf8f5", borderBottom: "1px solid #ede9e3", fontSize: 10.5, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          <span>ID</span><span>Description</span><span>Localisation</span><span>Catégorie</span><span>Statut</span><span>Priorité</span><span style={{ textAlign: "right" }}>Votes</span>
        </div>

        {filtered.length === 0 && <div style={{ padding: "48px 20px", textAlign: "center", color: "#bbb", fontSize: 13 }}>Aucun incident</div>}

        {filtered.map((r: any, i: number) => {
          const cat = CATEGORIES[r.category];
          const st  = STATUS[r.status];
          const pr  = PRIORITY[r.priority];
          return (
            <div key={r.id} onClick={() => onOpenDetail(r)}
              style={{ display: "grid", gridTemplateColumns: "110px 2fr 140px 130px 100px 90px 70px", padding: "14px 20px", borderBottom: "1px solid #faf8f5", cursor: "pointer", alignItems: "center", animation: `fadeIn 0.3s ease ${i * 0.03}s both` }}
              onMouseEnter={e => (e.currentTarget.style.background = "#fdfcfa")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#1A472A", fontFamily: "monospace" }}>{r.id}</span>
              <p style={{ fontSize: 12.5, color: "#555", margin: 0, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", paddingRight: 12 } as any}>{r.desc}</p>
              <span style={{ fontSize: 11.5, color: "#888", display: "flex", alignItems: "center", gap: 3 }}><MapPin size={10} /> {r.commune}</span>
              <span style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                {cat && <Dot color={cat.color} />}
                <span style={{ color: cat?.color, fontWeight: 600 }}>{cat?.label ?? r.category}</span>
              </span>
              <Pill color={st?.color ?? "#999"} bg={st?.bg ?? "#eee"} small>{st?.label ?? r.status}</Pill>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: pr?.color ?? "#999", display: "flex", alignItems: "center", gap: 4 }}>
                {pr && <Dot color={pr.color} size={7} />} {pr?.label ?? r.priority}
              </span>
              <span style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: "#D4760A" }}>{r.upvotes}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── DETAIL PANEL ─────────────────────────────────────────────────────────────

function DetailPanel({ report, agents, onClose, onUpdateStatus, token, onRefresh }: any) {
  const [newStatus, setNewStatus]     = useState(report.status);
  const [assignTo, setAssignTo]       = useState(report.agent?._id ?? "");
  const [assigning, setAssigning]     = useState(false);
  const [fullData, setFullData]       = useState<any>(null);
  const [comments, setComments]       = useState<any[]>([]);
  const [history, setHistory]         = useState<any[]>([]);
  const [newComment, setNewComment]   = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [activeTab, setActiveTab]     = useState<"info" | "comments" | "history">("info");
  const cat = CATEGORIES[report.category];
  const pr  = PRIORITY[report.priority];
  const st  = STATUS[report.status];

  // Charge le détail complet (commentaires + historique) à l'ouverture
  useEffect(() => {
    if (!token || !report._id) return;
    apiClient(token).get(`/incidents/${report._id}`).then(({ data }) => {
      setFullData(data);
      setComments(data.comments ?? []);
      setHistory(data.statusHistory ?? []);
    }).catch(() => {});
  }, [report._id, token]);

  const sendComment = async () => {
    if (!newComment.trim()) return;
    setSendingComment(true);
    try {
      await apiClient(token).post(`/incidents/${report._id}/comments`, { content: newComment.trim() });
      setNewComment("");
      const { data } = await apiClient(token).get(`/incidents/${report._id}/comments`);
      setComments(data ?? []);
    } catch {}
    finally { setSendingComment(false); }
  };

  const INFO = [
    { Icon: MapPin,        label: "Adresse",       value: report.address },
    { Icon: Building2,     label: "Commune",       value: report.commune },
    { Icon: Calendar,      label: "Date",          value: new Date(report.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) },
    { Icon: ArrowUp,       label: "Soutiens",      value: `${report.upvotes} personnes` },
    { Icon: MessageSquare, label: "Commentaires",  value: `${report.comments} messages` },
    { Icon: Building,      label: "Service",       value: report.service ?? "Non assigné" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", justifyContent: "flex-end", animation: "fadeIn 0.2s ease" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", width: 520, maxWidth: "90vw", background: "#FDFCFA", height: "100vh", overflowY: "auto", boxShadow: "-8px 0 40px rgba(0,0,0,0.12)", animation: "slideInRight 0.35s cubic-bezier(0.4,0,0.2,1)" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #ede9e3", display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "sticky", top: 0, background: "#FDFCFA", zIndex: 2 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              {cat && <Dot color={cat.color} size={10} />}
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", color: "#1A472A" }}>{report.id}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Pill color={st?.color ?? "#999"} bg={st?.bg ?? "#eee"}>{st?.label ?? report.status}</Pill>
              {pr && <Pill color={pr.color} bg={pr.color + "18"}>{pr.label}</Pill>}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: "#f5f2ed", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} color="#666" />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Onglets */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f5f2ed", borderRadius: 10, padding: 4 }}>
            {(["info", "comments", "history"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                flex: 1, padding: "7px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all 0.2s",
                background: activeTab === tab ? "#fff" : "transparent",
                color: activeTab === tab ? "#1A472A" : "#999",
                boxShadow: activeTab === tab ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}>
                {tab === "info" ? "Infos" : tab === "comments" ? `Commentaires ${comments.length > 0 ? `(${comments.length})` : ""}` : `Historique ${history.length > 0 ? `(${history.length})` : ""}`}
              </button>
            ))}
          </div>

          {/* Onglet INFO */}
          {activeTab === "info" && (<>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.1em" }}>Description</label>
            <p style={{ fontSize: 14, color: "#333", lineHeight: 1.6, margin: "8px 0 0" }}>{report.desc}</p>
          </div>

          {fullData?.photos?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 5 }}>
                <Image size={11} /> Photos ({fullData.photos.length})
              </label>
              <div style={{ display: "flex", gap: 8, marginTop: 10, overflowX: "auto", paddingBottom: 4 }}>
                {fullData.photos.map((photo: any) => (
                  <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
                    <img src={photo.thumbnailUrl || photo.url} alt="Photo de l'incident" loading="lazy"
                      style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 12, border: "1.5px solid #ede9e3", display: "block" }} />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {INFO.map(({ Icon, label, value }) => (
              <div key={label} style={{ padding: 12, background: "#faf8f5", borderRadius: 12 }}>
                <div style={{ fontSize: 10, color: "#aaa", fontWeight: 600, textTransform: "uppercase", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon size={10} /> {label}
                </div>
                <div style={{ fontSize: 13, color: "#444", fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>

          {report.agent && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "#E3F2FD", borderRadius: 12, marginBottom: 20 }}>
              <Avatar initials={report.agent.name?.slice(0, 2).toUpperCase() ?? "??"} size={38} color="#1565C0" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1565C0" }}>{report.agent.name}</div>
                <div style={{ fontSize: 11, color: "#666" }}>{report.agent.role}</div>
              </div>
            </div>
          )}

          {/* Pipeline */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 10 }}>Pipeline</label>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {["signale", "assigne", "en_cours", "resolu"].map((step, i) => {
                const s = STATUS[step];
                const active = s.step <= (STATUS[report.status]?.step ?? 0);
                return (
                  <div key={step} style={{ display: "flex", alignItems: "center", flex: 1, gap: 4 }}>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: active ? `linear-gradient(90deg, ${s.color}, ${s.color}aa)` : "#ede9e3", transition: "all 0.4s" }} />
                    {i < 3 && <ChevronRight size={10} color="#ccc" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ background: "#fff", border: "1.5px solid #ede9e3", borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 16 }}>
              <Zap size={14} color="#D4760A" /> Actions rapides
            </div>

            <label style={{ fontSize: 10, color: "#999", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Changer le statut</label>
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e8e5e0", fontSize: 13, fontFamily: "inherit", background: "#fdfcfa", outline: "none", marginBottom: 12 }}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>

            {agents?.length > 0 && (
              <>
                <label style={{ fontSize: 10, color: "#999", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Assigner à un agent</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <select value={assignTo} onChange={e => setAssignTo(e.target.value)}
                    style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e8e5e0", fontSize: 13, fontFamily: "inherit", background: "#fdfcfa", outline: "none" }}>
                    <option value="">— Non assigné —</option>
                    {agents.map((a: any) => <option key={a.id} value={a.id}>{a.name} {a.service ? `(${a.service})` : ""}</option>)}
                  </select>
                  <button onClick={async () => {
                    if (!token) return;
                    setAssigning(true);
                    try {
                      await apiClient(token).patch(`/incidents/${report._id}`, { assignedTo: assignTo || null });
                      onRefresh?.();
                    } catch {}
                    finally { setAssigning(false); }
                  }} disabled={assigning}
                    style={{ padding: "10px 14px", background: "#E3F2FD", color: "#1565C0", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {assigning ? "..." : "Assigner"}
                  </button>
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={() => { onUpdateStatus(report._id, newStatus); onClose(); }}
                style={{ flex: 1, padding: 12, background: "linear-gradient(135deg, #1A472A, #2B7A3E)", color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Check size={14} /> Mettre à jour
              </button>
              <button onClick={() => { onUpdateStatus(report._id, "rejete"); onClose(); }}
                style={{ padding: "12px 20px", background: "#FFEBEE", color: "#C62828", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Rejeter</button>
            </div>
          </div>
          </>)}

          {/* Onglet COMMENTAIRES */}
          {activeTab === "comments" && (
            <div>
              {/* Saisie commentaire */}
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <input
                  value={newComment} onChange={e => setNewComment(e.target.value)}
                  placeholder="Ajouter un commentaire interne..."
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e8e5e0", fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fdfcfa" }}
                  onKeyDown={e => e.key === "Enter" && sendComment()}
                />
                <button onClick={sendComment} disabled={sendingComment || !newComment.trim()}
                  style={{ padding: "10px 16px", background: "#1A472A", color: "#fff", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: !newComment.trim() ? 0.5 : 1 }}>
                  {sendingComment ? "..." : "Envoyer"}
                </button>
              </div>

              {comments.length === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center", color: "#bbb", fontSize: 13 }}>Aucun commentaire</div>
              ) : comments.map((c: any) => (
                <div key={c.id} style={{ padding: "12px 16px", background: "#faf8f5", borderRadius: 12, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{c.user?.name ?? "Inconnu"}</span>
                    <span style={{ fontSize: 11, color: "#bbb" }}>{new Date(c.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#444", lineHeight: 1.5 }}>{c.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Onglet HISTORIQUE */}
          {activeTab === "history" && (
            <div>
              {history.length === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center", color: "#bbb", fontSize: 13 }}>Aucun changement de statut</div>
              ) : history.map((h: any, i: number) => {
                const from = STATUS[h.oldStatus?.toLowerCase()] ?? { label: h.oldStatus, color: "#999", bg: "#eee" };
                const to   = STATUS[h.newStatus?.toLowerCase()] ?? { label: h.newStatus, color: "#1A472A", bg: "#E8F5E9" };
                return (
                  <div key={h.id} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: to.bg, border: `2px solid ${to.color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Check size={12} color={to.color} />
                      </div>
                      {i < history.length - 1 && <div style={{ width: 2, flex: 1, background: "#f0ede8", margin: "4px 0" }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 8 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                        <Pill color={from.color} bg={from.bg} small>{from.label}</Pill>
                        <span style={{ fontSize: 10, color: "#ccc" }}>→</span>
                        <Pill color={to.color} bg={to.bg} small>{to.label}</Pill>
                      </div>
                      <div style={{ fontSize: 11.5, color: "#666" }}>
                        Par <strong>{h.agent?.name ?? "Système"}</strong> · {new Date(h.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      {h.note && <p style={{ fontSize: 12, color: "#888", margin: "4px 0 0", fontStyle: "italic" }}>{h.note}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── EQUIPES VIEW ─────────────────────────────────────────────────────────────

const SERVICES = ["Voirie", "Électricité", "Hydraulique", "Environnement", "Éclairage public", "Autre"];

function EquipesView({ token, agents, onRefresh }: any) {
  const [tab, setTab]             = useState<"agents" | "citoyens">("agents");
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ phone: "", name: "", service: "" });
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [citizens, setCitizens]   = useState<any[]>([]);
  const [citizensLoading, setCitizensLoading] = useState(false);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [search, setSearch]       = useState("");

  const loadCitizens = useCallback(async () => {
    setCitizensLoading(true);
    try {
      const { data } = await apiClient(token).get("/users/citizens");
      setCitizens(data ?? []);
    } catch {}
    finally { setCitizensLoading(false); }
  }, [token]);

  useEffect(() => { if (tab === "citoyens") loadCitizens(); }, [tab, loadCitizens]);

  const promoteToAgent = async (id: string, name: string) => {
    if (!confirm(`Promouvoir ${name} au role Agent ?`)) return;
    setPromoting(id);
    try {
      await apiClient(token).patch(`/users/agents/${id}`, { role: "AGENT" });
      setCitizens(prev => prev.filter(c => c.id !== id));
      onRefresh();
    } catch {}
    finally { setPromoting(null); }
  };

  const createAgent = async () => {
    if (!form.phone || !form.name) { setError("Téléphone et nom requis"); return; }
    setLoading(true); setError("");
    try {
      await apiClient(token).post("/users/agents", form);
      setForm({ phone: "", name: "", service: "" });
      setShowForm(false);
      onRefresh();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  const removeAgent = async (id: string, name: string) => {
    if (!confirm(`Supprimer l'agent ${name} ?`)) return;
    try {
      await apiClient(token).delete(`/users/agents/${id}`);
      onRefresh();
    } catch {}
  };

  const filteredCitizens = search
    ? citizens.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search))
    : citizens;

  return (
    <div style={{ animation: "fadeIn 0.4s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a1a", margin: "0 0 4px", fontFamily: "'Outfit', sans-serif" }}>Utilisateurs</h1>
          <p style={{ fontSize: 13, color: "#999", margin: 0 }}>
            {tab === "agents" ? `${agents.length} agent${agents.length !== 1 ? "s" : ""}` : `${citizens.length} citoyen${citizens.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {tab === "agents" && (
          <button onClick={() => setShowForm(v => !v)} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #1A472A, #2B7A3E)", color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            + Ajouter un agent
          </button>
        )}
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 4, background: "#f0ede8", borderRadius: 12, padding: 4, marginBottom: 24, width: "fit-content" }}>
        {([["agents", "Agents & Admins"], ["citoyens", "Citoyens"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key); setShowForm(false); setSearch(""); }}
            style={{ padding: "8px 20px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.2s",
              background: tab === key ? "#fff" : "transparent",
              color: tab === key ? "#1A472A" : "#999",
              boxShadow: tab === key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}>{label}</button>
        ))}
      </div>

      {showForm && (
        <div style={{ background: "#fff", border: "1.5px solid #ede9e3", borderRadius: 16, padding: 24, marginBottom: 20, animation: "cardIn 0.3s ease" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 16 }}>Nouvel agent</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Téléphone", key: "phone", placeholder: "+22890000000" },
              { label: "Nom complet", key: "name", placeholder: "Ex: Kossi Ablé" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 10.5, fontWeight: 700, color: "#999", textTransform: "uppercase", display: "block", marginBottom: 4 }}>{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e8e5e0", fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fdfcfa" }} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: "#999", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Service</label>
              <select value={form.service} onChange={e => setForm(v => ({ ...v, service: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e8e5e0", fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fdfcfa", cursor: "pointer" }}>
                <option value="">— Choisir —</option>
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {error && <div style={{ fontSize: 12, color: "#C62828", marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={createAgent} disabled={loading}
              style={{ padding: "10px 24px", background: "#1A472A", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Création..." : "Créer l'agent"}
            </button>
            <button onClick={() => { setShowForm(false); setError(""); }}
              style={{ padding: "10px 16px", background: "#f5f2ed", color: "#666", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Vue Agents ──────────────────────────────────────────────────── */}
      {tab === "agents" && (
        agents.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9e3", padding: 48, textAlign: "center", color: "#bbb", fontSize: 13 }}>
            Aucun agent pour cette commune. Ajoutez-en un.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {agents.map((agent: any) => {
              const initials = agent.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
              const isAdmin  = agent.role === "ADMIN";
              return (
                <div key={agent.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9e3", padding: 20, animation: "cardIn 0.4s ease" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <Avatar initials={initials} size={44} color={isAdmin ? "#1A472A" : "#2B7A9B"} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{agent.name}</div>
                      <div style={{ fontSize: 11, color: "#999" }}>{agent.phone}</div>
                    </div>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, color: isAdmin ? "#1A472A" : "#2B7A9B", background: isAdmin ? "#E8F5E9" : "#E3F2FD" }}>
                      {isAdmin ? "Admin" : "Agent"}
                    </span>
                  </div>

                  {agent.service && (
                    <div style={{ fontSize: 11.5, color: "#666", marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
                      <Building size={11} color="#aaa" /> {agent.service}
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                    {[
                      { label: "Assignés",  value: agent._count?.assignedIncidents ?? 0, color: "#1565C0" },
                      { label: "Résolus",   value: agent.resolvedCount ?? 0,             color: "#2E7D32" },
                    ].map(s => (
                      <div key={s.label} style={{ background: "#faf8f5", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 10, color: "#999", fontWeight: 600 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {!isAdmin && (
                    <button onClick={() => removeAgent(agent.id, agent.name)}
                      style={{ width: "100%", padding: "8px", background: "#FFEBEE", color: "#C62828", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      Retirer de l'équipe
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Vue Citoyens ─────────────────────────────────────────────────── */}
      {tab === "citoyens" && (
        <div>
          {/* Barre de recherche */}
          <div style={{ marginBottom: 16 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou téléphone…"
              style={{ width: "100%", maxWidth: 400, padding: "10px 16px", borderRadius: 12, border: "1.5px solid #e8e5e0", fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fff", boxSizing: "border-box" }}
            />
          </div>

          {citizensLoading ? (
            <div style={{ padding: 48, textAlign: "center", color: "#bbb", fontSize: 13 }}>Chargement…</div>
          ) : filteredCitizens.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9e3", padding: 48, textAlign: "center", color: "#bbb", fontSize: 13 }}>
              {search ? "Aucun citoyen ne correspond à la recherche." : "Aucun citoyen enregistré dans cette commune."}
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9e3", overflow: "hidden" }}>
              {/* En-tête tableau */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 80px 80px 140px", gap: 12, padding: "10px 20px", background: "#faf8f5", borderBottom: "1px solid #ede9e3", fontSize: 10.5, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5 }}>
                <span>Citoyen</span>
                <span>Téléphone</span>
                <span style={{ textAlign: "center" }}>Signalements</span>
                <span style={{ textAlign: "center" }}>Soutiens</span>
                <span></span>
              </div>

              {filteredCitizens.map((c: any, idx: number) => {
                const initials = (c.name ?? "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <div key={c.id} style={{
                    display: "grid", gridTemplateColumns: "2fr 1fr 80px 80px 140px", gap: 12,
                    padding: "14px 20px", alignItems: "center",
                    borderBottom: idx < filteredCitizens.length - 1 ? "1px solid #f5f2ed" : "none",
                    animation: "cardIn 0.3s ease",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <Avatar initials={initials} size={36} color="#B0896A" />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.name ?? "—"}
                        </div>
                        <div style={{ fontSize: 10, color: c.isVerified ? "#2E7D32" : "#999", fontWeight: 600 }}>
                          {c.isVerified ? "Vérifié" : "Non vérifié"}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: "#666" }}>{c.phone}</div>

                    <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: "#1565C0" }}>
                      {c._count?.reportedIncidents ?? 0}
                    </div>

                    <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: "#D4760A" }}>
                      {c._count?.upvotes ?? 0}
                    </div>

                    <button
                      onClick={() => promoteToAgent(c.id, c.name ?? c.phone)}
                      disabled={promoting === c.id}
                      style={{
                        padding: "7px 14px", borderRadius: 10, border: "none", cursor: promoting === c.id ? "not-allowed" : "pointer",
                        background: promoting === c.id ? "#f5f2ed" : "#E8F5E9",
                        color: promoting === c.id ? "#aaa" : "#1A472A",
                        fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", transition: "all 0.2s",
                      }}
                    >
                      {promoting === c.id ? "Promotion…" : "Promouvoir Agent"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── STATS VIEW ───────────────────────────────────────────────────────────────

function StatsView({ reports }: any) {
  const byCommune: Record<string, number> = {};
  reports.forEach((r: any) => { byCommune[r.commune] = (byCommune[r.commune] || 0) + 1; });
  const maxC = Math.max(...Object.values(byCommune), 1);

  return (
    <div style={{ animation: "fadeIn 0.4s ease" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a1a", margin: "0 0 4px", fontFamily: "'Outfit', sans-serif" }}>Statistiques</h1>
      <p style={{ fontSize: 13, color: "#999", margin: "0 0 24px" }}>Analyse des signalements</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9e3", padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 16 }}>
            <Building2 size={15} color="#1A472A" /> Par commune
          </div>
          {Object.entries(byCommune).sort((a, b) => b[1] - a[1]).map(([commune, count]) => (
            <div key={commune} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: "#666" }}>{commune}</span>
                <span style={{ fontWeight: 700, color: "#1A472A" }}>{count}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "#f0ede8" }}>
                <div style={{ width: `${(count / maxC) * 100}%`, height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #1A472A, #2B7A3E)", transition: "width 0.6s ease" }} />
              </div>
            </div>
          ))}
          {Object.keys(byCommune).length === 0 && <div style={{ color: "#ccc", fontSize: 13 }}>Aucune donnée</div>}
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9e3", padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 16 }}>
            <BarChart2 size={15} color="#1A472A" /> Par priorité
          </div>
          {Object.entries(PRIORITY).map(([key, pr]) => {
            const count = reports.filter((r: any) => r.priority === key).length;
            const pct = reports.length ? Math.round(count / reports.length * 100) : 0;
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "#faf8f5", borderRadius: 12, marginBottom: 8 }}>
                <Dot color={pr.color} size={12} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>{pr.label}</div>
                  <div style={{ height: 4, borderRadius: 2, background: "#e8e5e0", marginTop: 4 }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: pr.color }} />
                  </div>
                </div>
                <span style={{ fontSize: 18, fontWeight: 800, color: pr.color }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── PARAMETRES VIEW ──────────────────────────────────────────────────────────

const NOTIF_KEY = "signal_notif_prefs";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.15s ease" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", background: "#fff", borderRadius: 20, padding: 32, width: 440, maxWidth: "90vw", boxShadow: "0 24px 60px rgba(0,0,0,0.18)", animation: "cardIn 0.25s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a" }}>{title}</div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: "#f5f2ed", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={14} color="#666" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ParametresView({ token, onLogout }: any) {
  const [me, setMe]             = useState<any>(null);
  const [modal, setModal]       = useState<"phone" | "notif" | "logout" | null>(null);

  // ─── Changer de numéro ────────────────────────────────────────
  const [phoneStep, setPhoneStep] = useState<"input" | "otp">("input");
  const [newPhone, setNewPhone]   = useState("");
  const [otpCode, setOtpCode]     = useState("");
  const [phoneMsg, setPhoneMsg]   = useState("");
  const [phoneErr, setPhoneErr]   = useState("");
  const [phoneLoad, setPhoneLoad] = useState(false);

  // ─── Notifications ────────────────────────────────────────────
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(NOTIF_KEY) ?? "{}"); } catch { return {}; }
  });

  useEffect(() => {
    apiClient(token).get("/users/me").then(r => setMe(r.data)).catch(() => {});
  }, [token]);

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
      setPhoneMsg("Code OTP envoyé. Vérifiez le terminal (mode dev).");
    } catch (e: any) {
      setPhoneErr(e?.response?.data?.message ?? "Erreur lors de l'envoi");
    } finally { setPhoneLoad(false); }
  };

  const confirmPhone = async () => {
    if (!otpCode) { setPhoneErr("Entrez le code OTP"); return; }
    setPhoneLoad(true); setPhoneErr("");
    try {
      await apiClient(token).post("/auth/change-phone", { newPhone, code: otpCode });
      setMe((m: any) => ({ ...m, phone: newPhone }));
      setModal(null);
      setPhoneStep("input"); setNewPhone(""); setOtpCode("");
    } catch (e: any) {
      setPhoneErr(e?.response?.data?.message ?? "Code invalide ou expiré");
    } finally { setPhoneLoad(false); }
  };

  const inp: React.CSSProperties = { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e8e5e0", fontSize: 14, fontFamily: "inherit", outline: "none", background: "#fdfcfa" };
  const btn = (bg: string, color = "#fff"): React.CSSProperties => ({ width: "100%", padding: 12, background: bg, color, border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 8 });

  return (
    <div style={{ animation: "fadeIn 0.4s ease" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a1a", margin: "0 0 24px", fontFamily: "'Outfit', sans-serif" }}>Paramètres</h1>

      {/* Profil */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9e3", padding: 28, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 20 }}>Mon profil</div>
        {[
          { label: "Nom",       value: me?.name  ?? "—" },
          { label: "Téléphone", value: me?.phone ?? "—" },
          { label: "Commune",   value: me?.commune?.name ?? "—" },
          { label: "Rôle",      value: me?.role  ?? "—" },
        ].map((r, i, arr) => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: i < arr.length - 1 ? "1px solid #f5f2ed" : "none" }}>
            <span style={{ fontSize: 13, color: "#999", fontWeight: 600 }}>{r.label}</span>
            <span style={{ fontSize: 13, color: "#333", fontWeight: 700 }}>{r.value}</span>
          </div>
        ))}
      </div>

      {/* Accès & sécurité */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9e3", padding: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 20 }}>Accès & sécurité</div>
        {[
          { key: "phone",  label: "Changer de numéro",            sub: "Mise à jour via OTP",               danger: false },
          { key: "notif",  label: "Notifications push",           sub: "Configurer les alertes",            danger: false },
          { key: "logout", label: "Déconnexion de tous appareils", sub: "Révoquer tous les tokens actifs",  danger: true  },
        ].map((item, i, arr) => (
          <div key={item.key} onClick={() => setModal(item.key as any)}
            style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: i < arr.length - 1 ? "1px solid #f5f2ed" : "none", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#faf8f5")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: item.danger ? "#C62828" : "#333" }}>{item.label}</div>
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{item.sub}</div>
            </div>
            <ChevronRight size={14} color={item.danger ? "#C62828" : "#ccc"} style={{ marginLeft: "auto" }} />
          </div>
        ))}
      </div>

      {/* ─── Modal : Changer de numéro ─── */}
      {modal === "phone" && (
        <Modal title="Changer de numéro" onClose={() => { setModal(null); setPhoneStep("input"); setNewPhone(""); setOtpCode(""); setPhoneErr(""); }}>
          {phoneStep === "input" ? (
            <>
              <p style={{ fontSize: 13, color: "#888", marginBottom: 16, lineHeight: 1.5 }}>Entrez votre nouveau numéro. Vous recevrez un code OTP pour confirmer.</p>
              <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+22890000000" style={inp} />
              {phoneErr && <div style={{ fontSize: 12, color: "#C62828", marginTop: 8 }}>{phoneErr}</div>}
              <button onClick={sendOtp} disabled={phoneLoad} style={btn("linear-gradient(135deg, #1A472A, #2B7A3E)")}>
                {phoneLoad ? "Envoi..." : "Envoyer le code OTP"}
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: "#2E7D32", marginBottom: 16, lineHeight: 1.5 }}>{phoneMsg}</p>
              <input value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="Code à 6 chiffres" maxLength={6} style={inp} />
              {phoneErr && <div style={{ fontSize: 12, color: "#C62828", marginTop: 8 }}>{phoneErr}</div>}
              <button onClick={confirmPhone} disabled={phoneLoad} style={btn("linear-gradient(135deg, #1A472A, #2B7A3E)")}>
                {phoneLoad ? "Vérification..." : "Confirmer le changement"}
              </button>
              <button onClick={() => { setPhoneStep("input"); setPhoneErr(""); }} style={btn("#f5f2ed", "#666")}>
                Retour
              </button>
            </>
          )}
        </Modal>
      )}

      {/* ─── Modal : Notifications ─── */}
      {modal === "notif" && (
        <Modal title="Notifications push" onClose={() => setModal(null)}>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 20, lineHeight: 1.5 }}>Choisissez les événements pour lesquels vous souhaitez être notifié.</p>
          {[
            { key: "new_incident",    label: "Nouveau signalement citoyen" },
            { key: "status_update",   label: "Changement de statut d'un incident" },
            { key: "new_comment",     label: "Nouveau commentaire sur un incident" },
            { key: "critical",        label: "Incident critique signalé" },
          ].map((n, i, arr) => (
            <div key={n.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < arr.length - 1 ? "1px solid #f5f2ed" : "none" }}>
              <span style={{ fontSize: 13, color: "#333", fontWeight: 600 }}>{n.label}</span>
              <div onClick={() => saveNotif(n.key, !notifPrefs[n.key])}
                style={{ width: 40, height: 22, borderRadius: 11, background: notifPrefs[n.key] ? "#1A472A" : "#ddd", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                <div style={{ position: "absolute", top: 3, left: notifPrefs[n.key] ? 20 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </div>
            </div>
          ))}
          <button onClick={() => setModal(null)} style={btn("linear-gradient(135deg, #1A472A, #2B7A3E)")}>Sauvegarder</button>
        </Modal>
      )}

      {/* ─── Modal : Confirmation déconnexion ─── */}
      {modal === "logout" && (
        <Modal title="Déconnexion de tous appareils" onClose={() => setModal(null)}>
          <div style={{ textAlign: "center", padding: "8px 0 20px" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FFEBEE", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <LogOut size={24} color="#C62828" />
            </div>
            <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, margin: "0 0 8px" }}>
              Vous allez être déconnecté de <strong>tous les appareils</strong> et toutes les sessions actives seront révoquées.
            </p>
            <p style={{ fontSize: 12, color: "#aaa", lineHeight: 1.5, margin: 0 }}>
              Vous devrez vous reconnecter via OTP pour accéder à nouveau au dashboard.
            </p>
          </div>
          <button onClick={onLogout} style={btn("#C62828")}>
            Confirmer la déconnexion
          </button>
          <button onClick={() => setModal(null)} style={btn("#f5f2ed", "#666")}>
            Annuler
          </button>
        </Modal>
      )}
    </div>
  );
}

// ─── CARTE VIEW ───────────────────────────────────────────────────────────────

// Centre par défaut sur Lomé, Togo
const LOME_CENTER: [number, number] = [6.1375, 1.2123];

function CarteView({ reports, onOpenDetail }: any) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const visible = useMemo(() => reports.filter((r: any) => {
    if (!r.lat || !r.lng) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterCategory !== "all" && r.category !== filterCategory) return false;
    return true;
  }), [reports, filterStatus, filterCategory]);

  const sel: React.CSSProperties = {
    padding: "8px 12px", borderRadius: 10, border: "1.5px solid #e8e5e0",
    fontSize: 12, fontFamily: "inherit", background: "#fdfcfa",
    outline: "none", cursor: "pointer", color: "#555",
  };

  return (
    <div style={{ animation: "fadeIn 0.4s ease" }}>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a1a", margin: "0 0 4px", fontFamily: "'Outfit', sans-serif" }}>Carte des incidents</h1>
          <p style={{ fontSize: 13, color: "#999", margin: 0 }}>{visible.length} incident{visible.length !== 1 ? "s" : ""} géolocalisé{visible.length !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={sel}>
            <option value="all">Tous les statuts</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={sel}>
            <option value="all">Toutes catégories</option>
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #ede9e3", height: 560 }}>
        <MapContainer center={LOME_CENTER} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {visible.map((r: any) => {
            const st  = STATUS[r.status];
            const cat = CATEGORIES[r.category];
            return (
              <CircleMarker
                key={r._id}
                center={[r.lat, r.lng]}
                radius={r.upvotes > 5 ? 14 : r.upvotes > 2 ? 11 : 8}
                pathOptions={{
                  fillColor: cat?.color ?? "#888",
                  fillOpacity: 0.85,
                  color: st?.color ?? "#555",
                  weight: 2,
                }}
              >
                <Popup>
                  <div style={{ minWidth: 200, fontFamily: "sans-serif" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1A472A", fontFamily: "monospace", marginBottom: 4 }}>{r.id}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 6, lineHeight: 1.3 }}>{r.desc}</div>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>{r.address}</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, color: st?.color, background: st?.bg }}>{st?.label}</span>
                      <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, color: cat?.color, background: `${cat?.color}18` }}>{cat?.label}</span>
                    </div>
                    <button
                      onClick={() => onOpenDetail(r)}
                      style={{ width: "100%", padding: "7px", background: "#1A472A", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    >
                      Voir le détail
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Légende */}
      <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
        {Object.entries(CATEGORIES).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#666" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: v.color, display: "inline-block" }} />
            {v.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SUPER ADMIN : COMMUNES ───────────────────────────────────────────────────

function CommunesAdminView({ token }: any) {
  const [communes, setCommunes] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState({ name: "", prefecture: "", contactEmail: "" });
  const [showForm, setShowForm] = useState(false);
  const [err, setErr]           = useState("");

  const load = async () => {
    try { const { data } = await apiClient(token).get("/admin/communes"); setCommunes(data); }
    catch { setErr("Erreur de chargement"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name || !form.prefecture) { setErr("Nom et préfecture requis"); return; }
    try {
      await apiClient(token).post("/admin/communes", form);
      setForm({ name: "", prefecture: "", contactEmail: "" }); setShowForm(false); setErr(""); load();
    } catch (e: any) { setErr(e?.response?.data?.message ?? "Erreur"); }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Supprimer la commune "${name}" ?`)) return;
    try { await apiClient(token).delete(`/admin/communes/${id}`); load(); }
    catch { setErr("Impossible de supprimer (des utilisateurs sont liés)"); }
  };

  if (loading) return <div style={{ padding: 40, color: "#bbb" }}>Chargement...</div>;

  return (
    <div style={{ animation: "cardIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Communes</h2>
          <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>{communes.length} communes enregistrées</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} style={{ padding: "10px 20px", background: "#1A472A", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
          {showForm ? "Annuler" : "+ Ajouter"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 20, border: "1px solid #ede9e3" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            {(["name:Nom *", "prefecture:Préfecture *", "contactEmail:Email contact"] as string[]).map(f => {
              const [key, lbl] = f.split(":");
              return (
                <div key={key}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 4 }}>{lbl.toUpperCase()}</div>
                  <input value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e8e5e0", borderRadius: 10, fontSize: 13 }} />
                </div>
              );
            })}
          </div>
          {err && <p style={{ color: "#C62828", fontSize: 12, margin: "0 0 8px" }}>{err}</p>}
          <button onClick={create} style={{ padding: "10px 24px", background: "#1A472A", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
            Créer la commune
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {communes.map((c: any) => (
          <div key={c.id} style={{ background: "#fff", borderRadius: 16, padding: 18, border: "1px solid #ede9e3" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1A1A1A" }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{c.prefecture}</div>
              </div>
              <button onClick={() => remove(c.id, c.name)} style={{ background: "#FFEBEE", border: "none", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: "#C62828", fontWeight: 700, cursor: "pointer" }}>
                Supprimer
              </button>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 12, paddingTop: 12, borderTop: "1px solid #f5f2ed" }}>
              <div style={{ fontSize: 12, color: "#555" }}><span style={{ fontWeight: 700, color: "#1A472A" }}>{c._count?.users ?? 0}</span> utilisateurs</div>
              <div style={{ fontSize: 12, color: "#555" }}><span style={{ fontWeight: 700, color: "#D4760A" }}>{c._count?.incidents ?? 0}</span> incidents</div>
            </div>
            {c.contactEmail && <div style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>{c.contactEmail}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SUPER ADMIN : UTILISATEURS ───────────────────────────────────────────────

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  CITIZEN:    { label: "Citoyen",     color: "#1565C0", bg: "#E3F2FD" },
  AGENT:      { label: "Agent",       color: "#2E7D32", bg: "#E8F5E9" },
  ADMIN:      { label: "Admin",       color: "#D4760A", bg: "#FFF3E0" },
  SUPER_ADMIN:{ label: "Super Admin", color: "#C62828", bg: "#FFEBEE" },
};

function UsersAdminView({ token }: any) {
  const [users, setUsers]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [err, setErr]           = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = roleFilter !== "all" ? `?role=${roleFilter}` : "";
      const { data } = await apiClient(token).get(`/admin/users${params}`);
      setUsers(data);
    } catch { setErr("Erreur de chargement"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [roleFilter]);

  const changeRole = async (id: string, newRole: string) => {
    try { await apiClient(token).patch(`/admin/users/${id}/role`, { role: newRole }); load(); }
    catch { setErr("Impossible de changer le rôle"); }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Supprimer "${name}" ?`)) return;
    try { await apiClient(token).delete(`/admin/users/${id}`); load(); }
    catch { setErr("Impossible de supprimer"); }
  };

  const ROLES = ["all", "CITIZEN", "AGENT", "ADMIN", "SUPER_ADMIN"];

  return (
    <div style={{ animation: "cardIn 0.4s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Utilisateurs</h2>
          <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>{users.length} utilisateurs</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {ROLES.map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              style={{ padding: "7px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                background: roleFilter === r ? "#1A472A" : "#f0ede8", color: roleFilter === r ? "#fff" : "#555" }}>
              {r === "all" ? "Tous" : ROLE_LABELS[r]?.label ?? r}
            </button>
          ))}
        </div>
      </div>

      {err && <p style={{ color: "#C62828", fontSize: 12, marginBottom: 12 }}>{err}</p>}
      {loading ? <div style={{ color: "#bbb", padding: 20 }}>Chargement...</div> : (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ede9e3", overflow: "hidden" }}>
          {users.map((u: any, i: number) => {
            const rl = ROLE_LABELS[u.role] ?? ROLE_LABELS.CITIZEN;
            return (
              <div key={u.id} style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: i < users.length - 1 ? "1px solid #f5f2ed" : "none", gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#f5f2ed", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#1A472A", flexShrink: 0 }}>
                  {u.name?.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#1A1A1A" }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: "#aaa" }}>{u.phone} {u.commune?.name ? `· ${u.commune.name}` : ""}</div>
                </div>
                <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: rl.color, background: rl.bg }}>
                  {rl.label}
                </span>
                <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                  style={{ padding: "5px 8px", border: "1.5px solid #e8e5e0", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
                  {Object.keys(ROLE_LABELS).map(r => <option key={r} value={r}>{ROLE_LABELS[r].label}</option>)}
                </select>
                {u.role !== "SUPER_ADMIN" && (
                  <button onClick={() => remove(u.id, u.name)} style={{ background: "#FFEBEE", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 11, color: "#C62828", fontWeight: 700, cursor: "pointer" }}>
                    Suppr.
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function MairieDashboard() {
  const [page, setPage]                 = useState("dashboard");
  const [collapsed, setCollapsed]       = useState(false);
  const [reports, setReports]           = useState<any[]>([]);
  const [agents, setAgents]             = useState<any[]>([]);
  const [detailReport, setDetailReport] = useState<any>(null);
  const [token, setToken]               = useState<string | null>(getToken);
  const [loading, setLoading]           = useState(false);
  const [me, setMe]                     = useState<any>(null);

  const userRole = token ? (decodeJwt(token)?.role ?? null) : null;
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isAdmin      = userRole === "ADMIN" || isSuperAdmin;
  const isAgent      = userRole === "AGENT";

  const fetchMe = useCallback(async (tok: string) => {
    try { const { data } = await apiClient(tok).get("/users/me"); setMe(data); } catch {}
  }, []);

  const fetchIncidents = useCallback(async (tok: string) => {
    setLoading(true);
    try {
      const { data } = await apiClient(tok).get("/incidents", { params: { limit: 100 } });
      setReports((data.data ?? []).map(mapIncident));
    } catch {}
    finally { setLoading(false); }
  }, []);

  const fetchAgents = useCallback(async (tok: string) => {
    try {
      const { data } = await apiClient(tok).get("/users/agents");
      setAgents(data);
    } catch {}
  }, []);

  useEffect(() => {
    if (token) {
      fetchIncidents(token);
      fetchMe(token);
      if (isAdmin) fetchAgents(token);
    }
  }, [token, fetchIncidents, fetchAgents, fetchMe, isAdmin]);

  const handleLogin = (tok: string) => { setToken(tok); fetchMe(tok); };

  const handleLogout = () => { clearToken(); setToken(null); setReports([]); setAgents([]); setMe(null); };

  const updateStatus = async (incidentId: string, newStatus: string) => {
    if (token) {
      try { await apiClient(token).patch(`/incidents/${incidentId}`, { status: newStatus.toUpperCase() }); } catch {}
    }
    setReports(prev => prev.map(r => r._id === incidentId ? { ...r, status: newStatus } : r));
  };

  if (!token) return <LoginView onLogin={handleLogin} />;
  if (!userRole || userRole === "CITIZEN") { handleLogout(); return <LoginView onLogin={handleLogin} />; }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F5F3EF", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @keyframes fadeIn    { from { opacity: 0; }                       to { opacity: 1; } }
        @keyframes cardIn    { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { transform: translateX(100%); }   to { transform: translateX(0); } }
        * { box-sizing: border-box; }
      `}</style>

      <Sidebar active={page} onNav={setPage} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} onLogout={handleLogout} isSuperAdmin={isSuperAdmin} isAgent={isAgent} me={me} />

      <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto", maxHeight: "100vh" }}>
        {token && <TopBar token={token} me={me} />}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", fontSize: 13, color: "#bbb" }}>Chargement...</div>
        ) : (
          <>
            {page === "dashboard"  && <DashboardView reports={reports} onOpenDetail={setDetailReport} />}
            {page === "incidents"  && <IncidentsView reports={reports} onOpenDetail={setDetailReport} />}
            {page === "stats"      && <StatsView reports={reports} />}
            {page === "equipes"    && (isAdmin
              ? <EquipesView token={token} agents={agents} onRefresh={() => fetchAgents(token!)} />
              : <div style={{ padding: 48, textAlign: "center", color: "#bbb", fontSize: 14 }}>Accès réservé aux administrateurs.</div>
            )}
            {page === "carte"      && <CarteView reports={reports} onOpenDetail={setDetailReport} />}
            {page === "parametres"       && <ParametresView token={token} onLogout={handleLogout} />}
            {page === "sa-communes"     && <CommunesAdminView token={token} />}
            {page === "sa-utilisateurs" && <UsersAdminView token={token} />}
          </>
        )}
      </div>

      {detailReport && <DetailPanel report={detailReport} agents={agents} onClose={() => setDetailReport(null)} onUpdateStatus={updateStatus} token={token} onRefresh={() => fetchIncidents(token!)} />}
    </div>
  );
}
