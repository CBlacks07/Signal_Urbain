import { useState } from "react";
import { ListChecks, Inbox, Map, Users, BarChart2, Settings, Building2, LogOut } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "../theme";
import { Avatar, initialsOf } from "./ui";
import { Modal } from "./Modal";

const NAV_ITEMS = [
  { id: "queue", Icon: ListChecks, label: "Ma file" },
  { id: "incidents", Icon: Inbox, label: "Signalements" },
  { id: "carte", Icon: Map, label: "Carte" },
  { id: "equipes", Icon: Users, label: "Équipes" },
  { id: "stats", Icon: BarChart2, label: "Performance" },
];

export function Sidebar({ active, onNav, collapsed, onToggle, onLogout, isSuperAdmin, me }: {
  active: string; onNav: (id: string) => void; collapsed: boolean; onToggle: () => void;
  onLogout: () => void; isSuperAdmin: boolean; me: any;
}) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const displayName = me?.name ?? "Chargement...";
  const displayRole = me?.role === "SUPER_ADMIN" ? "Super Admin" : me?.role === "ADMIN" ? "Administrateur" : me?.role === "AGENT" ? "Agent" : "Mairie";

  return (
    <div style={{
      width: collapsed ? 68 : 216, minHeight: "100vh", flexShrink: 0,
      background: COLORS.railDark,
      display: "flex", flexDirection: "column",
      transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
      position: "relative", zIndex: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "18px 0 22px" : "18px 18px 22px", justifyContent: collapsed ? "center" : "flex-start" }}>
        <img src="/logo.png" alt="" style={{ width: 32, height: 32, minWidth: 32, borderRadius: 9, objectFit: "cover" }} />
        {!collapsed && (
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.1 }}>Signal<span style={{ color: COLORS.orangeLight }}>Urbain</span></div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>{me?.commune?.name ?? "Espace mairie"}</div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: collapsed ? "0 12px" : "0 10px", display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV_ITEMS.map(({ id, Icon, label }) => (
          <button key={id} onClick={() => onNav(id)} aria-label={label} aria-current={active === id ? "page" : undefined} style={{
            display: "flex", alignItems: "center", gap: 11, width: "100%",
            padding: collapsed ? "10px 0" : "10px 12px",
            justifyContent: collapsed ? "center" : "flex-start",
            background: active === id ? "rgba(255,255,255,0.12)" : "transparent",
            border: "none", borderRadius: 10, cursor: "pointer",
          }}>
            <Icon size={17} color={active === id ? "#fff" : "rgba(255,255,255,0.55)"} />
            {!collapsed && <span style={{ fontSize: 13.5, fontWeight: active === id ? 700 : 500, color: active === id ? "#fff" : "rgba(255,255,255,0.72)" }}>{label}</span>}
          </button>
        ))}

        <button onClick={() => onNav("parametres")} aria-label="Paramètres" aria-current={active === "parametres" ? "page" : undefined} style={{
          display: "flex", alignItems: "center", gap: 11, width: "100%",
          padding: collapsed ? "10px 0" : "10px 12px",
          justifyContent: collapsed ? "center" : "flex-start",
          background: active === "parametres" ? "rgba(255,255,255,0.12)" : "transparent",
          border: "none", borderRadius: 10, cursor: "pointer",
        }}>
          <Settings size={17} color={active === "parametres" ? "#fff" : "rgba(255,255,255,0.55)"} />
          {!collapsed && <span style={{ fontSize: 13.5, fontWeight: active === "parametres" ? 700 : 500, color: active === "parametres" ? "#fff" : "rgba(255,255,255,0.72)" }}>Paramètres</span>}
        </button>

        {isSuperAdmin && (
          <button onClick={() => onNav("administration")} aria-label="Administration" aria-current={active === "administration" ? "page" : undefined} style={{
            display: "flex", alignItems: "center", gap: 11, width: "100%",
            padding: collapsed ? "10px 0" : "10px 12px",
            justifyContent: collapsed ? "center" : "flex-start",
            background: active === "administration" ? "rgba(255,255,255,0.12)" : "transparent",
            border: "none", borderRadius: 10, cursor: "pointer",
          }}>
            <Building2 size={17} color={active === "administration" ? "#fff" : "rgba(255,255,255,0.55)"} />
            {!collapsed && <span style={{ fontSize: 13.5, fontWeight: active === "administration" ? 700 : 500, color: active === "administration" ? "#fff" : "rgba(255,255,255,0.72)" }}>Administration</span>}
          </button>
        )}
      </div>

      <button onClick={onToggle} aria-label={collapsed ? "Agrandir le menu" : "Réduire le menu"} style={{ margin: 8, padding: 9, background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 9, cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 12.5 }}>
        {collapsed ? "→" : "← Réduire"}
      </button>

      <div style={{ padding: collapsed ? "14px 0 18px" : "14px 18px 18px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 10 }}>
        <Avatar name={me?.name} size={32} color={COLORS.orange} />
        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)" }}>{displayRole}</div>
            </div>
            <button onClick={() => setConfirmLogout(true)} aria-label="Se déconnecter" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.45)", padding: 4, display: "flex" }}>
              <LogOut size={15} />
            </button>
          </>
        )}
      </div>

      {confirmLogout && (
        <Modal title="Déconnexion" onClose={() => setConfirmLogout(false)}>
          <div style={{ textAlign: "center", padding: "8px 0 20px" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: COLORS.dangerBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <LogOut size={22} color={COLORS.danger} />
            </div>
            <p style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6, margin: 0 }}>
              Voulez-vous vous déconnecter de l'espace mairie ?
            </p>
          </div>
          <button onClick={onLogout}
            style={{ width: "100%", padding: 12, background: COLORS.danger, color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>
            Se déconnecter
          </button>
          <button onClick={() => setConfirmLogout(false)}
            style={{ width: "100%", padding: 12, background: COLORS.bg, color: COLORS.textMuted, border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Annuler
          </button>
        </Modal>
      )}
    </div>
  );
}

// Réexporté pour les vues qui affichent des initiales d'agent hors sidebar.
export { initialsOf };
