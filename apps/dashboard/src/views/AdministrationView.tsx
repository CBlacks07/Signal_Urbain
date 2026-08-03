import { useState } from "react";
import { Building2 } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "../theme";
import { CommunesTab } from "./admin/CommunesTab";
import { UsersTab } from "./admin/UsersTab";
import { SlaRulesTab } from "./admin/SlaRulesTab";
import { CategoriesTab } from "./admin/CategoriesTab";
import { AuditLogTab } from "./admin/AuditLogTab";

const TABS = [
  { id: "communes", label: "Communes" },
  { id: "utilisateurs", label: "Utilisateurs" },
  { id: "delais", label: "Règles de délai" },
  { id: "categories", label: "Catégories" },
  { id: "audit", label: "Journal d'audit" },
] as const;

export function AdministrationView({ token }: { token: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("communes");

  return (
    <div style={{ animation: "fadeIn 0.4s ease", display: "flex", flexDirection: "column", gap: 18, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Building2 size={20} color={COLORS.green} />
        <div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800, margin: "0 0 3px", letterSpacing: "-0.01em" }}>Administration</h1>
          <p style={{ fontSize: 13.5, color: COLORS.textMuted, margin: 0 }}>Communes, utilisateurs et règles partagées par tout le réseau</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 3, padding: 3, background: COLORS.borderLight, borderRadius: 10, width: "fit-content" }}>
        {TABS.map((t) => (
          <span key={t.id} onClick={() => setTab(t.id)} style={{
            fontSize: 13, fontWeight: tab === t.id ? 700 : 600, color: tab === t.id ? COLORS.railDark : COLORS.textMuted,
            background: tab === t.id ? "#fff" : "transparent", padding: "8px 15px", borderRadius: 8, cursor: "pointer",
          }}>{t.label}</span>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {tab === "communes" && <CommunesTab token={token} />}
        {tab === "utilisateurs" && <UsersTab token={token} />}
        {tab === "delais" && <SlaRulesTab token={token} />}
        {tab === "categories" && <CategoriesTab />}
        {tab === "audit" && <AuditLogTab token={token} />}
      </div>
    </div>
  );
}
