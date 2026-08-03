import { useEffect, useState } from "react";
import type { SlaRule, SlaSettings, Priority } from "@signal/types";
import { fetchSlaRules, fetchSlaSettings, updateSlaRule, updateSlaSettings } from "../../api/sla";
import { showError } from "../../toast";
import { COLORS, PRIORITY, FONT_DISPLAY } from "../../theme";
import { ToggleSwitch } from "../../components/ui";

export function SlaRulesTab({ token }: { token: string }) {
  const [rules, setRules] = useState<SlaRule[]>([]);
  const [settings, setSettings] = useState<SlaSettings | null>(null);
  const [editing, setEditing] = useState<Priority | null>(null);
  const [draft, setDraft] = useState("");

  const load = () => {
    fetchSlaRules(token).then(setRules).catch(() => showError("Impossible de charger les règles de délai"));
    fetchSlaSettings(token).then(setSettings).catch(() => showError("Impossible de charger les paramètres SLA"));
  };
  useEffect(load, [token]);

  const saveRule = async (priority: Priority) => {
    const hours = Number(draft);
    if (!Number.isFinite(hours) || hours <= 0) { setEditing(null); return; }
    try {
      const updated = await updateSlaRule(token, priority, Math.round(hours));
      setRules((prev) => prev.map((r) => (r.priority === priority ? updated : r)));
    } catch { showError("Impossible de mettre à jour cette règle"); }
    finally { setEditing(null); }
  };

  const toggleSetting = async (key: "suspendOnThirdParty" | "requireAfterPhoto", value: boolean) => {
    setSettings((s) => s && { ...s, [key]: value });
    try {
      const updated = await updateSlaSettings(token, { [key]: value });
      setSettings(updated);
    } catch {
      showError("Impossible de mettre à jour ce paramètre");
      load();
    }
  };

  const formatHours = (h: number) => (h % 24 === 0 && h >= 24 ? `${h / 24} j` : h >= 24 ? `${Math.floor(h / 24)} j ${h % 24} h` : `${h} h`);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 380px", gap: 18, height: "100%" }}>
      <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 20px" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Règles de délai</div>
        <div style={{ fontSize: 12.5, color: COLORS.textMuted, marginBottom: 16 }}>Échéance calculée à la création, par priorité.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {(["CRITIQUE", "HAUTE", "MOYENNE", "BASSE"] as Priority[]).map((p) => {
            const rule = rules.find((r) => r.priority === p);
            const pr = PRIORITY[p.toLowerCase()];
            return (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#FBFAF8", borderRadius: 10 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: pr?.color }} />
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{pr?.label ?? p}</span>
                {editing === p ? (
                  <input autoFocus type="number" value={draft} onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => saveRule(p)} onKeyDown={(e) => e.key === "Enter" && saveRule(p)}
                    style={{ width: 70, padding: "4px 8px", borderRadius: 6, border: `1.5px solid ${COLORS.border}`, fontSize: 13, textAlign: "right" }} />
                ) : (
                  <span onClick={() => { setEditing(p); setDraft(String(rule?.targetHours ?? "")); }} style={{ fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {rule ? formatHours(rule.targetHours) : "—"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {settings && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${COLORS.borderLight}` }}>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Suspendre en attente d'un tiers</span>
              <ToggleSwitch checked={settings.suspendOnThirdParty} onChange={(v) => toggleSetting("suspendOnThirdParty", v)} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Photo après obligatoire pour clore</span>
              <ToggleSwitch checked={settings.requireAfterPhoto} onChange={(v) => toggleSetting("requireAfterPhoto", v)} />
            </div>
          </>
        )}
      </div>
      <div />
    </div>
  );
}
