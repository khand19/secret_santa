// ─── Annonces Belote / Coinche ────────────────────────────────────────────────

export const BELOTE_ANNONCES = [
  { label: "Tierce", pts: 20 }, { label: "Quarte", pts: 50 }, { label: "Quinte", pts: 100 },
  { label: "Carré", pts: 100 }, { label: "Carré de 9", pts: 150 }, { label: "Carré de J", pts: 200 },
];

export interface AnnoncesState { total: number; belote: boolean; }

export function AnnoncesBlock({ label, value, onChange }: { label: string; value: AnnoncesState; onChange: (v: AnnoncesState) => void }) {
  return (
    <div style={{ background: "#f9fafb", borderRadius: 10, padding: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#374151", marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {BELOTE_ANNONCES.map((a) => (
          <button key={a.label} onClick={() => onChange({ ...value, total: value.total + a.pts })}
            style={{ padding: "4px 10px", borderRadius: 20, border: "1px solid #d1d5db", background: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
            {a.label} +{a.pts}
          </button>
        ))}
        <button onClick={() => onChange({ ...value, total: Math.max(0, value.total - 20) })}
          style={{ padding: "4px 10px", borderRadius: 20, border: "1px solid #fca5a5", background: "#fff", fontSize: 12, cursor: "pointer", color: "#dc2626", fontWeight: 600 }}>
          -20
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#4f46e5" }}>{value.total} pts</span>
        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={value.belote} onChange={(e) => onChange({ ...value, belote: e.target.checked })} />
          Belote (+20)
        </label>
        {value.total > 0 && <button onClick={() => onChange({ total: 0, belote: false })} style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 11, color: "#9ca3af", cursor: "pointer" }}>reset</button>}
      </div>
    </div>
  );
}

export function calcAnnonces(nous: AnnoncesState, eux: AnnoncesState): { nous: number; eux: number } {
  let n = nous.belote ? 20 : 0;
  let e = eux.belote ? 20 : 0;
  if (nous.total > eux.total) { n += nous.total + eux.total; }
  else if (eux.total > nous.total) { e += nous.total + eux.total; }
  // égalité : personne ne prend les annonces (sauf belote)
  return { nous: n, eux: e };
}
