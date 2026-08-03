import { useEffect, useState } from "react";
import { FileText, Lightbulb } from "lucide-react";
import { COLORS, CATEGORIES, FONT_DISPLAY } from "../theme";
import { formatDelay } from "../api/sla";
import { fetchDelayStats, type DelayStats } from "../api/stats";

export function StatsView({ token, me }: { token: string; me: any }) {
  const [stats, setStats] = useState<DelayStats | null>(null);
  const [period, setPeriod] = useState<"mois" | "trimestre" | "annee">("mois");

  useEffect(() => { fetchDelayStats(token).then(setStats).catch(() => {}); }, [token]);

  const month = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div style={{ animation: "fadeIn 0.4s ease", display: "flex", flexDirection: "column", gap: 18, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800, margin: "0 0 3px", letterSpacing: "-0.01em" }}>Performance du service</h1>
          <p style={{ fontSize: 13.5, color: COLORS.textMuted, margin: 0 }}>{me?.commune?.name ?? "Toutes communes"} · {month}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", gap: 2, padding: 3, background: COLORS.borderLight, borderRadius: 10 }}>
            {(["mois", "trimestre", "annee"] as const).map((p) => (
              <span key={p} onClick={() => setPeriod(p)} style={{
                fontSize: 12.5, fontWeight: period === p ? 700 : 600, color: period === p ? COLORS.railDark : COLORS.textMuted,
                background: period === p ? "#fff" : "transparent", padding: "7px 13px", borderRadius: 8, cursor: "pointer", textTransform: "capitalize",
              }}>{p === "annee" ? "Année" : p}</span>
            ))}
          </div>
          <div onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, background: "#fff", fontSize: 13, fontWeight: 600, color: COLORS.textMuted, cursor: "pointer" }}>
            <FileText size={14} /> Rapport PDF
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <div style={{ background: COLORS.railDark, borderRadius: 13, padding: 18, color: "#fff" }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 10 }}>Respect du délai cible</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{stats?.onTimeRate ?? "—"}%</span>
          </div>
          <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.15)", marginTop: 14, position: "relative", overflow: "hidden" }}>
            <div style={{ width: `${stats?.onTimeRate ?? 0}%`, height: "100%", background: `linear-gradient(90deg, ${COLORS.orangeLight}, #7DC98D)` }} />
          </div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)", marginTop: 8 }}>Objectif 85 %</div>
        </div>
        <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 13, padding: 18 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: COLORS.label, marginBottom: 10 }}>Délai médian</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{stats ? formatDelay(stats.medianResolutionHours) : "—"}</div>
          <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 14 }}>Du signalement à la clôture avec preuve</div>
        </div>
        <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 13, padding: 18 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: COLORS.label, marginBottom: 10 }}>Premier contact</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{stats ? formatDelay(stats.medianFirstContactHours) : "—"}</div>
          <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 14 }}>Avant qu'un agent prenne le dossier</div>
        </div>
        <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 13, padding: 18 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: COLORS.label, marginBottom: 10 }}>Clôtures avec preuve</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{stats?.afterPhotoRate ?? "—"}%</div>
          <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 14 }}>Dossiers clos avec une photo après</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 16, flex: 1, overflow: "hidden" }}>
        <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, flex: 1 }}>Délai de résolution, semaine par semaine</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: COLORS.textMuted }}><span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS.green }} /> Dans les délais</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: COLORS.textMuted }}><span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS.danger }} /> Hors délai</span>
          </div>
          <div style={{ fontSize: 12.5, color: COLORS.textMuted, marginBottom: 20 }}>Part des dossiers clos dans les délais, sur les 5 dernières semaines.</div>
          {!stats || stats.weeklyTrend.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textFaint, fontSize: 13 }}>Pas encore assez de clôtures pour tracer une tendance</div>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "stretch", gap: 26, padding: "0 8px" }}>
              {stats.weeklyTrend.map(({ week, onTimeRate, total }) => (
                <div key={week} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ width: "100%", maxWidth: 62, flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                    <div style={{ height: `${100 - onTimeRate}%`, background: COLORS.danger, borderRadius: "6px 6px 0 0", display: "flex", alignItems: "center", justifyContent: "center", minHeight: onTimeRate < 100 ? 18 : 0 }}>
                      {onTimeRate < 100 && <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff" }}>{100 - onTimeRate}%</span>}
                    </div>
                    <div style={{ height: `${onTimeRate}%`, background: COLORS.green }} />
                  </div>
                  <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600 }}>{week.replace(/^\d+-/, "")} · {total}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }}>
          <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Délai médian par catégorie</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {Object.entries(stats?.byCategory ?? {}).map(([cat, hours]) => {
                const max = Math.max(...Object.values(stats?.byCategory ?? { x: 1 }), 1);
                const pct = Math.min(100, (hours / max) * 100);
                const color = hours > 96 ? COLORS.danger : hours > 48 ? COLORS.orange : COLORS.successText;
                return (
                  <div key={cat}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{CATEGORIES[cat]?.label ?? cat}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color }}>{formatDelay(hours)}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: COLORS.borderLight, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: color }} />
                    </div>
                  </div>
                );
              })}
              {Object.keys(stats?.byCategory ?? {}).length === 0 && <div style={{ fontSize: 12.5, color: COLORS.textFaint }}>Pas encore de dossier clos</div>}
            </div>
          </div>

          <div style={{ background: COLORS.warningBgSoft, border: `1px solid ${COLORS.warningBorder}`, borderRadius: 14, padding: "16px 18px", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Lightbulb size={15} color={COLORS.warning} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.warning }}>À surveiller</span>
            </div>
            <div style={{ fontSize: 13, color: COLORS.warning, lineHeight: 1.55 }}>
              {stats && stats.onTimeRate < 85
                ? `Le taux de respect du délai (${stats.onTimeRate} %) est sous l'objectif de 85 %. Vérifiez la charge par agent dans l'onglet Équipes.`
                : "Le service est dans les objectifs. Continuez à clôturer avec une photo après pour garder une preuve fiable."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
