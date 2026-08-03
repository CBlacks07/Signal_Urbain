import { useMemo, useState } from "react";
import {
  Search, SlidersHorizontal, MapPin, ArrowUp, Copy, Images, GitMerge,
  UserPlus, ArrowRightCircle, Clock, Users, Activity, ChevronDown, Check,
} from "lucide-react";
import { COLORS, CATEGORIES, PRIORITY, STATUS, FONT_DISPLAY } from "../theme";
import { NotificationBell } from "../components/TopBar";
import { Avatar, Dot } from "../components/ui";
import { DelayBadge } from "../components/DelayBadge";
import { mergeIncidents } from "../api/incidents";
import { showError } from "../toast";

const PRIORITY_STRIPE: Record<string, string> = {
  critique: "#C62828",
  haute: "#D4760A",
  moyenne: "#D4760A",
  basse: "#2E7D32",
};

export function QueueView({ reports, agents, me, token, onOpenDetail, onRefresh }: {
  reports: any[]; agents: any[]; me: any; token: string;
  onOpenDetail: (r: any) => void; onRefresh: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);

  const active = useMemo(
    () => reports.filter((r) => r.status !== "resolu" && r.status !== "rejete"),
    [reports],
  );

  const overdue = active.filter((r) => r.delay?.isOverdue);
  const dueSoon = active.filter((r) => !r.delay?.isOverdue && r.delay?.hoursRemaining < 24);
  const closedThisWeek = reports.filter((r) => {
    if (r.status !== "resolu") return false;
    const days = (Date.now() - new Date(r.date).getTime()) / 86400000;
    return days <= 7;
  });

  const queue = useMemo(
    () => [...active].sort((a, b) => (a.delay?.hoursRemaining ?? 999) - (b.delay?.hoursRemaining ?? 999)).slice(0, 12),
    [active],
  );

  // Regroupement des doublons probables : même commune + catégorie + adresse très proche.
  const groups = useMemo(() => {
    const byKey = new Map<string, any[]>();
    for (const r of active) {
      const key = `${r.commune}|${r.category}|${r.address?.split(",")[0]?.trim().toLowerCase()}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(r);
    }
    return [...byKey.values()].filter((g) => g.length > 1).slice(0, 3);
  }, [active]);

  const teamLoad = useMemo(() => {
    return (agents ?? [])
      .map((a) => ({ ...a, load: reports.filter((r) => r.assignedTo === a.id && r.status !== "resolu" && r.status !== "rejete").length }))
      .sort((a, b) => b.load - a.load)
      .slice(0, 4);
  }, [agents, reports]);

  const recentActivity = useMemo(
    () => [...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4),
    [reports],
  );

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleMerge = async () => {
    if (selected.size < 2) return;
    const [primaryId, ...dupIds] = [...selected].map((refCode) => reports.find((r) => r.id === refCode)?._id).filter(Boolean);
    if (!primaryId || dupIds.length === 0) return;
    setMerging(true);
    try {
      await mergeIncidents(token, primaryId, dupIds);
      setSelected(new Set());
      onRefresh();
    } catch {
      showError("Impossible de fusionner ces signalements");
    } finally {
      setMerging(false);
    }
  };

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 420 }}>
          <Search size={15} color={COLORS.textFaint} style={{ position: "absolute", left: 13, top: 12 }} />
          <input
            placeholder="Rechercher une réf., une rue, un mot…"
            style={{
              width: "100%", padding: "10px 14px 10px 36px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`,
              background: "#FBFAF8", fontSize: 13.5, color: COLORS.text, fontFamily: "inherit",
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, color: COLORS.textMuted, cursor: "pointer" }}>
          <SlidersHorizontal size={14} /> Filtres
        </div>
        <span style={{ flex: 1 }} />
        {overdue.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 10, background: COLORS.dangerBg, border: "1px solid #F3C9C4" }}>
            <Dot color={COLORS.danger} size={7} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.dangerText }}>{overdue.length} hors délai</span>
          </div>
        )}
        {token && <NotificationBell token={token} />}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 24, flex: 1, overflow: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0, overflow: "hidden" }}>
          <div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 27, fontWeight: 800, margin: "0 0 3px", letterSpacing: "-0.01em" }}>Ma journée</h1>
            <p style={{ fontSize: 13.5, color: COLORS.textMuted, margin: 0 }}>
              {today.charAt(0).toUpperCase() + today.slice(1)} · {active.length} interventions à mener, triées par échéance
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${COLORS.danger}`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.dangerText, letterSpacing: "0.04em", textTransform: "uppercase" }}>Hors délai</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{overdue.length}</span>
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>dont {overdue.filter((r) => r.priority === "critique").length} critique</span>
              </div>
            </div>
            <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${COLORS.orange}`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.warning, letterSpacing: "0.04em", textTransform: "uppercase" }}>Échéance &lt; 24 h</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{dueSoon.length}</span>
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>à clore aujourd'hui</span>
              </div>
            </div>
            <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${COLORS.successText}`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.success, letterSpacing: "0.04em", textTransform: "uppercase" }}>Clos cette semaine</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{closedThisWeek.length}</span>
              </div>
            </div>
          </div>

          {selected.size > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: COLORS.railDark, borderRadius: 11, color: "#fff" }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: 4, background: COLORS.orangeLight, color: COLORS.railDark, fontSize: 12, fontWeight: 800 }}>{selected.size}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>sélectionné{selected.size > 1 ? "s" : ""}</span>
              <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.18)", margin: "0 4px" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, padding: "6px 11px", borderRadius: 8, background: "rgba(255,255,255,0.1)", cursor: "pointer" }}><UserPlus size={13} /> Assigner</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, padding: "6px 11px", borderRadius: 8, background: "rgba(255,255,255,0.1)", cursor: "pointer" }}><ArrowRightCircle size={13} /> Changer le statut</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, padding: "6px 11px", borderRadius: 8, background: "rgba(255,255,255,0.1)", cursor: "pointer" }}><Clock size={13} /> Replanifier</div>
              <span style={{ flex: 1 }} />
              {selected.size >= 2 && (
                <div onClick={handleMerge} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, padding: "6px 11px", borderRadius: 8, background: COLORS.orangeLight, color: COLORS.railDark, cursor: merging ? "default" : "pointer", opacity: merging ? 0.6 : 1 }}>
                  <GitMerge size={13} /> {merging ? "Fusion…" : "Fusionner en 1 dossier"}
                </div>
              )}
            </div>
          )}

          <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: `1px solid ${COLORS.borderLight}`, background: "#FBFAF8" }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid #C9C3B9`, display: "block" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.label, letterSpacing: "0.08em", textTransform: "uppercase", flex: 1 }}>Prochaines interventions</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted }}>Tri : échéance</span>
              <ChevronDown size={14} color={COLORS.textFaint} />
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {queue.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", color: COLORS.textFaint, fontSize: 13 }}>Aucune intervention en attente</div>
              )}
              {queue.map((r) => {
                const isOverdue = r.delay?.isOverdue;
                const group = groups.find((g) => g.some((x: any) => x.id === r.id));
                return (
                  <div key={r.id} style={{ display: "flex", gap: 14, padding: "15px 18px", borderBottom: `1px solid ${COLORS.borderLight}`, background: isOverdue ? "#FFF8F6" : "transparent" }}>
                    <span onClick={() => toggle(r.id)} style={{
                      width: 16, height: 16, borderRadius: 4, marginTop: 3, cursor: "pointer", flexShrink: 0,
                      background: selected.has(r.id) ? COLORS.railDark : "transparent",
                      border: selected.has(r.id) ? "none" : "1.5px solid #C9C3B9",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {selected.has(r.id) && <Check size={11} color="#fff" />}
                    </span>
                    <div style={{ width: 4, borderRadius: 2, background: PRIORITY_STRIPE[r.priority] ?? COLORS.border, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onOpenDetail(r)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                        <DelayBadge delay={r.delay} />
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: PRIORITY[r.priority]?.color }}>{PRIORITY[r.priority]?.label}</span>
                        <span style={{ fontSize: 12, color: COLORS.textFaint, fontFamily: "monospace" }}>{r.id}</span>
                        <span style={{ flex: 1 }} />
                        {group && group.length > 1 ? (
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.warning, background: COLORS.warningBg, padding: "2px 8px", borderRadius: 5, display: "flex", alignItems: "center", gap: 4 }}>
                            <Copy size={11} /> {group.length} signalements au même endroit
                          </span>
                        ) : r.upvotes > 0 ? (
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
                            <ArrowUp size={12} color={COLORS.orange} /> {r.upvotes} soutiens
                          </span>
                        ) : null}
                      </div>
                      <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.4, marginBottom: 6 }}>{r.desc}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12.5, color: COLORS.textMuted, flexWrap: "wrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {r.address}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Dot color={CATEGORIES[r.category]?.color} /> {CATEGORIES[r.category]?.label}</span>
                        {r.photos?.length > 0 && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Images size={12} /> {r.photos.length} photos</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                      <div onClick={() => onOpenDetail(r)} style={{
                        display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, padding: "8px 14px", borderRadius: 9, cursor: "pointer",
                        color: r.status === "signale" ? "#fff" : COLORS.green,
                        background: r.status === "signale" ? COLORS.green : COLORS.greenLight,
                      }}>
                        {r.status === "signale" ? "Intervenir" : r.status === "assigne" ? "Reprendre" : "Ouvrir"}
                      </div>
                      <div style={{ fontSize: 11.5, color: COLORS.textFaint, whiteSpace: "nowrap" }}>
                        {new Date(r.delay?.dueAt ?? r.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} · {new Date(r.delay?.dueAt ?? r.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Colonne latérale */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }}>
          {groups.length > 0 && (
            <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.borderLight}`, display: "flex", alignItems: "center", gap: 8 }}>
                <GitMerge size={15} color={COLORS.warning} />
                <span style={{ fontSize: 13.5, fontWeight: 700, flex: 1 }}>Signalements groupés</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.warning, background: COLORS.warningBg, padding: "2px 8px", borderRadius: 20 }}>{groups.length} lieux</span>
              </div>
              {groups.map((g, i) => (
                <div key={i} style={{ padding: "14px 16px", borderBottom: i < groups.length - 1 ? `1px solid ${COLORS.borderLight}` : "none" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>{g[0].address}</div>
                  <div style={{ fontSize: 12.5, color: COLORS.textMuted, lineHeight: 1.5, marginBottom: 10 }}>
                    {g.length} signalements pour {CATEGORIES[g[0].category]?.label.toLowerCase()} — probable doublon.
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div
                      onClick={async () => {
                        setMerging(true);
                        try {
                          await mergeIncidents(token, g[0]._id, g.slice(1).map((x: any) => x._id));
                          onRefresh();
                        } catch { showError("Impossible de fusionner ces signalements"); }
                        finally { setMerging(false); }
                      }}
                      style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: COLORS.green, padding: "6px 12px", borderRadius: 8, cursor: "pointer" }}
                    >
                      Fusionner
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted, border: `1.5px solid ${COLORS.border}`, padding: "6px 12px", borderRadius: 8, cursor: "pointer" }}>
                      Voir les {g.length}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.borderLight}`, display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={15} color={COLORS.green} />
              <span style={{ fontSize: 13.5, fontWeight: 700, flex: 1 }}>Charge de l'équipe</span>
              <span style={{ fontSize: 12, color: COLORS.textMuted }}>aujourd'hui</span>
            </div>
            <div style={{ padding: "6px 16px 14px" }}>
              {teamLoad.length === 0 && <div style={{ padding: "16px 0", fontSize: 12.5, color: COLORS.textFaint }}>Aucun agent</div>}
              {teamLoad.map((a: any, i: number) => {
                const max = Math.max(...teamLoad.map((x: any) => x.load), 1);
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < teamLoad.length - 1 ? `1px solid #F4F1EC` : "none" }}>
                    <Avatar name={a.name} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                      <div style={{ height: 5, borderRadius: 3, background: COLORS.borderLight, marginTop: 5, overflow: "hidden" }}>
                        <div style={{ width: `${(a.load / max) * 100}%`, height: "100%", background: a.load > max * 0.7 ? COLORS.orange : COLORS.successText }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: a.load > max * 0.7 ? COLORS.warning : COLORS.success }}>{a.load}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.borderLight}`, display: "flex", alignItems: "center", gap: 8 }}>
              <Activity size={15} color={COLORS.green} />
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>Dernières mises à jour</span>
            </div>
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
              {recentActivity.map((r) => (
                <div key={r.id} style={{ display: "flex", gap: 10 }}>
                  <Dot color={r.status === "resolu" ? COLORS.successText : COLORS.orange} size={8} />
                  <div>
                    <div style={{ fontSize: 13, lineHeight: 1.45 }}><strong>{r.id}</strong> — {r.status === "resolu" ? "clos" : STATUS[r.status]?.label?.toLowerCase() ?? r.status}</div>
                    <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 2 }}>{r.agent?.name ?? "Non assigné"} · {new Date(r.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
