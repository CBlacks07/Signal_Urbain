import { useEffect, useState } from "react";
import { COLORS, FONT_DISPLAY, colorForName } from "../theme";

export function useMediaQuery(maxWidth: number) {
  const [matches, setMatches] = useState(() => window.innerWidth <= maxWidth);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [maxWidth]);
  return matches;
}

export function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (val: any) => `"${String(val ?? "").replace(/"/g, '""')}"`;
  const csv = [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ].join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// Bloc gris animé (placeholder de chargement). L'animation est définie dans index.css (@keyframes pulse).
export function Skeleton({ width = "100%", height = 14, radius = 6, style }: { width?: number | string; height?: number; radius?: number; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      style={{ width, height, borderRadius: radius, background: "#ece9e4", animation: "pulse 1.4s ease-in-out infinite", ...style }}
    />
  );
}

// Lignes de tableau fantômes, reproduisant la grille des incidents pendant le chargement.
export function TableSkeleton({ rows = 8, cols = 7 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Chargement des données">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: "flex", gap: 12, padding: "13px 16px", borderBottom: "1px solid #EFEBE4", alignItems: "center" }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} width={c === 1 ? "30%" : `${Math.max(40, 90 - c * 8)}px`} height={12} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Pill({ color, bg, children, small }: { color: string; bg: string; children: React.ReactNode; small?: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: small ? "3px 8px" : "3px 9px",
      borderRadius: small ? 5 : 20,
      fontSize: small ? 11 : 11.5,
      fontWeight: 700, color, background: bg,
      letterSpacing: "0.01em", whiteSpace: "nowrap", width: "fit-content",
    }}>{children}</span>
  );
}

export function initialsOf(name?: string | null): string {
  if (!name) return "??";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function Avatar({ name, size = 32, color }: { name?: string | null; size?: number; color?: string }) {
  const initials = initialsOf(name);
  const bg = color ?? colorForName(name ?? "?");
  return (
    <div style={{
      width: size, height: size, minWidth: size, borderRadius: "50%",
      background: bg, display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, color: "#fff", letterSpacing: "0.02em", flexShrink: 0,
    }}>{initials}</div>
  );
}

export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <span style={{ display: "inline-block", width: size, height: size, minWidth: size, borderRadius: "50%", background: color }} />;
}

export function StatTile({ label, value, valueColor, sub, subColor }: {
  label: string; value: React.ReactNode; valueColor?: string; sub?: React.ReactNode; subColor?: string;
}) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 13, padding: 18 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: COLORS.label, marginBottom: 10 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 34, fontWeight: 800, lineHeight: 1, color: valueColor ?? COLORS.text }}>{value}</span>
      </div>
      {sub && <div style={{ fontSize: 12.5, color: subColor ?? COLORS.textMuted, marginTop: 10 }}>{sub}</div>}
    </div>
  );
}

export function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      style={{
        width: 34, height: 19, borderRadius: 10, border: "none", cursor: "pointer", padding: 2,
        background: checked ? COLORS.green : "#D8D3CA",
        display: "flex", alignItems: "center", justifyContent: checked ? "flex-end" : "flex-start",
      }}
    >
      <span style={{ width: 15, height: 15, borderRadius: "50%", background: "#fff", display: "block" }} />
    </button>
  );
}
