import { useCallback, useEffect, useState } from "react";
import { ToastHost, showError } from "./toast";
import { COLORS } from "./theme";
import { apiClient, decodeJwt, mapIncident } from "./api/client";
import { getToken, saveToken, clearToken } from "./api/token";
import { fetchIncidents } from "./api/incidents";
import { Sidebar } from "./components/Sidebar";
import { DetailPanel } from "./components/DetailPanel";
import { Skeleton, TableSkeleton } from "./components/ui";
import { LoginView } from "./views/LoginView";
import { QueueView } from "./views/QueueView";
import { IncidentsView } from "./views/IncidentsView";
import { EquipesView } from "./views/EquipesView";
import { StatsView } from "./views/StatsView";
import { CarteView } from "./views/CarteView";
import { ParametresView } from "./views/ParametresView";
import { AdministrationView } from "./views/AdministrationView";

export default function MairieDashboard() {
  const [page, setPage] = useState("queue");
  const [collapsed, setCollapsed] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [detailReport, setDetailReport] = useState<any>(null);
  const [token, setToken] = useState<string | null>(getToken);
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState<any>(null);

  const userRole = token ? decodeJwt(token)?.role ?? null : null;
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isAdmin = userRole === "ADMIN" || isSuperAdmin;
  const isAgent = userRole === "AGENT";

  const fetchMe = useCallback(async (tok: string) => {
    try {
      const { data } = await apiClient(tok).get("/users/me");
      setMe(data);
    } catch { showError("Impossible de charger votre profil"); }
  }, []);

  const fetchAgents = useCallback(async (tok: string) => {
    try {
      const { data } = await apiClient(tok).get("/users/agents");
      setAgents(data);
    } catch { showError("Impossible de charger la liste des agents"); }
  }, []);

  const loadIncidents = useCallback(async (tok: string) => {
    setLoading(true);
    try {
      const { items } = await fetchIncidents(tok);
      setReports(items);
    } catch { showError("Impossible de charger les incidents"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (token) {
      loadIncidents(token);
      fetchMe(token);
      if (isAdmin || isAgent) fetchAgents(token);
    }
  }, [token, loadIncidents, fetchAgents, fetchMe, isAdmin, isAgent]);

  const handleLogin = (tok: string) => { setToken(tok); fetchMe(tok); };
  const handleLogout = () => { clearToken(); setToken(null); setReports([]); setAgents([]); setMe(null); };

  const refreshIncidents = useCallback(() => { if (token) loadIncidents(token); }, [token, loadIncidents]);

  const updateStatus = async (incidentId: string, newStatus: string) => {
    setReports((prev) => prev.map((r) => (r._id === incidentId ? { ...r, status: newStatus } : r)));
  };

  if (!token) return <><LoginView onLogin={handleLogin} /><ToastHost /></>;
  if (!userRole || userRole === "CITIZEN") { handleLogout(); return <><LoginView onLogin={handleLogin} /><ToastHost /></>; }

  return (
    <div style={{ display: "flex", height: "100vh", background: COLORS.bg, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <ToastHost />
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cardIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        * { box-sizing: border-box; }
      `}</style>

      <Sidebar active={page} onNav={setPage} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} onLogout={handleLogout} isSuperAdmin={isSuperAdmin} me={me} />

      <div style={{ flex: 1, minWidth: 0, height: "100vh", overflow: "hidden", padding: "28px 32px", display: "flex", flexDirection: "column" }}>
        {loading ? (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <Skeleton width={220} height={28} radius={8} style={{ marginBottom: 8 }} />
            <Skeleton width={140} height={14} radius={6} style={{ marginBottom: 24 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: 20 }}>
                  <Skeleton width={40} height={40} radius={12} style={{ marginBottom: 14 }} />
                  <Skeleton width="60%" height={22} style={{ marginBottom: 8 }} />
                  <Skeleton width="40%" height={12} />
                </div>
              ))}
            </div>
            <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
              <TableSkeleton rows={8} />
            </div>
          </div>
        ) : (
          <>
            {page === "queue" && <QueueView reports={reports} agents={agents} me={me} token={token} onOpenDetail={setDetailReport} onRefresh={refreshIncidents} />}
            {page === "incidents" && <IncidentsView reports={reports} agents={agents} token={token} onOpenDetail={setDetailReport} onRefresh={refreshIncidents} />}
            {page === "equipes" && ((isAdmin || isAgent)
              ? <EquipesView token={token} agents={agents} reports={reports} onOpenDetail={setDetailReport} onRefresh={() => fetchAgents(token!)} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
              : <div style={{ padding: 48, textAlign: "center", color: COLORS.textFaint, fontSize: 14 }}>Accès réservé aux administrateurs et agents.</div>
            )}
            {page === "stats" && <StatsView token={token!} me={me} />}
            {page === "carte" && <CarteView reports={reports} onOpenDetail={setDetailReport} />}
            {page === "parametres" && <ParametresView token={token} onLogout={handleLogout} />}
            {page === "administration" && (isSuperAdmin
              ? <AdministrationView token={token} />
              : <div style={{ padding: 48, textAlign: "center", color: COLORS.textFaint, fontSize: 14 }}>Accès réservé au super administrateur.</div>
            )}
          </>
        )}
      </div>

      {detailReport && (
        <DetailPanel report={detailReport} agents={agents} onClose={() => setDetailReport(null)} onUpdateStatus={updateStatus} token={token} onRefresh={refreshIncidents} />
      )}
    </div>
  );
}
