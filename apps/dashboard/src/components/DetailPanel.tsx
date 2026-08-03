import { useEffect, useRef, useState } from "react";
import {
  X, MapPin, Calendar, ArrowUp, GitMerge, Camera, CheckCircle2,
  UserPlus, Clock, Send,
} from "lucide-react";
import { apiClient } from "../api/client";
import { updateIncident, uploadIncidentPhoto, unmergeIncident } from "../api/incidents";
import { showError } from "../toast";
import { COLORS, CATEGORIES, PRIORITY, STATUS, FONT_DISPLAY } from "../theme";
import { formatDelay } from "../api/sla";
import { Avatar, useMediaQuery } from "./ui";
import { DelayBadge } from "./DelayBadge";

const STEPS = ["signale", "assigne", "en_cours", "resolu"] as const;
const STEP_LABELS: Record<string, string> = { signale: "Signalé", assigne: "Assigné", en_cours: "En cours", resolu: "Résolu" };

export function DetailPanel({ report, agents, onClose, onUpdateStatus, token, onRefresh }: any) {
  const isNarrow = useMediaQuery(640);
  const [full, setFull] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [assignTo, setAssignTo] = useState(report.assignedTo ?? "");
  const [busy, setBusy] = useState(false);
  const [justifying, setJustifying] = useState(false);
  const [justifyText, setJustifyText] = useState("");
  const afterInputRef = useRef<HTMLInputElement>(null);

  const cat = CATEGORIES[report.category];
  const pr = PRIORITY[report.priority];
  const st = STATUS[report.status];

  const load = () => {
    apiClient(token).get(`/incidents/${report._id}`).then(({ data }) => {
      setFull(data);
      setComments(data.comments ?? []);
    }).catch(() => showError("Impossible de charger le détail de l'incident"));
  };
  useEffect(load, [report._id, token]);

  const sendComment = async () => {
    if (!newComment.trim()) return;
    setSendingComment(true);
    try {
      await apiClient(token).post(`/incidents/${report._id}/comments`, { content: newComment.trim() });
      setNewComment("");
      const { data } = await apiClient(token).get(`/incidents/${report._id}/comments`);
      setComments(data ?? []);
    } catch { showError("Impossible d'envoyer le commentaire"); }
    finally { setSendingComment(false); }
  };

  const assign = async (agentId: string) => {
    setBusy(true);
    try {
      await updateIncident(token, report._id, { assignedTo: agentId || null, status: report.status === "signale" ? "ASSIGNE" : undefined });
      onRefresh?.();
      load();
    } catch { showError("Impossible d'assigner cet incident"); }
    finally { setBusy(false); }
  };

  const setStatus = async (status: string) => {
    setBusy(true);
    try {
      await updateIncident(token, report._id, { status: status.toUpperCase() });
      onUpdateStatus?.(report._id, status);
      onRefresh?.();
      load();
    } catch { showError("Impossible de mettre à jour le statut"); }
    finally { setBusy(false); }
  };

  const closeWithProof = () => afterInputRef.current?.click();

  const onAfterPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      await uploadIncidentPhoto(token, report._id, file, "APRES");
      await updateIncident(token, report._id, { status: "RESOLU" });
      onUpdateStatus?.(report._id, "resolu");
      onRefresh?.();
      load();
    } catch (err: any) {
      showError(err?.response?.data?.message ?? "Impossible de clore ce dossier");
    } finally { setBusy(false); }
  };

  const justifyDelay = async () => {
    if (!justifyText.trim()) { setJustifying(false); return; }
    setBusy(true);
    try {
      await updateIncident(token, report._id, { blockedReason: justifyText.trim() });
      onRefresh?.();
      load();
      setJustifying(false);
      setJustifyText("");
    } catch { showError("Impossible d'enregistrer le motif de retard"); }
    finally { setBusy(false); }
  };

  const clearBlock = async () => {
    setBusy(true);
    try { await updateIncident(token, report._id, { blockedReason: null }); onRefresh?.(); load(); }
    catch { showError("Impossible de lever le blocage"); }
    finally { setBusy(false); }
  };

  const unmergeAll = async () => {
    setBusy(true);
    try { await unmergeIncident(token, report._id); onRefresh?.(); load(); }
    catch { showError("Impossible de défusionner ces signalements"); }
    finally { setBusy(false); }
  };

  const photos = full?.photos ?? report.photos ?? [];
  const beforePhotos = photos.filter((p: any) => p.kind !== "APRES");
  const afterPhotos = photos.filter((p: any) => p.kind === "APRES");
  const currentStepIdx = STEPS.indexOf(report.status as any);
  const isBlocked = !!report.blockedReason;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(20,38,27,0.4)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", width: isNarrow ? "100vw" : 620, maxWidth: "100vw", background: "#fff", height: "100vh", display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(0,0,0,0.12)", animation: "slideInRight 0.3s cubic-bezier(0.4,0,0.2,1)" }}>

        {/* Bandeau de retard */}
        <div style={{ padding: "20px 24px", background: report.delay?.isOverdue ? COLORS.dangerBg : "#FBFAF8", borderBottom: `1px solid ${report.delay?.isOverdue ? "#F3C9C4" : COLORS.borderLight}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            {report.delay?.isOverdue ? (
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", background: COLORS.danger, padding: "3px 9px", borderRadius: 6 }}>
                Hors délai depuis {formatDelay(report.delay.hoursRemaining)}
              </span>
            ) : (
              <DelayBadge delay={report.delay} />
            )}
            <span style={{ fontSize: 12.5, fontWeight: 700, color: pr?.color }}>{pr?.label}</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 13, color: COLORS.textFaint, fontFamily: "monospace" }}>{report.id}</span>
            <button onClick={onClose} aria-label="Fermer" style={{ width: 32, height: 32, borderRadius: 9, background: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={15} color={COLORS.textMuted} />
            </button>
          </div>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, margin: "0 0 8px", lineHeight: 1.3, letterSpacing: "-0.01em" }}>{report.desc}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13, color: COLORS.textMuted, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><MapPin size={13} /> {report.address}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Calendar size={13} /> Signalé le {new Date(report.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</span>
            {report.upvotes > 0 && <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 700, color: COLORS.warning }}><ArrowUp size={13} /> {report.upvotes} soutiens</span>}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Avancement */}
          <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.borderLight}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.label, flex: 1 }}>Avancement</span>
              {report.delay && (
                <span style={{ fontSize: 12.5, fontWeight: 700, color: report.delay.isOverdue ? COLORS.dangerText : COLORS.textMuted }}>
                  Échéance {report.delay.isOverdue ? "dépassée" : ""} : {new Date(report.delay.dueAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} · {new Date(report.delay.dueAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              {STEPS.map((step, i) => {
                const done = i < currentStepIdx || (i === currentStepIdx && step === "resolu");
                const current = i === currentStepIdx && step !== "resolu";
                return (
                  <div key={step} style={{ flex: i === STEPS.length - 1 ? "0 0 96px" : 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        background: done ? COLORS.green : current && isBlocked ? COLORS.dangerBg : current ? "#fff" : COLORS.borderLight,
                        border: current && isBlocked ? `2px solid ${COLORS.danger}` : current ? `2px solid ${COLORS.green}` : "none",
                      }}>
                        {done
                          ? <CheckCircle2 size={13} color="#fff" />
                          : current
                          ? <span style={{ width: 7, height: 7, borderRadius: "50%", background: isBlocked ? COLORS.danger : COLORS.green }} />
                          : null}
                      </span>
                      {i < STEPS.length - 1 && <span style={{ flex: 1, height: 3, background: i < currentStepIdx ? COLORS.green : current && isBlocked ? COLORS.danger : COLORS.borderLight }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: current && isBlocked ? COLORS.dangerText : COLORS.text }}>
                        {current && isBlocked ? "En cours — bloqué" : STEP_LABELS[step]}
                      </div>
                      <div style={{ fontSize: 11.5, color: current && isBlocked ? COLORS.dangerText : COLORS.textFaint }}>
                        {current && isBlocked ? report.blockedReason : "—"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Doublons fusionnés */}
          {full?.duplicates?.length > 0 && (
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.borderLight}`, background: COLORS.warningBgSoft }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <GitMerge size={15} color={COLORS.warning} />
                <span style={{ fontSize: 13.5, fontWeight: 700, flex: 1 }}>{full.duplicates.length} signalement{full.duplicates.length > 1 ? "s" : ""} fusionné{full.duplicates.length > 1 ? "s" : ""} dans ce dossier</span>
                <span onClick={unmergeAll} style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.warning, cursor: "pointer" }}>Défusionner</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {full.duplicates.map((d: any) => (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#fff", border: `1px solid ${COLORS.warningBorder}`, borderRadius: 10 }}>
                    <span style={{ fontSize: 12, color: COLORS.textFaint, fontFamily: "monospace" }}>{d.refCode}</span>
                    <span style={{ fontSize: 13, flex: 1 }}>« {d.description} »</span>
                    <span style={{ fontSize: 12, color: COLORS.textMuted }}>{d.reporter?.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description + photos */}
          <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.borderLight}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.label, marginBottom: 10 }}>Description du citoyen</div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, margin: "0 0 16px" }}>{report.desc}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.label, marginBottom: 8 }}>Constat — avant</div>
                {beforePhotos.length > 0 ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {beforePhotos.map((p: any) => (
                      <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
                        <img src={p.thumbnailUrl || p.url} alt="" style={{ width: 68, height: 68, objectFit: "cover", borderRadius: 8 }} />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div style={{ height: 90, borderRadius: 11, background: COLORS.border, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600 }}>Aucune photo</span>
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: afterPhotos.length ? COLORS.success : COLORS.dangerText, marginBottom: 8 }}>Preuve — après</div>
                {afterPhotos.length > 0 ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {afterPhotos.map((p: any) => (
                      <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
                        <img src={p.thumbnailUrl || p.url} alt="" style={{ width: 68, height: 68, objectFit: "cover", borderRadius: 8 }} />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div onClick={closeWithProof} style={{ height: 90, borderRadius: 11, background: COLORS.warningBgSoft, border: `1.5px dashed #D8CBB4`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}>
                    <Camera size={18} color={COLORS.warning} />
                    <span style={{ fontSize: 12, color: COLORS.warning, fontWeight: 700 }}>Ajouter une photo</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fil du dossier */}
          <div style={{ padding: "20px 24px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.label, marginBottom: 12 }}>Fil du dossier</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
              {comments.length === 0 && <div style={{ fontSize: 13, color: COLORS.textFaint }}>Aucun message</div>}
              {comments.map((c) => (
                <div key={c.id} style={{ display: "flex", gap: 10 }}>
                  <Avatar name={c.user?.name} size={28} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{c.user?.name ?? "Inconnu"}</span>
                      <span style={{ fontSize: 11.5, color: COLORS.textFaint }}>{new Date(c.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</span>
                    </div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.5, marginTop: 2 }}>{c.content}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendComment()}
                placeholder="Ajouter un message au dossier…"
                style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontSize: 13, fontFamily: "inherit" }} />
              <button onClick={sendComment} disabled={sendingComment || !newComment.trim()} style={{ padding: "10px 14px", background: COLORS.green, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", opacity: !newComment.trim() ? 0.5 : 1 }}>
                <Send size={14} />
              </button>
            </div>
          </div>

          {/* Assignation */}
          {agents?.length > 0 && (
            <div id="da-assign-focus" style={{ padding: "0 24px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.label, marginBottom: 8 }}>Assigné à</div>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontSize: 13, fontFamily: "inherit" }}>
                  <option value="">— Non assigné —</option>
                  {agents.map((a: any) => <option key={a.id} value={a.id}>{a.name}{a.service ? ` (${a.service})` : ""}</option>)}
                </select>
                <button onClick={() => assign(assignTo)} disabled={busy} style={{ padding: "10px 16px", background: COLORS.greenLight, color: COLORS.green, border: "none", borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Assigner</button>
              </div>
            </div>
          )}

          {justifying && (
            <div style={{ padding: "0 24px 20px" }}>
              <textarea autoFocus value={justifyText} onChange={(e) => setJustifyText(e.target.value)} rows={2} placeholder="Motif du retard (ex : attente CEET)…"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical", marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={justifyDelay} style={{ padding: "8px 16px", background: COLORS.warning, color: "#fff", border: "none", borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Enregistrer</button>
                <button onClick={() => setJustifying(false)} style={{ padding: "8px 16px", background: COLORS.bg, color: COLORS.textMuted, border: "none", borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${COLORS.borderLight}`, background: "#FBFAF8", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input ref={afterInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onAfterPhotoSelected} />
          <div onClick={() => !busy && (afterPhotos.length > 0 ? setStatus("resolu") : closeWithProof())}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 16px", borderRadius: 10, background: COLORS.green, color: "#fff", fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
            <CheckCircle2 size={15} /> Clore avec preuve
          </div>
          <div onClick={() => document.getElementById("da-assign-focus")?.scrollIntoView()} style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 16px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, background: "#fff", fontSize: 13.5, fontWeight: 600, color: COLORS.textMuted, cursor: "pointer" }}>
            <UserPlus size={15} /> Réassigner
          </div>
          {isBlocked ? (
            <div onClick={clearBlock} style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 16px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, background: "#fff", fontSize: 13.5, fontWeight: 600, color: COLORS.textMuted, cursor: "pointer" }}>
              <Clock size={15} /> Lever le blocage
            </div>
          ) : (
            <div onClick={() => setJustifying(true)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 16px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, background: "#fff", fontSize: 13.5, fontWeight: 600, color: COLORS.textMuted, cursor: "pointer" }}>
              <Clock size={15} /> Justifier le retard
            </div>
          )}
          <span style={{ flex: 1 }} />
          <div onClick={() => !busy && setStatus("rejete")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 14px", borderRadius: 10, border: `1.5px solid #F3C9C4`, background: "#fff", fontSize: 13.5, fontWeight: 700, color: COLORS.dangerText, cursor: "pointer" }}>
            Rejeter
          </div>
        </div>
      </div>
    </div>
  );
}
