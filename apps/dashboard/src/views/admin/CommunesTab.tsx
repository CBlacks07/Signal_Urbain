import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { apiClient } from "../../api/client";
import { COLORS } from "../../theme";
import { useMediaQuery, Skeleton } from "../../components/ui";
import { Modal, ConfirmModal } from "../../components/Modal";

export function CommunesTab({ token }: { token: string }) {
  const isNarrow = useMediaQuery(700);
  const [communes, setCommunes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", prefecture: "", contactEmail: "" });
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null);

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

  const remove = async (id: string) => {
    try { await apiClient(token).delete(`/admin/communes/${id}`); load(); }
    catch { setErr("Impossible de supprimer (des utilisateurs sont liés)"); }
  };

  const openEdit = (commune: any) => {
    setEditing(commune);
    setEditForm({ name: commune.name ?? "", prefecture: commune.prefecture ?? "", contactEmail: commune.contactEmail ?? "", contactPhone: commune.contactPhone ?? "" });
    setEditError("");
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editForm.name || !editForm.prefecture) { setEditError("Nom et préfecture requis"); return; }
    setEditSaving(true); setEditError("");
    try {
      await apiClient(token).patch(`/admin/communes/${editing.id}`, {
        name: editForm.name, prefecture: editForm.prefecture,
        contactEmail: editForm.contactEmail || undefined, contactPhone: editForm.contactPhone || undefined,
      });
      setEditing(null); load();
    } catch (e: any) { setEditError(e?.response?.data?.message ?? "Impossible de modifier cette commune"); }
    finally { setEditSaving(false); }
  };

  if (loading) return (
    <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: "hidden" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ padding: "14px 18px", borderBottom: `1px solid ${COLORS.borderLight}` }}><Skeleton width="60%" height={14} /></div>
      ))}
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "minmax(0, 1fr) 380px", gap: 18, height: "100%" }}>
      <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 96px 108px 116px 92px", alignItems: "center", gap: 14, padding: "12px 18px", background: "#FBFAF8", borderBottom: `1px solid ${COLORS.border}` }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.label, letterSpacing: "0.07em", textTransform: "uppercase" }}>Commune</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.label, letterSpacing: "0.07em", textTransform: "uppercase" }}>Agents</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.label, letterSpacing: "0.07em", textTransform: "uppercase" }}>Incidents</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.label, letterSpacing: "0.07em", textTransform: "uppercase" }}>État</span>
          <span />
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {communes.map((c) => {
            const agentCount = c._count?.users ?? 0;
            const state = agentCount === 0 ? "Pilote" : "Active";
            const stateColor = state === "Active" ? COLORS.success : COLORS.textMuted;
            const stateBg = state === "Active" ? COLORS.greenLight : COLORS.borderLight;
            return (
              <div key={c.id} onClick={() => openEdit(c)} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 96px 108px 116px 92px", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: `1px solid ${COLORS.borderLight}`, cursor: "pointer" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 2 }}>{c.prefecture}{c.contactEmail ? ` · ${c.contactEmail}` : ""}</div>
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{agentCount}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{c._count?.incidents ?? 0}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: stateColor, background: stateBg, padding: "3px 9px", borderRadius: 20, width: "fit-content" }}>{state}</span>
                <span
                  onClick={(e) => { e.stopPropagation(); setConfirmRemove({ id: c.id, name: c.name }); }}
                  style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.dangerText, cursor: "pointer" }}
                >Supprimer</span>
              </div>
            );
          })}
          {communes.length === 0 && <div style={{ padding: 40, textAlign: "center", color: COLORS.textFaint, fontSize: 13 }}>Aucune commune raccordée</div>}
        </div>
        <div style={{ padding: "14px 18px", borderTop: `1px solid ${COLORS.borderLight}` }}>
          <div onClick={() => setShowForm((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 10, background: COLORS.green, color: "#fff", fontSize: 13, fontWeight: 700, width: "fit-content", cursor: "pointer" }}>
            <Plus size={14} /> Raccorder une commune
          </div>
        </div>
      </div>

      {showForm && (
        <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, alignSelf: "flex-start" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Nouvelle commune</div>
          {[["name", "Nom *"], ["prefecture", "Préfecture *"], ["contactEmail", "Email contact"]].map(([key, label]) => (
            <div key={key} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.textFaint, textTransform: "uppercase", display: "block", marginBottom: 4 }}>{label}</label>
              <input value={(form as any)[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${COLORS.border}`, borderRadius: 10, fontSize: 13, boxSizing: "border-box" }} />
            </div>
          ))}
          {err && <p style={{ color: COLORS.danger, fontSize: 12, margin: "0 0 8px" }}>{err}</p>}
          <button onClick={create} style={{ padding: "10px 22px", background: COLORS.green, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>Créer la commune</button>
        </div>
      )}

      {editing && editForm && (
        <Modal title={`Modifier ${editing.name}`} onClose={() => setEditing(null)}>
          <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            {[["name", "Nom *"], ["prefecture", "Préfecture *"], ["contactEmail", "Email contact"], ["contactPhone", "Téléphone contact"]].map(([key, label]) => (
              <div key={key}>
                <label style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.textFaint, textTransform: "uppercase", display: "block", marginBottom: 4 }}>{label}</label>
                <input value={editForm[key]} onChange={(e) => setEditForm((v: any) => ({ ...v, [key]: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, fontSize: 13, boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
          {editError && <div style={{ fontSize: 12, color: COLORS.danger, marginBottom: 12 }}>{editError}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={saveEdit} disabled={editSaving} style={{ padding: "10px 24px", background: COLORS.green, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: editSaving ? 0.7 : 1 }}>
              {editSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button onClick={() => setEditing(null)} style={{ padding: "10px 16px", background: COLORS.bg, color: COLORS.textMuted, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Annuler</button>
          </div>
        </Modal>
      )}

      {confirmRemove && (
        <ConfirmModal title="Supprimer la commune" message={`Supprimer la commune "${confirmRemove.name}" ?`} confirmLabel="Supprimer" onConfirm={() => remove(confirmRemove.id)} onClose={() => setConfirmRemove(null)} />
      )}
    </div>
  );
}
