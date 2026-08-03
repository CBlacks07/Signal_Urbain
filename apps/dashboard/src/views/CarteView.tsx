import { useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { COLORS, CATEGORIES, STATUS, FONT_DISPLAY } from "../theme";

const LOME_CENTER: [number, number] = [6.1375, 1.2123];

export function CarteView({ reports, onOpenDetail }: any) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const visible = useMemo(() => reports.filter((r: any) => {
    if (!r.lat || !r.lng) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterCategory !== "all" && r.category !== filterCategory) return false;
    return true;
  }), [reports, filterStatus, filterCategory]);

  const sel: React.CSSProperties = {
    padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`,
    fontSize: 12, fontFamily: "inherit", background: "#fff", cursor: "pointer", color: COLORS.textMuted,
  };

  return (
    <div style={{ animation: "fadeIn 0.4s ease" }}>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.01em" }}>Carte des incidents</h1>
          <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>{visible.length} incident{visible.length !== 1 ? "s" : ""} géolocalisé{visible.length !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={sel}>
            <option value="all">Tous les statuts</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={sel}>
            <option value="all">Toutes catégories</option>
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${COLORS.border}`, height: 560 }}>
        <MapContainer center={LOME_CENTER} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
          {visible.map((r: any) => {
            const st = STATUS[r.status];
            const cat = CATEGORIES[r.category];
            return (
              <CircleMarker key={r._id} center={[r.lat, r.lng]} radius={r.upvotes > 5 ? 14 : r.upvotes > 2 ? 11 : 8}
                pathOptions={{ fillColor: cat?.color ?? "#888", fillOpacity: 0.85, color: st?.color ?? "#555", weight: 2 }}>
                <Popup>
                  <div style={{ minWidth: 200, fontFamily: "sans-serif" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.green, fontFamily: "monospace", marginBottom: 4 }}>{r.id}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>{r.desc}</div>
                    <div style={{ fontSize: 11, color: COLORS.textFaint, marginBottom: 8 }}>{r.address}</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, color: st?.color, background: st?.bg }}>{st?.label}</span>
                      <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, color: cat?.color, background: `${cat?.color}18` }}>{cat?.label}</span>
                    </div>
                    <button onClick={() => onOpenDetail(r)} style={{ width: "100%", padding: 7, background: COLORS.green, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      Voir le détail
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
        {Object.entries(CATEGORIES).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: COLORS.textMuted }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: v.color, display: "inline-block" }} />
            {v.label}
          </div>
        ))}
      </div>
    </div>
  );
}
