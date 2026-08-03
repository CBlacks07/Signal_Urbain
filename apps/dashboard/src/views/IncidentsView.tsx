import { useEffect, useMemo, useState } from "react";
import {
  Search, Download, X, ChevronUp, AlertTriangle, UserX, Copy, CameraOff,
  Check, UserPlus, ArrowRightCircle, Flag, Clock, GitMerge,
} from "lucide-react";
import { COLORS, CATEGORIES, STATUS, PRIORITY, FONT_DISPLAY } from "../theme";
import { Avatar, Dot, ToggleSwitch, exportToCsv } from "../components/ui";
import { DelayBadge } from "../components/DelayBadge";
import { Pagination, PAGE_SIZE } from "../components/Modal";
import { mergeIncidents, updateIncident } from "../api/incidents";
import { showError } from "../toast";

type SavedView = "hors_delai" | "non_assignes" | "doublons" | "preuve_manquante" | null;

export function IncidentsView({ reports, agents, token, onOpenDetail, onRefresh }: {
  reports: any[]; agents: any[]; token: string; onOpenDetail: (r: any) => void; onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [savedView, setSavedView] = useState<SavedView>(null);
  const [delayFilter, setDelayFilter] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());
  const [agentFilter, setAgentFilter] = useState<Set<string>>(new Set());
  const [groupByPlace, setGroupByPlace] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  // Groupes de doublons probables (même commune + catégorie + rue) — réutilisés par la vue enregistrée et la colonne dédiée.
  const duplicateGroups = useMemo(() => {
    const byKey = new Map<string, any[]>();
    for (const r of reports) {
      const key = `${r.commune}|${r.category}|${r.address?.split(",")[0]?.trim().toLowerCase()}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(r);
    }
    const map = new Map<string, any[]>();
    for (const group of byKey.values()) if (group.length > 1) for (const r of group) map.set(r.id, group);
    return map;
  }, [reports]);

  const counts = useMemo(() => ({
    horsDelai: reports.filter((r) => r.delay?.isOverdue).length,
    nonAssignes: reports.filter((r) => !r.assignedTo && r.status !== "resolu" && r.status !== "rejete").length,
    doublons: new Set([...duplicateGroups.values()].flat().map((r: any) => r.id)).size,
    preuveManquante: reports.filter((r) => r.status === "resolu" && !(r.photos ?? []).some((p: any) => p.kind === "APRES")).length,
    depasse: reports.filter((r) => r.delay?.isOverdue).length,
    moins24h: reports.filter((r) => !r.delay?.isOverdue && r.delay?.hoursRemaining < 24).length,
    dansLesTemps: reports.filter((r) => !r.delay?.isOverdue && r.delay?.hoursRemaining >= 24).length,
  }), [reports, duplicateGroups]);

  const filtered = useMemo(() => {
    let list = [...reports];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((r) => r.id.toLowerCase().includes(s) || r.desc.toLowerCase().includes(s) || r.address?.toLowerCase().includes(s));
    }
    if (savedView === "hors_delai") list = list.filter((r) => r.delay?.isOverdue);
    if (savedView === "non_assignes") list = list.filter((r) => !r.assignedTo && r.status !== "resolu" && r.status !== "rejete");
    if (savedView === "doublons") list = list.filter((r) => duplicateGroups.has(r.id));
    if (savedView === "preuve_manquante") list = list.filter((r) => r.status === "resolu" && !(r.photos ?? []).some((p: any) => p.kind === "APRES"));
    if (delayFilter.size > 0) {
      list = list.filter((r) => {
        if (delayFilter.has("depasse") && r.delay?.isOverdue) return true;
        if (delayFilter.has("moins24h") && !r.delay?.isOverdue && r.delay?.hoursRemaining < 24) return true;
        if (delayFilter.has("temps") && !r.delay?.isOverdue && r.delay?.hoursRemaining >= 24) return true;
        return false;
      });
    }
    if (categoryFilter.size > 0) list = list.filter((r) => categoryFilter.has(r.category));
    if (agentFilter.size > 0) list = list.filter((r) => agentFilter.has(r.assignedTo));
    list.sort((a, b) => (a.delay?.hoursRemaining ?? 999) - (b.delay?.hoursRemaining ?? 999));
    return list;
  }, [reports, search, savedView, delayFilter, categoryFilter, agentFilter, duplicateGroups]);

  useEffect(() => { setPage(1); }, [search, savedView, delayFilter, categoryFilter, agentFilter]);

  const displayed = groupByPlace
    ? [...new Map(filtered.map((r) => [`${r.commune}|${r.address}`, r])).values()]
    : filtered;
  const paged = displayed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleInSet = (set: Set<string>, setFn: (s: Set<string>) => void, value: string) => {
    const next = new Set(set);
    next.has(value) ? next.delete(value) : next.add(value);
    setFn(next);
  };

  const toggleSelect = (id: string) => toggleInSet(selected, setSelected, id);

  const activeFilterLabels: string[] = [];
  if (savedView === "hors_delai") activeFilterLabels.push("Hors délai");
  if (savedView === "non_assignes") activeFilterLabels.push("Non assignés");
  if (savedView === "doublons") activeFilterLabels.push("Doublons probables");
  if (savedView === "preuve_manquante") activeFilterLabels.push("Preuve manquante");
  if (delayFilter.has("depasse")) activeFilterLabels.push("Délai : dépassé");
  if (delayFilter.has("moins24h")) activeFilterLabels.push("Délai : < 24 h");

  const exportCsv = () => {
    exportToCsv("incidents.csv", filtered.map((r) => ({
      id: r.id, description: r.desc, adresse: r.address, commune: r.commune,
      categorie: CATEGORIES[r.category]?.label ?? r.category,
      statut: STATUS[r.status]?.label ?? r.status,
      priorite: PRIORITY[r.priority]?.label ?? r.priority,
      votes: r.upvotes, date: r.date,
    })));
  };

  const handleMerge = async () => {
    const ids = [...selected].map((refCode) => reports.find((r) => r.id === refCode)?._id).filter(Boolean);
    if (ids.length < 2) return;
    const [primaryId, ...dupIds] = ids;
    setBusy(true);
    try {
      await mergeIncidents(token, primaryId, dupIds);
      setSelected(new Set());
      onRefresh();
    } catch { showError("Impossible de fusionner ces signalements"); }
    finally { setBusy(false); }
  };

  const handleBulkStatus = async (status: string) => {
    const ids = [...selected].map((refCode) => reports.find((r) => r.id === refCode)?._id).filter(Boolean);
    setBusy(true);
    try {
      await Promise.all(ids.map((id) => updateIncident(token, id, { status: status.toUpperCase() })));
      setSelected(new Set());
      onRefresh();
    } catch { showError("Impossible de mettre à jour ces signalements"); }
    finally { setBusy(false); }
  };

  const FacetCheckbox = ({ checked, onClick }: { checked: boolean; onClick: () => void }) => (
    <span onClick={onClick} style={{
      width: 16, height: 16, borderRadius: 4, cursor: "pointer", flexShrink: 0,
      background: checked ? COLORS.railDark : "transparent",
      border: checked ? "none" : "1.5px solid #C9C3B9",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {checked && <Check size={11} color="#fff" />}
    </span>
  );

  return (
    <div style={{ display: "flex", height: "calc(100% + 56px)", margin: "-28px -32px", gap: 0 }}>
      {/* Panneau de filtres à facettes */}
      <div style={{ width: 252, background: "#fff", borderRight: `1px solid ${COLORS.borderLight}`, flexShrink: 0, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${COLORS.borderLight}`, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, flex: 1 }}>Filtres</span>
          <span
            onClick={() => { setSavedView(null); setDelayFilter(new Set()); setCategoryFilter(new Set()); setAgentFilter(new Set()); }}
            style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.green, cursor: "pointer" }}
          >
            Réinitialiser
          </span>
        </div>

        <div style={{ padding: "16px 18px", borderBottom: `1px solid ${COLORS.borderLight}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.label, marginBottom: 10 }}>Vues enregistrées</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { id: "hors_delai" as const, Icon: AlertTriangle, iconColor: COLORS.dangerText, label: "Hors délai", count: counts.horsDelai },
              { id: "non_assignes" as const, Icon: UserX, iconColor: COLORS.textMuted, label: "Non assignés", count: counts.nonAssignes },
              { id: "doublons" as const, Icon: Copy, iconColor: COLORS.textMuted, label: "Doublons probables", count: counts.doublons },
              { id: "preuve_manquante" as const, Icon: CameraOff, iconColor: COLORS.textMuted, label: "Preuve manquante", count: counts.preuveManquante },
            ].map(({ id, Icon, iconColor, label, count }) => (
              <div key={id} onClick={() => setSavedView(savedView === id ? null : id)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 9, background: savedView === id ? COLORS.greenLight : "transparent", cursor: "pointer" }}>
                <Icon size={14} color={savedView === id ? COLORS.dangerText : iconColor} />
                <span style={{ fontSize: 13, fontWeight: savedView === id ? 700 : 400, color: savedView === id ? COLORS.text : COLORS.textMuted, flex: 1 }}>{label}</span>
                <span style={{ fontSize: 11.5, fontWeight: savedView === id ? 700 : 600, color: savedView === id ? COLORS.dangerText : COLORS.textFaint }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "16px 18px", borderBottom: `1px solid ${COLORS.borderLight}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.label, marginBottom: 10 }}>Délai</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {[["depasse", "Dépassé", counts.depasse], ["moins24h", "Moins de 24 h", counts.moins24h], ["temps", "Dans les temps", counts.dansLesTemps]].map(([key, label, count]) => (
              <div key={key as string} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <FacetCheckbox checked={delayFilter.has(key as string)} onClick={() => toggleInSet(delayFilter, setDelayFilter, key as string)} />
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{label}</span>
                <span style={{ fontSize: 12, color: COLORS.textFaint }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "16px 18px", borderBottom: `1px solid ${COLORS.borderLight}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.label, marginBottom: 10 }}>Catégorie</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {Object.entries(CATEGORIES).map(([key, cat]) => {
              const count = reports.filter((r) => r.category === key).length;
              if (count === 0) return null;
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <FacetCheckbox checked={categoryFilter.has(key)} onClick={() => toggleInSet(categoryFilter, setCategoryFilter, key)} />
                  <Dot color={cat.color} />
                  <span style={{ fontSize: 13, color: COLORS.textMuted, flex: 1 }}>{cat.label}</span>
                  <span style={{ fontSize: 12, color: COLORS.textFaint }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.label, marginBottom: 10 }}>Assigné à</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {(agents ?? []).map((a) => {
              const count = reports.filter((r) => r.assignedTo === a.id).length;
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <FacetCheckbox checked={agentFilter.has(a.id)} onClick={() => toggleInSet(agentFilter, setAgentFilter, a.id)} />
                  <Avatar name={a.name} size={22} />
                  <span style={{ fontSize: 13, color: COLORS.textMuted, flex: 1 }}>{a.name}</span>
                  <span style={{ fontSize: 12, color: COLORS.textFaint }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ padding: "20px 26px 0", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800, margin: "0 0 3px", letterSpacing: "-0.01em" }}>Signalements</h1>
            <p style={{ fontSize: 13.5, color: COLORS.textMuted, margin: 0 }}>
              {displayed.length} résultat{displayed.length > 1 ? "s" : ""} sur {reports.length}
              {activeFilterLabels.length > 0 && <> · <span style={{ fontWeight: 600, color: COLORS.green }}>{activeFilterLabels.join(" + ")}</span></>}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ position: "relative", width: 260 }}>
              <Search size={15} color={COLORS.textFaint} style={{ position: "absolute", left: 13, top: 12 }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Réf., rue, mot-clé…"
                style={{ width: "100%", padding: "10px 14px 10px 36px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontFamily: "inherit" }} />
            </div>
            <div onClick={exportCsv} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 13px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, color: COLORS.textMuted, cursor: "pointer" }}>
              <Download size={14} /> Export
            </div>
          </div>
        </div>

        {(activeFilterLabels.length > 0 || true) && (
          <div style={{ padding: "14px 26px 0", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {activeFilterLabels.map((label) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 20, background: COLORS.railDark, color: "#fff", fontSize: 12.5, fontWeight: 600 }}>
                {label} <X size={12} style={{ cursor: "pointer" }} onClick={() => { setSavedView(null); setDelayFilter(new Set()); }} />
              </div>
            ))}
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.textMuted }}>Grouper par lieu</span>
            <ToggleSwitch checked={groupByPlace} onChange={setGroupByPlace} />
          </div>
        )}

        {selected.size > 0 && (
          <div style={{ padding: "14px 26px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: COLORS.railDark, borderRadius: 11, color: "#fff" }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: 4, background: COLORS.orangeLight, color: COLORS.railDark, fontSize: 12, fontWeight: 800 }}>{selected.size}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>sélectionné{selected.size > 1 ? "s" : ""}</span>
              <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.18)", margin: "0 4px" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, padding: "6px 11px", borderRadius: 8, background: "rgba(255,255,255,0.1)", cursor: "pointer" }}><UserPlus size={13} /> Assigner à…</div>
              <div onClick={() => handleBulkStatus("en_cours")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, padding: "6px 11px", borderRadius: 8, background: "rgba(255,255,255,0.1)", cursor: "pointer" }}><ArrowRightCircle size={13} /> Statut</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, padding: "6px 11px", borderRadius: 8, background: "rgba(255,255,255,0.1)", cursor: "pointer" }}><Flag size={13} /> Priorité</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, padding: "6px 11px", borderRadius: 8, background: "rgba(255,255,255,0.1)", cursor: "pointer" }}><Clock size={13} /> Replanifier</div>
              <span style={{ flex: 1 }} />
              {selected.size >= 2 && (
                <div onClick={handleMerge} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, padding: "6px 11px", borderRadius: 8, background: COLORS.orangeLight, color: COLORS.railDark, cursor: busy ? "default" : "pointer" }}>
                  <GitMerge size={13} /> {busy ? "…" : "Fusionner"}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ flex: 1, padding: "14px 26px 22px", overflow: "hidden" }}>
          <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "grid", gridTemplateColumns: "34px 96px minmax(0, 1fr) 130px 122px 108px 96px", alignItems: "center", gap: 12, padding: "11px 16px", background: "#FBFAF8", borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, border: "1.5px solid #C9C3B9", display: "block" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.label, letterSpacing: "0.07em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 }}>Délai <ChevronUp size={11} /></span>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.label, letterSpacing: "0.07em", textTransform: "uppercase" }}>Signalement</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.label, letterSpacing: "0.07em", textTransform: "uppercase" }}>Lieu</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.label, letterSpacing: "0.07em", textTransform: "uppercase" }}>Catégorie</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.label, letterSpacing: "0.07em", textTransform: "uppercase" }}>Statut</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.label, letterSpacing: "0.07em", textTransform: "uppercase" }}>Assigné</span>
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {paged.length === 0 && <div style={{ padding: 48, textAlign: "center", color: COLORS.textFaint, fontSize: 13 }}>Aucun signalement</div>}
              {paged.map((r) => {
                const cat = CATEGORIES[r.category];
                const st = STATUS[r.status];
                const group = duplicateGroups.get(r.id);
                const agent = (agents ?? []).find((a) => a.id === r.assignedTo);
                return (
                  <div key={r.id} onClick={() => onOpenDetail(r)}
                    style={{ display: "grid", gridTemplateColumns: "34px 96px minmax(0, 1fr) 130px 122px 108px 96px", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: `1px solid ${COLORS.borderLight}`, cursor: "pointer", background: r.delay?.isOverdue ? "#FFF8F6" : "transparent" }}>
                    <span onClick={(e) => { e.stopPropagation(); toggleSelect(r.id); }} style={{
                      width: 16, height: 16, borderRadius: 4, cursor: "pointer",
                      background: selected.has(r.id) ? COLORS.railDark : "transparent",
                      border: selected.has(r.id) ? "none" : "1.5px solid #C9C3B9",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{selected.has(r.id) && <Check size={11} color="#fff" />}</span>
                    <DelayBadge delay={r.delay} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.35, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.desc}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 3, fontSize: 11.5, color: COLORS.textFaint }}>
                        <span style={{ fontFamily: "monospace" }}>{r.id}</span>
                        <span style={{ fontWeight: 700, color: PRIORITY[r.priority]?.color }}>{PRIORITY[r.priority]?.label}</span>
                        {r.upvotes > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3 }}>+{r.upvotes}</span>}
                        {group && group.length > 1 && <span style={{ display: "flex", alignItems: "center", gap: 3, fontWeight: 700, color: COLORS.warning }}><Copy size={11} /> {group.length} groupés</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 12.5, color: COLORS.textMuted }}>{r.address}<br /><span style={{ color: COLORS.textFaint }}>{r.commune}</span></span>
                    <span style={{ fontSize: 12.5, color: COLORS.textMuted, display: "flex", alignItems: "center", gap: 6 }}><Dot color={cat?.color} /> {cat?.label}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: st?.color, background: st?.bg, padding: "3px 9px", borderRadius: 20, width: "fit-content" }}>{st?.label}</span>
                    {agent ? <Avatar name={agent.name} size={26} /> : <span style={{ fontSize: 12.5, color: COLORS.textFaint, fontStyle: "italic" }}>Personne</span>}
                  </div>
                );
              })}
            </div>
            <Pagination page={page} total={displayed.length} onChange={setPage} />
          </div>
        </div>
      </div>
    </div>
  );
}
