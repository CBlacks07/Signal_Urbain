import { X } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "../theme";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.15s ease" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(20,38,27,0.45)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", background: COLORS.card, borderRadius: 18, padding: 28, width: 440, maxWidth: "90vw", boxShadow: "0 24px 60px rgba(0,0,0,0.18)", animation: "cardIn 0.25s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, color: COLORS.text }}>{title}</div>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 32, height: 32, borderRadius: 8, background: COLORS.bg, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={14} color={COLORS.textMuted} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({ title, message, confirmLabel = "Confirmer", danger = true, onConfirm, onClose }: {
  title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6, margin: "0 0 20px" }}>{message}</p>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => { onConfirm(); onClose(); }}
          style={{ flex: 1, padding: 12, background: danger ? COLORS.danger : COLORS.green, color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {confirmLabel}
        </button>
        <button onClick={onClose}
          style={{ flex: 1, padding: 12, background: COLORS.bg, color: COLORS.textMuted, border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          Annuler
        </button>
      </div>
    </Modal>
  );
}

export const PAGE_SIZE = 20;

export function Pagination({ page, total, pageSize = PAGE_SIZE, onChange }: { page: number; total: number; pageSize?: number; onChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
      <span style={{ fontSize: 12.5, color: COLORS.textMuted }}>{total} sur {total} affichés</span>
      <span style={{ flex: 1 }} />
      <button onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Page précédente"
        style={{ padding: "7px 13px", borderRadius: 9, border: `1.5px solid ${COLORS.border}`, background: "#fff", fontSize: 12.5, fontWeight: 700, color: page <= 1 ? COLORS.textFaint : COLORS.textMuted, cursor: page <= 1 ? "default" : "pointer" }}>
        Précédent
      </button>
      <span style={{ fontSize: 12.5, color: COLORS.textMuted }}>Page {page} / {totalPages}</span>
      <button onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Page suivante"
        style={{ padding: "7px 13px", borderRadius: 9, border: `1.5px solid ${COLORS.border}`, background: "#fff", fontSize: 12.5, fontWeight: 700, color: page >= totalPages ? COLORS.textFaint : COLORS.green, cursor: page >= totalPages ? "default" : "pointer" }}>
        Suivant
      </button>
    </div>
  );
}
