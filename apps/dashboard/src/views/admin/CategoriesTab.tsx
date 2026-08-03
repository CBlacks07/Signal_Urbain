import { COLORS, CATEGORIES, FONT_DISPLAY } from "../../theme";

export function CategoriesTab() {
  return (
    <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 20px", maxWidth: 480 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Catégories de signalement</div>
      <div style={{ fontSize: 12.5, color: COLORS.textMuted, marginBottom: 16 }}>
        Catégories communes à toutes les communes du réseau. Fixées au niveau de la plateforme.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#FBFAF8", borderRadius: 10 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: cat.color }} />
            <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{cat.label}</span>
            <span style={{ fontSize: 11.5, color: COLORS.textFaint, fontFamily: "monospace" }}>{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
