import { useCallback, useEffect, useState } from "react";
import { Shuffle, UserPlus, Building, ChevronRight, MapPin, Download } from "lucide-react";
import { apiClient } from "../api/client";
import { showError } from "../toast";
import { COLORS, STATUS, FONT_DISPLAY, colorForName } from "../theme";
import { Avatar, Pill, Skeleton, TableSkeleton, useMediaQuery, exportToCsv } from "../components/ui";
import { Modal, ConfirmModal, Pagination, PAGE_SIZE } from "../components/Modal";

const SERVICES = ["Voirie", "Électricité", "Hydraulique", "Environnement", "Éclairage public", "Autre"];

export function EquipesView({ token, agents, reports, onOpenDetail, onRefresh, isAdmin, isSuperAdmin }: any) {
  const isNarrow = useMediaQuery(700);
  const [tab, setTab] = useState<"agents" | "citoyens" | "demandes">(isAdmin ? "agents" : "demandes");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ phone: "", name: "", service: "", communeId: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [citizens, setCitizens] = useState<any[]>([]);
  const [citizensLoading, setCitizensLoading] = useState(false);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [communes, setCommunes] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [incidentsOf, setIncidentsOf] = useState<any>(null);
  const [reassign, setReassign] = useState<{ agent: any; incidents: any[]; toAgentId: string } | null>(null);
  const [reassigning, setReassigning] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [rejectingReq, setRejectingReq] = useState<any>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; confirmLabel?: string; danger?: boolean; run: () => void } | null>(null);
  const [citoyensPage, setCitoyensPage] = useState(1);

  useEffect(() => { setCitoyensPage(1); }, [search, tab]);

  useEffect(() => {
    apiClient(token).get("/communes").then(({ data }) => setCommunes(data ?? [])).catch(() => {});
  }, [token]);

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const { data } = await apiClient(token).get("/users/commune-requests");
      setRequests(data ?? []);
    } catch {
      showError("Impossible de charger les demandes de changement de commune");
    } finally {
      setRequestsLoading(false);
    }
  }, [token]);

  useEffect(() => { if (tab === "demandes") loadRequests(); }, [tab, loadRequests]);

  const reviewRequest = async (id: string, action: "APPROVE" | "REJECT", note?: string) => {
    setReviewing(id);
    try {
      await apiClient(token).patch(`/users/commune-requests/${id}`, { action, note });
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setRejectingReq(null);
      setRejectNote("");
    } catch {
      showError("Impossible de traiter cette demande");
    } finally {
      setReviewing(null);
    }
  };

  const loadCitizens = useCallback(async () => {
    setCitizensLoading(true);
    try {
      const { data } = await apiClient(token).get("/users/citizens");
      setCitizens(data ?? []);
    } catch {
      showError("Impossible de charger la liste des citoyens");
    } finally { setCitizensLoading(false); }
  }, [token]);

  useEffect(() => { if (tab === "citoyens") loadCitizens(); }, [tab, loadCitizens]);

  const promoteToAgent = (id: string, name: string) => {
    setConfirmAction({
      title: "Promouvoir en agent",
      message: `Promouvoir ${name} au rôle Agent ?`,
      confirmLabel: "Promouvoir",
      danger: false,
      run: async () => {
        setPromoting(id);
        try {
          await apiClient(token).patch(`/users/agents/${id}`, { role: "AGENT" });
          setCitizens((prev) => prev.filter((c) => c.id !== id));
          onRefresh();
        } catch {
          showError(`Impossible de promouvoir ${name} au rôle Agent`);
        } finally { setPromoting(null); }
      },
    });
  };

  const createAgent = async () => {
    if (!form.phone || !form.name) { setError("Téléphone et nom requis"); return; }
    if (isSuperAdmin && !form.communeId) { setError("Veuillez sélectionner une commune"); return; }
    setLoading(true); setError("");
    try {
      await apiClient(token).post("/users/agents", form);
      setForm({ phone: "", name: "", service: "", communeId: "" });
      setShowForm(false);
      onRefresh();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Erreur lors de la création");
    } finally { setLoading(false); }
  };

  const openEdit = (agent: any) => {
    setEditing(agent);
    setEditForm({ name: agent.name ?? "", phone: agent.phone ?? "", service: agent.service ?? "", communeId: agent.communeId ?? "", isActive: agent.isActive !== false });
    setEditError("");
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editForm.name || !editForm.phone) { setEditError("Nom et téléphone requis"); return; }
    setEditSaving(true); setEditError("");
    try {
      await apiClient(token).patch(`/users/agents/${editing.id}`, {
        name: editForm.name, phone: editForm.phone, service: editForm.service || undefined,
        communeId: editForm.communeId || undefined, isActive: editForm.isActive,
      });
      setEditing(null);
      onRefresh();
    } catch (e: any) {
      setEditError(e?.response?.data?.message ?? "Impossible de modifier cet agent");
    } finally { setEditSaving(false); }
  };

  const agentOpenIncidents = (id: string) =>
    (reports ?? []).filter((r: any) => r.assignedTo === id && r.status !== "resolu" && r.status !== "rejete");

  const askRemoveAgent = (agent: any) => {
    const open = agentOpenIncidents(agent.id);
    if (open.length > 0) { setReassign({ agent, incidents: open, toAgentId: "" }); return; }
    removeAgent(agent.id, agent.name);
  };

  const removeAgent = (id: string, name: string) => {
    setConfirmAction({
      title: "Supprimer l'agent",
      message: `Supprimer l'agent ${name} ?`,
      confirmLabel: "Supprimer",
      run: async () => {
        try {
          await apiClient(token).delete(`/users/agents/${id}`);
          onRefresh();
        } catch (e: any) {
          showError(e?.response?.data?.message ?? `Impossible de supprimer l'agent ${name}`);
        }
      },
    });
  };

  const confirmReassignAndRemove = async () => {
    if (!reassign || !reassign.toAgentId) return;
    setReassigning(true);
    try {
      await apiClient(token).post(`/users/agents/${reassign.agent.id}/reassign`, { toAgentId: reassign.toAgentId });
      await apiClient(token).delete(`/users/agents/${reassign.agent.id}`);
      setReassign(null);
      onRefresh();
    } catch (e: any) {
      showError(e?.response?.data?.message ?? `Impossible de réassigner et de supprimer ${reassign.agent.name}`);
    } finally { setReassigning(false); }
  };

  const filteredCitizens = search
    ? citizens.filter((c) => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search))
    : citizens;

  // ── Regroupement par service pour la vue Agents (design 2b) ──────────────
  const byService = new Map<string, any[]>();
  for (const a of agents as any[]) {
    const key = a.service || "Autre";
    if (!byService.has(key)) byService.set(key, []);
    byService.get(key)!.push(a);
  }
  const serviceGroups = [...byService.entries()].map(([service, list]) => {
    const withLoad = list.map((a) => ({
      ...a,
      load: agentOpenIncidents(a.id).length,
      overdue: (reports ?? []).filter((r: any) => r.assignedTo === a.id && r.delay?.isOverdue).length,
    }));
    const totalLoad = withLoad.reduce((s, a) => s + a.load, 0);
    const totalOverdue = withLoad.reduce((s, a) => s + a.overdue, 0);
    const maxLoad = Math.max(...withLoad.map((a) => a.load), 1);
    return { service, agents: withLoad.sort((a, b) => b.load - a.load), totalLoad, totalOverdue, maxLoad };
  });

  const busiest = [...serviceGroups].sort((a, b) => b.totalOverdue - a.totalOverdue)[0];
  const leastLoaded = busiest?.agents.find((a) => a.load === Math.min(...busiest.agents.map((x: any) => x.load)));
  const mostLoaded = busiest?.agents[0];
  const showRebalanceBanner = busiest && busiest.totalOverdue > 0 && mostLoaded && leastLoaded && mostLoaded.id !== leastLoaded.id;

  return (
    <div style={{ animation: "fadeIn 0.4s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800, margin: "0 0 3px", letterSpacing: "-0.01em" }}>Équipes</h1>
          <p style={{ fontSize: 13.5, color: COLORS.textMuted, margin: 0 }}>
            {tab === "agents" ? `${serviceGroups.length} service${serviceGroups.length !== 1 ? "s" : ""} · ${agents.length} agent${agents.length !== 1 ? "s" : ""} · ${reports.filter((r: any) => r.assignedTo && r.status !== "resolu" && r.status !== "rejete").length} dossiers en charge`
              : tab === "citoyens" ? `${citizens.length} citoyen${citizens.length !== 1 ? "s" : ""}`
              : `${requests.length} demande${requests.length !== 1 ? "s" : ""} en attente`}
          </p>
        </div>
        {tab === "agents" && (
          <button onClick={() => setShowForm((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", background: COLORS.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            <UserPlus size={14} /> Ajouter un agent
          </button>
        )}
        {tab === "citoyens" && (
          <button onClick={() => exportToCsv("citoyens.csv", filteredCitizens.map((c: any) => ({ nom: c.name, telephone: c.phone, commune: c.commune?.name ?? "" })))}
            disabled={filteredCitizens.length === 0} aria-label="Exporter les citoyens en CSV"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#fff", border: `1.5px solid ${COLORS.border}`, borderRadius: 10, fontSize: 12.5, fontWeight: 700, color: COLORS.textMuted, cursor: filteredCitizens.length === 0 ? "default" : "pointer", opacity: filteredCitizens.length === 0 ? 0.5 : 1 }}>
            <Download size={14} /> Exporter CSV
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 3, background: COLORS.borderLight, borderRadius: 10, padding: 3, marginBottom: 20, width: "fit-content" }}>
        {([
          ...(isAdmin ? ([["agents", "Agents"], ["citoyens", "Citoyens"]] as const) : []),
          ["demandes", "Demandes"],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key as any); setShowForm(false); setSearch(""); }}
            style={{ padding: "8px 15px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6,
              background: tab === key ? "#fff" : "transparent", color: tab === key ? COLORS.railDark : COLORS.textMuted }}>
            {label}
            {key === "demandes" && requests.length > 0 && (
              <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: COLORS.danger, color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{requests.length}</span>
            )}
          </button>
        ))}
      </div>

      {showForm && (
        <div style={{ background: "#fff", border: `1.5px solid ${COLORS.border}`, borderRadius: 14, padding: 22, marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Nouvel agent</div>
          <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
            <Field label="Téléphone" value={form.phone} onChange={(v) => setForm((s) => ({ ...s, phone: v }))} placeholder="+22890000000" />
            <Field label="Nom complet" value={form.name} onChange={(v) => setForm((s) => ({ ...s, name: v }))} placeholder="Ex: Kossi Ablé" />
            <SelectField label="Service" value={form.service} onChange={(v) => setForm((s) => ({ ...s, service: v }))} options={SERVICES} />
            {isSuperAdmin && (
              <SelectField label="Commune" value={form.communeId} onChange={(v) => setForm((s) => ({ ...s, communeId: v }))} options={communes.map((c: any) => [c.id, c.name] as const)} />
            )}
          </div>
          {error && <div style={{ fontSize: 12, color: COLORS.danger, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={createAgent} disabled={loading} style={{ padding: "10px 22px", background: COLORS.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Création..." : "Créer l'agent"}
            </button>
            <button onClick={() => { setShowForm(false); setError(""); }} style={{ padding: "10px 16px", background: COLORS.bg, color: COLORS.textMuted, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {tab === "agents" && (
        agents.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: 48, textAlign: "center", color: COLORS.textFaint, fontSize: 13 }}>
            Aucun agent pour cette commune. Ajoutez-en un.
          </div>
        ) : (
          <>
            {showRebalanceBanner && (
              <div style={{ background: COLORS.warningBgSoft, border: `1px solid ${COLORS.warningBorder}`, borderRadius: 13, padding: "15px 18px", display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <Shuffle size={18} color={COLORS.warning} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.warning }}>Charge déséquilibrée au service {busiest!.service}</div>
                  <div style={{ fontSize: 13, color: COLORS.warning, marginTop: 2 }}>
                    {mostLoaded.name} porte {mostLoaded.load} dossier{mostLoaded.load !== 1 ? "s" : ""} dont {mostLoaded.overdue} hors délai, {leastLoaded.name} en a {leastLoaded.load}.
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: `repeat(${isNarrow ? 1 : Math.min(3, serviceGroups.length)}, minmax(0, 1fr))`, gap: 16 }}>
              {serviceGroups.map(({ service, agents: list, totalLoad, totalOverdue }) => {
                const color = colorForName(service);
                return (
                  <div key={service} style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <div style={{ padding: "16px 18px", borderBottom: `1px solid ${COLORS.borderLight}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, flex: 1 }}>{service}</span>
                        {totalOverdue > 0 ? (
                          <Pill color={COLORS.dangerText} bg={COLORS.dangerBg}>{totalOverdue} hors délai</Pill>
                        ) : (
                          <Pill color={COLORS.success} bg={COLORS.greenLight}>À jour</Pill>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 20 }}>
                        <div>
                          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{totalLoad}</div>
                          <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 }}>en charge</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: "8px 18px 14px", display: "flex", flexDirection: "column" }}>
                      {list.map((agent: any, i: number) => (
                        <div key={agent.id} onClick={() => openEdit(agent)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 0", borderBottom: i < list.length - 1 ? "1px solid #F4F1EC" : "none", cursor: "pointer" }}>
                          <Avatar name={agent.name} size={34} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{agent.name}</span>
                              {agent.role === "ADMIN" && <span style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.info, background: COLORS.infoBg, padding: "1px 6px", borderRadius: 4 }}>Admin</span>}
                              {agent.isActive === false && <span style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.textFaint, background: COLORS.borderLight, padding: "1px 6px", borderRadius: 4 }}>Inactif</span>}
                            </div>
                            <div style={{ height: 5, borderRadius: 3, background: COLORS.borderLight, marginTop: 6, overflow: "hidden" }}>
                              <div style={{ width: `${Math.min(100, (agent.load / Math.max(1, ...list.map((x: any) => x.load))) * 100)}%`, height: "100%", background: agent.overdue > 0 ? COLORS.danger : agent.load > 0 ? COLORS.orange : COLORS.successText }} />
                            </div>
                            <div style={{ fontSize: 11.5, color: agent.overdue > 0 ? COLORS.dangerText : COLORS.textMuted, fontWeight: agent.overdue > 0 ? 600 : 400, marginTop: 4 }}>
                              {agent.load} dossier{agent.load !== 1 ? "s" : ""}{agent.overdue > 0 ? ` · ${agent.overdue} hors délai` : agent.load === 0 ? " · disponible" : " · à l'heure"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )
      )}

      {tab === "citoyens" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par nom ou téléphone…"
              style={{ width: "100%", maxWidth: 400, padding: "10px 16px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontSize: 13, fontFamily: "inherit", background: "#fff", boxSizing: "border-box" }} />
          </div>
          {citizensLoading ? (
            <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}><TableSkeleton rows={6} cols={5} /></div>
          ) : filteredCitizens.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: 48, textAlign: "center", color: COLORS.textFaint, fontSize: 13 }}>
              {search ? "Aucun citoyen ne correspond à la recherche." : "Aucun citoyen enregistré."}
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}><div style={{ minWidth: 640 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 80px 80px 140px", gap: 12, padding: "10px 20px", background: "#FBFAF8", borderBottom: `1px solid ${COLORS.border}`, fontSize: 10.5, fontWeight: 700, color: COLORS.textFaint, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <span>Citoyen</span><span>Téléphone</span><span style={{ textAlign: "center" }}>Signalements</span><span style={{ textAlign: "center" }}>Soutiens</span><span></span>
                </div>
                {filteredCitizens.slice((citoyensPage - 1) * PAGE_SIZE, citoyensPage * PAGE_SIZE).map((c: any, idx: number, arr: any[]) => (
                  <div key={c.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 80px 80px 140px", gap: 12, padding: "14px 20px", alignItems: "center", borderBottom: idx < arr.length - 1 ? `1px solid ${COLORS.borderLight}` : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <Avatar name={c.name} size={36} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name ?? "—"}</div>
                        <div style={{ fontSize: 10, color: c.isVerified ? COLORS.success : COLORS.textFaint, fontWeight: 600 }}>{c.isVerified ? "Vérifié" : "Non vérifié"}{c.commune?.name ? ` · ${c.commune.name}` : ""}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.textMuted }}>{c.phone}</div>
                    <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: COLORS.info }}>{c._count?.reportedIncidents ?? 0}</div>
                    <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: COLORS.orange }}>{c._count?.upvotes ?? 0}</div>
                    <button onClick={() => promoteToAgent(c.id, c.name ?? c.phone)} disabled={promoting === c.id}
                      style={{ padding: "7px 14px", borderRadius: 10, border: "none", cursor: promoting === c.id ? "not-allowed" : "pointer", background: promoting === c.id ? COLORS.bg : COLORS.greenLight, color: promoting === c.id ? COLORS.textFaint : COLORS.green, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                      {promoting === c.id ? "Promotion…" : "Promouvoir Agent"}
                    </button>
                  </div>
                ))}
              </div></div>
              <Pagination page={citoyensPage} total={filteredCitizens.length} onChange={setCitoyensPage} />
            </div>
          )}
        </div>
      )}

      {tab === "demandes" && (
        requestsLoading ? (
          <div style={{ display: "grid", gap: 12 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
                <Skeleton width={44} height={44} radius={22} />
                <div style={{ flex: 1 }}><Skeleton width="40%" height={14} style={{ marginBottom: 8 }} /><Skeleton width="60%" height={12} /></div>
                <Skeleton width={90} height={32} radius={10} />
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: 48, textAlign: "center", color: COLORS.textFaint, fontSize: 13 }}>
            Aucune demande de changement de commune en attente.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {requests.map((r: any) => (
              <div key={r.id} style={{ background: "#fff", borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <Avatar name={r.user?.name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{r.user?.name ?? "—"}</div>
                    <div style={{ fontSize: 11, color: COLORS.textFaint }}>{r.user?.phone}</div>
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                    <span>{r.fromCommune?.name ?? "—"}</span><ChevronRight size={13} color={COLORS.textFaint} /><span style={{ color: COLORS.green }}>{r.toCommune?.name}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: COLORS.textFaint, marginBottom: 14 }}>
                  Demandé le {new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => reviewRequest(r.id, "APPROVE")} disabled={reviewing === r.id}
                    style={{ flex: 1, padding: 9, background: COLORS.greenLight, color: COLORS.green, border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: reviewing === r.id ? 0.6 : 1 }}>
                    {reviewing === r.id ? "Traitement..." : "Approuver"}
                  </button>
                  <button onClick={() => { setRejectingReq(r); setRejectNote(""); }} disabled={reviewing === r.id}
                    style={{ flex: 1, padding: 9, background: COLORS.dangerBg, color: COLORS.dangerText, border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: reviewing === r.id ? 0.6 : 1 }}>
                    Rejeter
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {rejectingReq && (
        <Modal title={`Rejeter la demande de ${rejectingReq.user?.name ?? "ce citoyen"}`} onClose={() => setRejectingReq(null)}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.textFaint, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Motif (optionnel)</label>
            <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3} placeholder="Expliquez pourquoi cette demande est refusée…"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontSize: 13, fontFamily: "inherit", background: "#FBFAF8", resize: "vertical", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => reviewRequest(rejectingReq.id, "REJECT", rejectNote.trim() || undefined)} disabled={reviewing === rejectingReq.id}
              style={{ padding: "10px 24px", background: COLORS.danger, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: reviewing === rejectingReq.id ? 0.7 : 1 }}>
              {reviewing === rejectingReq.id ? "Traitement..." : "Confirmer le rejet"}
            </button>
            <button onClick={() => setRejectingReq(null)} disabled={reviewing === rejectingReq.id} style={{ padding: "10px 16px", background: COLORS.bg, color: COLORS.textMuted, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Annuler</button>
          </div>
        </Modal>
      )}

      {editing && editForm && (
        <Modal title={`Modifier ${editing.name}`} onClose={() => setEditing(null)}>
          <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            <Field label="Nom complet" value={editForm.name} onChange={(v) => setEditForm((s: any) => ({ ...s, name: v }))} />
            <Field label="Téléphone" value={editForm.phone} onChange={(v) => setEditForm((s: any) => ({ ...s, phone: v }))} />
            <SelectField label="Service" value={editForm.service} onChange={(v) => setEditForm((s: any) => ({ ...s, service: v }))} options={SERVICES} />
            <SelectField label="Commune" value={editForm.communeId} onChange={(v) => setEditForm((s: any) => ({ ...s, communeId: v }))} options={communes.map((c: any) => [c.id, c.name] as const)} />
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12.5, color: COLORS.textMuted, fontWeight: 600 }}>
              <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm((s: any) => ({ ...s, isActive: e.target.checked }))} />
              Compte actif
            </label>
          </div>
          {editError && <div style={{ fontSize: 12, color: COLORS.danger, marginBottom: 12 }}>{editError}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={saveEdit} disabled={editSaving} style={{ padding: "10px 24px", background: COLORS.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: editSaving ? 0.7 : 1 }}>
              {editSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button onClick={() => setEditing(null)} style={{ padding: "10px 16px", background: COLORS.bg, color: COLORS.textMuted, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Annuler</button>
            {editing.role !== "ADMIN" && (
              <button onClick={() => { setEditing(null); askRemoveAgent(editing); }} style={{ marginLeft: "auto", padding: "10px 16px", background: COLORS.dangerBg, color: COLORS.dangerText, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Retirer
              </button>
            )}
          </div>
        </Modal>
      )}

      {incidentsOf && (
        <Modal title={`Incidents — ${incidentsOf.name}`} onClose={() => setIncidentsOf(null)}>
          {(() => {
            const list = (reports ?? []).filter((r: any) => r.assignedTo === incidentsOf.id);
            if (list.length === 0) return <div style={{ padding: 24, textAlign: "center", color: COLORS.textFaint, fontSize: 13 }}>Aucun incident assigné à cet agent.</div>;
            return (
              <div style={{ maxHeight: 420, overflowY: "auto", display: "grid", gap: 8 }}>
                {list.map((r: any) => {
                  const st = STATUS[r.status];
                  return (
                    <div key={r.id} onClick={() => { setIncidentsOf(null); onOpenDetail?.(r); }} style={{ padding: "12px 14px", borderRadius: 12, border: `1px solid ${COLORS.border}`, cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700 }}>{r.id}</span>
                        <Pill color={st?.color ?? COLORS.textFaint} bg={st?.bg ?? COLORS.borderLight} small>{st?.label ?? r.status}</Pill>
                      </div>
                      <p style={{ fontSize: 12, color: COLORS.textMuted, margin: "0 0 4px", lineHeight: 1.4 }}>{r.desc}</p>
                      <span style={{ fontSize: 11, color: COLORS.textFaint, display: "flex", alignItems: "center", gap: 3 }}><MapPin size={10} /> {r.commune}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Modal>
      )}

      {reassign && (
        <Modal title="Réassigner avant suppression" onClose={() => !reassigning && setReassign(null)}>
          <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5, marginBottom: 16 }}>
            <strong>{reassign.agent.name}</strong> a {reassign.incidents.length} incident{reassign.incidents.length !== 1 ? "s" : ""} en cours.
            Choisissez un autre agent à qui les réassigner avant de le retirer de l'équipe.
          </p>
          <SelectField label="Réassigner à" value={reassign.toAgentId} onChange={(v) => setReassign((s) => s && ({ ...s, toAgentId: v }))}
            options={agents.filter((a: any) => a.id !== reassign.agent.id).map((a: any) => [a.id, a.name] as const)} />
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={confirmReassignAndRemove} disabled={reassigning || !reassign.toAgentId}
              style={{ padding: "10px 24px", background: COLORS.danger, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: (reassigning || !reassign.toAgentId) ? 0.6 : 1 }}>
              {reassigning ? "Traitement..." : "Réassigner et supprimer"}
            </button>
            <button onClick={() => setReassign(null)} disabled={reassigning} style={{ padding: "10px 16px", background: COLORS.bg, color: COLORS.textMuted, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Annuler</button>
          </div>
        </Modal>
      )}

      {confirmAction && (
        <ConfirmModal title={confirmAction.title} message={confirmAction.message} confirmLabel={confirmAction.confirmLabel} danger={confirmAction.danger} onConfirm={confirmAction.run} onClose={() => setConfirmAction(null)} />
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.textFaint, textTransform: "uppercase", display: "block", marginBottom: 4 }}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontSize: 13, fontFamily: "inherit", background: "#FBFAF8", boxSizing: "border-box" }} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: (string | readonly [string, string])[] }) {
  return (
    <div>
      <label style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.textFaint, textTransform: "uppercase", display: "block", marginBottom: 4 }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontSize: 13, fontFamily: "inherit", background: "#FBFAF8", cursor: "pointer", boxSizing: "border-box" }}>
        <option value="">— Choisir —</option>
        {options.map((o) => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o as string} value={o as string}>{o as string}</option>)}
      </select>
    </div>
  );
}
