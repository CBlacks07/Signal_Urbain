import { useEffect, useState } from "react";
import type { AuditLogEntry } from "@signal/types";
import { fetchAuditLog } from "../../api/sla";
import { COLORS, FONT_DISPLAY } from "../../theme";
import { Pagination, PAGE_SIZE } from "../../components/Modal";

const ACTION_LABELS: Record<string, string> = {
  CREATE_COMMUNE: "Commune créée",
  UPDATE_COMMUNE: "Commune modifiée",
  DELETE_COMMUNE: "Commune supprimée",
  UPDATE_USER_ROLE: "Rôle utilisateur modifié",
  UPDATE_USER_COMMUNE: "Commune de l'utilisateur modifiée",
  DELETE_USER: "Utilisateur supprimé",
  UPDATE_SLA_RULE: "Règle de délai modifiée",
  UPDATE_SLA_SETTINGS: "Paramètres de délai modifiés",
  UPDATE_INCIDENT_STATUS: "Statut de signalement modifié",
  MERGE_INCIDENTS: "Signalements fusionnés",
  UNMERGE_INCIDENTS: "Signalements défusionnés",
};

function describe(entry: AuditLogEntry): string {
  const label = ACTION_LABELS[entry.action] ?? entry.action;
  const d = entry.details as any;
  if (entry.action === "UPDATE_SLA_RULE" && d) return `${label} — ${d.priority} passé à ${d.targetHours} h`;
  if (entry.action === "UPDATE_INCIDENT_STATUS" && d) return `${label} — ${d.refCode} (${d.from} → ${d.to})`;
  if (entry.action === "MERGE_INCIDENTS" && d) return `${label} — ${d.duplicateIds?.length ?? 0} doublon(s)`;
  if ((entry.action === "CREATE_COMMUNE" || entry.action === "DELETE_COMMUNE") && d?.name) return `${label} — ${d.name}`;
  return label;
}

export function AuditLogTab({ token }: { token: string }) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchAuditLog(token, page, PAGE_SIZE).then((res) => { setEntries(res.data); setTotal(res.meta.total); }).catch(() => {});
  }, [token, page]);

  return (
    <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "16px 18px", height: "100%", display: "flex", flexDirection: "column", maxWidth: 640 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Journal d'audit</div>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 13 }}>
        {entries.length === 0 && <div style={{ fontSize: 13, color: COLORS.textFaint, textAlign: "center", padding: 24 }}>Aucun événement enregistré</div>}
        {entries.map((entry) => (
          <div key={entry.id} style={{ display: "flex", gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.green, marginTop: 5, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, lineHeight: 1.45 }}>{describe(entry)}</div>
              <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 2 }}>
                {entry.user?.name ?? "Système"} · {new Date(entry.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} · {new Date(entry.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Pagination page={page} total={total} onChange={setPage} />
    </div>
  );
}
