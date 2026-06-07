import { useEffect, useState } from "react";

type Toast = { id: number; message: string; kind: "error" | "success" };

let nextId = 1;
let toasts: Toast[] = [];
const listeners = new Set<(toasts: Toast[]) => void>();

function emit() {
  listeners.forEach(l => l(toasts));
}

function push(message: string, kind: Toast["kind"]) {
  const toast = { id: nextId++, message, kind };
  toasts = [...toasts, toast];
  emit();
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== toast.id);
    emit();
  }, 5000);
}

export const showError = (message: string) => push(message, "error");
export const showSuccess = (message: string) => push(message, "success");

export function ToastHost() {
  const [list, setList] = useState<Toast[]>(toasts);

  useEffect(() => {
    listeners.add(setList);
    return () => { listeners.delete(setList); };
  }, []);

  if (!list.length) return null;

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, display: "flex", flexDirection: "column", gap: 8, zIndex: 9999 }}>
      {list.map(t => (
        <div key={t.id} style={{
          padding: "12px 16px",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          color: "#fff",
          background: t.kind === "error" ? "#C0392B" : "#2E7D32",
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          maxWidth: 360,
          animation: "fadeIn 0.2s ease",
        }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
