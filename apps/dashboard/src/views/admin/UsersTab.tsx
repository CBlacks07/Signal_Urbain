import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { apiClient } from "../../api/client";
import { showError } from "../../toast";
import { COLORS } from "../../theme";
import { exportToCsv, TableSkeleton, Avatar } from "../../components/ui";
import { ConfirmModal, Pagination, PAGE_SIZE } from "../../components/Modal";

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  CITIZEN: { label: "Citoyen", color: COLORS.info, bg: COLORS.infoBg },
  AGENT: { label: "Agent", color: COLORS.success, bg: COLORS.greenLight },
  ADMIN: { label: "Admin", color: COLORS.orange, bg: "#FFF3E0" },
  SUPER_ADMIN: { label: "Super Admin", color: COLORS.danger, bg: COLORS.dangerBg },
};

export function UsersTab({ token }: { token: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [communes, setCommunes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null);
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const params = roleFilter !== "all" ? `?role=${roleFilter}` : "";
      const { data } = await apiClient(token).get(`/admin/users${params}`);
      setUsers(data);
    } catch { showError("Erreur de chargement des utilisateurs"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [roleFilter]);
  useEffect(() => { setPage(1); }, [roleFilter]);
  useEffect(() => { apiClient(token).get("/admin/communes").then(({ data }) => setCommunes(data ?? [])).catch(() => {}); }, [token]);

  const changeRole = async (id: string, newRole: string) => {
    try { await apiClient(token).patch(`/admin/users/${id}/role`, { role: newRole }); load(); }
    catch { showError("Impossible de changer le rôle"); }
  };
  const changeCommune = async (id: string, communeId: string) => {
    try { await apiClient(token).patch(`/admin/users/${id}/commune`, { communeId: communeId || null }); load(); }
    catch { showError("Impossible de changer la commune"); }
  };
  const remove = async (id: string) => {
    try { await apiClient(token).delete(`/admin/users/${id}`); load(); }
    catch { showError("Impossible de supprimer cet utilisateur"); }
  };

  const ROLES = ["all", "CITIZEN", "AGENT", "ADMIN", "SUPER_ADMIN"];
  const exportCsv = () => exportToCsv("utilisateurs.csv", users.map((u) => ({ nom: u.name, telephone: u.phone, role: ROLE_LABELS[u.role]?.label ?? u.role, commune: u.commune?.name ?? "" })));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 14 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div onClick={exportCsv} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#fff", border: `1.5px solid ${COLORS.border}`, borderRadius: 20, fontSize: 12, fontWeight: 700, color: COLORS.textMuted, cursor: "pointer" }}>
          <Download size={13} /> Exporter CSV
        </div>
        {ROLES.map((r) => (
          <span key={r} onClick={() => setRoleFilter(r)} style={{ padding: "7px 14px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 700, background: roleFilter === r ? COLORS.railDark : COLORS.borderLight, color: roleFilter === r ? "#fff" : COLORS.textMuted }}>
            {r === "all" ? "Tous" : ROLE_LABELS[r]?.label ?? r}
          </span>
        ))}
      </div>

      {loading ? (
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}><TableSkeleton rows={8} cols={4} /></div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${COLORS.border}`, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((u, i, arr) => {
              const rl = ROLE_LABELS[u.role] ?? ROLE_LABELS.CITIZEN;
              return (
                <div key={u.id} style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: i < arr.length - 1 ? `1px solid ${COLORS.borderLight}` : "none", gap: 14 }}>
                  <Avatar name={u.name} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: COLORS.textFaint }}>{u.phone} {u.commune?.name ? `· ${u.commune.name}` : ""}</div>
                  </div>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: rl.color, background: rl.bg }}>{rl.label}</span>
                  <select value={u.communeId ?? ""} onChange={(e) => changeCommune(u.id, e.target.value)}
                    style={{ padding: "5px 8px", border: `1.5px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12, cursor: "pointer", maxWidth: 150 }}>
                    <option value="">— Sans commune —</option>
                    {communes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} style={{ padding: "5px 8px", border: `1.5px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
                    {Object.keys(ROLE_LABELS).map((r) => <option key={r} value={r}>{ROLE_LABELS[r].label}</option>)}
                  </select>
                  {u.role !== "SUPER_ADMIN" && (
                    <span onClick={() => setConfirmRemove({ id: u.id, name: u.name })} style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.dangerText, cursor: "pointer" }}>Suppr.</span>
                  )}
                </div>
              );
            })}
          </div>
          <Pagination page={page} total={users.length} onChange={setPage} />
        </div>
      )}

      {confirmRemove && (
        <ConfirmModal title="Supprimer l'utilisateur" message={`Supprimer "${confirmRemove.name}" ?`} confirmLabel="Supprimer" onConfirm={() => remove(confirmRemove.id)} onClose={() => setConfirmRemove(null)} />
      )}
    </div>
  );
}
