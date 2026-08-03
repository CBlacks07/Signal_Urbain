import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { apiClient } from "../api/client";
import { showError } from "../toast";
import { COLORS } from "../theme";
import { Avatar } from "./ui";

const NOTIF_COLORS: Record<string, string> = {
  STATUS_UPDATE: "#2B7A9B",
  NEW_COMMENT: "#5C5C8A",
  UPVOTE: COLORS.orange,
  SYSTEM: "#6B6B6B",
};

/** Cloche de notifications seule (utilisée dans l'en-tête de chaque écran). */
export function NotificationBell({ token }: { token: string }) {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [marking, setMarking] = useState(false);

  const loadCount = useCallback(async () => {
    try {
      const { data } = await apiClient(token).get("/notifications/unread-count");
      setUnread(typeof data === "number" ? data : data?.count ?? 0);
    } catch {
      // Échec silencieux : ne pas spammer l'utilisateur pour un polling en arrière-plan
    }
  }, [token]);

  const loadNotifs = async () => {
    try {
      const { data } = await apiClient(token).get("/notifications?limit=10");
      setNotifs(data?.data ?? data ?? []);
    } catch {
      showError("Impossible de charger les notifications");
    }
  };

  const markAll = async () => {
    setMarking(true);
    try {
      await apiClient(token).patch("/notifications/read-all");
      setUnread(0);
      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      showError("Impossible de marquer les notifications comme lues");
    } finally {
      setMarking(false);
    }
  };

  useEffect(() => { loadCount(); const t = setInterval(loadCount, 30000); return () => clearInterval(t); }, [loadCount]);

  const handleOpen = () => { setOpen((o) => !o); if (!open) loadNotifs(); };

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "à l'instant";
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} h`;
    return `${Math.floor(h / 24)} j`;
  };

  return (
      <div style={{ position: "relative" }}>
        <button onClick={handleOpen} aria-label={`Notifications${unread > 0 ? ` (${unread} non lues)` : ""}`} style={{
          position: "relative", width: 40, height: 40, borderRadius: 11,
          background: "#fff", border: `1.5px solid ${COLORS.border}`,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Bell size={17} color={COLORS.textMuted} />
          {unread > 0 && (
            <span style={{
              position: "absolute", top: -5, right: -5, minWidth: 17, height: 17,
              background: COLORS.orange, borderRadius: 9, fontSize: 10, fontWeight: 700,
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 4px", border: "2px solid #fff",
            }}>{unread > 99 ? "99+" : unread}</span>
          )}
        </button>

        {open && (
          <div style={{
            position: "absolute", top: 48, right: 0, width: 360, background: "#fff",
            borderRadius: 16, border: `1px solid ${COLORS.border}`, boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
            zIndex: 200, overflow: "hidden",
          }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>
                Notifications {unread > 0 && <span style={{ fontSize: 11, color: COLORS.orange, fontWeight: 800 }}>({unread} non lues)</span>}
              </div>
              {unread > 0 && (
                <button onClick={markAll} disabled={marking} style={{ fontSize: 11, color: COLORS.green, fontWeight: 700, border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, background: COLORS.greenLight }}>
                  {marking ? "..." : "Tout lire"}
                </button>
              )}
            </div>
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {notifs.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: COLORS.textFaint, fontSize: 13 }}>Aucune notification</div>
              ) : notifs.map((n) => (
                <div key={n.id} style={{
                  padding: "12px 16px", borderBottom: `1px solid ${COLORS.borderLight}`,
                  background: n.isRead ? "transparent" : "#FBFAF8",
                  display: "flex", gap: 10, alignItems: "flex-start",
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: n.isRead ? "transparent" : COLORS.orange, marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: NOTIF_COLORS[n.type] ?? COLORS.textMuted }}>{n.title}</span>
                      <span style={{ fontSize: 10, color: COLORS.textFaint, flexShrink: 0, marginLeft: 8 }}>{timeAgo(n.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {open && <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 199 }} />}
      </div>
  );
}

/** Bloc avatar + nom (utilisé à côté de la cloche, ou seul dans une en-tête compacte). */
export function UserBadge({ me }: { me: any }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px 6px 6px", background: "#fff", borderRadius: 11, border: `1.5px solid ${COLORS.border}` }}>
      <Avatar name={me?.name} size={28} color={COLORS.green} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, lineHeight: 1.2 }}>{me?.name ?? "..."}</div>
        <div style={{ fontSize: 10, color: COLORS.textFaint }}>{me?.commune?.name ?? "Signal Urbain"}</div>
      </div>
    </div>
  );
}

export function TopBar({ token, me }: { token: string; me: any }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <NotificationBell token={token} />
      <UserBadge me={me} />
    </div>
  );
}
