import { useState, useEffect } from "react";
import { usersApi, User } from "../api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type GameType = "belote" | "coinche" | "tarot" | "papayoo";

interface GamePlayer { id: number; name: string; avatar: string | null; }

interface GameResult {
  id: string; game: GameType; date: string;
  players: GamePlayer[]; scores: number[]; lowWins: boolean;
}

const STORAGE_KEY = "games_history_v1";
function loadHistory(): GameResult[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveResult(r: GameResult) {
  const h = loadHistory(); h.unshift(r);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(h.slice(0, 200)));
}

// ─── UI Primitives ────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, ...style }}>{children}</div>;
}

function Btn({ children, onClick, variant = "primary", disabled, style }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost"; disabled?: boolean; style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = { border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, transition: "opacity .15s" };
  const v = { primary: { background: "#4f46e5", color: "#fff" }, secondary: { background: "#f3f4f6", color: "#374151" }, danger: { background: "#fee2e2", color: "#991b1b" }, ghost: { background: "transparent", color: "#6b7280", border: "1px solid #e5e7eb" } as React.CSSProperties };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...v[variant], ...style }}>{children}</button>;
}

function Input({ value, onChange, placeholder, type = "text", style }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; style?: React.CSSProperties;
}) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "7px 12px", fontSize: 14, boxSizing: "border-box", width: "100%", ...style }} />;
}

function Avatar({ player, size = 32 }: { player: GamePlayer; size?: number }) {
  if (player.avatar) return <img src={player.avatar} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return <div style={{ width: size, height: size, borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * .4, color: "#fff", fontWeight: 700, flexShrink: 0 }}>{player.name[0]?.toUpperCase()}</div>;
}

function PlayerPicker({ users, selected, onChange, min, max, exclude = [] }: {
  users: User[]; selected: GamePlayer[]; onChange: (p: GamePlayer[]) => void; min: number; max: number; exclude?: number[];
}) {
  function toggle(u: User) {
    const name = u.nickname || `${u.first_name} ${u.last_name}`;
    const p: GamePlayer = { id: u.id, name, avatar: u.profile_image };
    const already = selected.find((x) => x.id === u.id);
    if (already) onChange(selected.filter((x) => x.id !== u.id));
    else if (selected.length < max) onChange([...selected, p]);
  }
  return (
    <div>
      <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 8 }}>Joueurs ({selected.length}/{max} · min {min})</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {users.filter((u) => !exclude.includes(u.id)).map((u) => {
          const name = u.nickname || `${u.first_name} ${u.last_name}`;
          const isSel = selected.some((p) => p.id === u.id);
          const isOff = !isSel && selected.length >= max;
          return (
            <button key={u.id} onClick={() => toggle(u)} disabled={isOff} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 10, border: "none", cursor: isOff ? "not-allowed" : "pointer", background: isSel ? "#eef2ff" : "#f9fafb", opacity: isOff ? 0.4 : 1, textAlign: "left" }}>
              {u.profile_image ? <img src={u.profile_image} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 32, height: 32, borderRadius: "50%", background: isSel ? "#4f46e5" : "#d1d5db", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 700 }}>{name[0]}</div>}
              <span style={{ fontWeight: 600, fontSize: 14, color: isSel ? "#4f46e5" : "#374151" }}>{name}</span>
              {isSel && <span style={{ marginLeft: "auto", color: "#4f46e5" }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Scoreboard({ players, scores, lowWins = false }: { players: GamePlayer[]; scores: number[]; lowWins?: boolean }) {
  const sorted = [...players.map((p, i) => ({ p, s: scores[i] }))].sort((a, b) => lowWins ? a.s - b.s : b.s - a.s);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {sorted.map(({ p, s }, rank) => (
        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: rank === 0 ? "#fefce8" : "#f9fafb", border: `1px solid ${rank === 0 ? "#fde68a" : "#e5e7eb"}` }}>
          <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `${rank + 1}.`}</span>
          <Avatar player={p} size={32} />
          <span style={{ flex: 1, fontWeight: 600 }}>{p.name}</span>
          <span style={{ fontWeight: 800, fontSize: 20, color: rank === 0 ? "#d97706" : "#374151" }}>{s}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Annonces Belote/Coinche ──────────────────────────────────────────────────

const BELOTE_ANNONCES = [
  { label: "Tierce", pts: 20 }, { label: "Quarte", pts: 50 }, { label: "Quinte", pts: 100 },
  { label: "Carré", pts: 100 }, { label: "Carré de 9", pts: 150 }, { label: "Carré de J", pts: 200 },
];

interface AnnoncesState { total: number; belote: boolean; }

function AnnoncesBlock({ label, value, onChange }: { label: string; value: AnnoncesState; onChange: (v: AnnoncesState) => void }) {
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

function calcAnnonces(nous: AnnoncesState, eux: AnnoncesState): { nous: number; eux: number } {
  let n = nous.belote ? 20 : 0;
  let e = eux.belote ? 20 : 0;
  if (nous.total > eux.total) { n += nous.total + eux.total; }
  else if (eux.total > nous.total) { e += nous.total + eux.total; }
  // égalité : personne ne prend les annonces (sauf belote)
  return { nous: n, eux: e };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BELOTE
// ═══════════════════════════════════════════════════════════════════════════════

interface BeloteRound { nous_cartes: number; eux_cartes: number; nous_ann: number; eux_ann: number; }

function BeloteGame({ users, onDone }: { users: User[]; onDone: () => void }) {
  const [teams, setTeams] = useState<[GamePlayer[], GamePlayer[]]>([[], []]);
  const [names, setNames] = useState(["Nous", "Eux"]);
  const [rounds, setRounds] = useState<BeloteRound[]>([]);
  const [target, setTarget] = useState(1000);
  const [setup, setSetup] = useState(true);
  const [cartes, setCartes] = useState(["", ""]);
  const [annonces, setAnnonces] = useState<[AnnoncesState, AnnoncesState]>([{ total: 0, belote: false }, { total: 0, belote: false }]);

  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVals, setEditVals] = useState({ nous_cartes: "", eux_cartes: "", nous_ann: "", eux_ann: "" });

  const totals = rounds.reduce((acc, r) => [acc[0] + r.nous_cartes + r.nous_ann, acc[1] + r.eux_cartes + r.eux_ann], [0, 0]);
  const winner = totals[0] >= target ? 0 : totals[1] >= target ? 1 : null;

  function startEdit(i: number) {
    const r = rounds[i];
    setEditVals({ nous_cartes: String(r.nous_cartes), eux_cartes: String(r.eux_cartes), nous_ann: String(r.nous_ann), eux_ann: String(r.eux_ann) });
    setEditIdx(i);
  }
  function saveEdit(i: number) {
    setRounds((rs) => rs.map((r, j) => j !== i ? r : { nous_cartes: parseInt(editVals.nous_cartes) || 0, eux_cartes: parseInt(editVals.eux_cartes) || 0, nous_ann: parseInt(editVals.nous_ann) || 0, eux_ann: parseInt(editVals.eux_ann) || 0 }));
    setEditIdx(null);
  }

  function setCarteWithMirror(idx: number, v: string) {
    const n = parseInt(v);
    setCartes((c) => {
      const next = [...c];
      next[idx] = v;
      if (!isNaN(n) && n >= 0 && n <= 160) next[1 - idx] = String(160 - n);
      return next;
    });
  }

  function addRound() {
    const n = parseInt(cartes[0]) || 0;
    const e = parseInt(cartes[1]) || 0;
    const ann = calcAnnonces(annonces[0], annonces[1]);
    setRounds((r) => [...r, { nous_cartes: n, eux_cartes: e, nous_ann: ann.nous, eux_ann: ann.eux }]);
    setCartes(["", ""]);
    setAnnonces([{ total: 0, belote: false }, { total: 0, belote: false }]);
  }

  function capot(t: number) {
    setRounds((r) => [...r, t === 0 ? { nous_cartes: 250, eux_cartes: 0, nous_ann: 0, eux_ann: 0 } : { nous_cartes: 0, eux_cartes: 250, nous_ann: 0, eux_ann: 0 }]);
  }

  function finish() {
    const all = [...teams[0], ...teams[1]];
    saveResult({ id: Date.now().toString(), game: "belote", date: new Date().toISOString(), players: all, scores: all.map((p) => teams[0].includes(p) ? totals[0] : totals[1]), lowWins: false });
    onDone();
  }

  if (setup) return (
    <Card>
      <h2 style={{ margin: "0 0 18px", fontSize: 18 }}>⚙️ Configuration Belote</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[0, 1].map((i) => (
          <div key={i}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <Input value={names[i]} onChange={(v) => setNames((t) => t.map((x, j) => j === i ? v : x))} placeholder={`Équipe ${i + 1}`} style={{ width: 140 }} />
            </div>
            <PlayerPicker users={users.filter((u) => !teams[1 - i].some((p) => p.id === u.id))} selected={teams[i]}
              onChange={(p) => setTeams((t) => t.map((x, j) => j === i ? p : x) as [GamePlayer[], GamePlayer[]])} min={1} max={4} />
          </div>
        ))}
        <div>
          <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>Score cible</label>
          <Input value={target} onChange={(v) => setTarget(parseInt(v) || 1000)} type="number" style={{ width: 120 }} />
        </div>
        <Btn onClick={() => setSetup(false)} disabled={teams[0].length === 0 || teams[1].length === 0}>Commencer →</Btn>
      </div>
    </Card>
  );

  // Preview du total de la manche en cours
  const previewAnn = calcAnnonces(annonces[0], annonces[1]);
  const previewNous = (parseInt(cartes[0]) || 0) + previewAnn.nous;
  const previewEux = (parseInt(cartes[1]) || 0) + previewAnn.eux;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Scores */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[0, 1].map((i) => (
          <Card key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{names[i]}</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 4, margin: "4px 0" }}>
              {teams[i].map((p) => <Avatar key={p.id} player={p} size={24} />)}
            </div>
            <div style={{ fontSize: 38, fontWeight: 800, color: "#4f46e5" }}>{totals[i]}</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>/ {target}</div>
          </Card>
        ))}
      </div>

      {winner !== null && (
        <Card style={{ textAlign: "center", background: "#f0fdf4", border: "1px solid #86efac" }}>
          <div style={{ fontSize: 22 }}>🏆</div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{names[winner]} gagne !</div>
          <Btn onClick={finish} style={{ marginTop: 10 }}>Enregistrer et terminer</Btn>
        </Card>
      )}

      {winner === null && (
        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>Manche {rounds.length + 1}</h3>
          {/* Cartes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {[0, 1].map((i) => (
              <div key={i}>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Cartes {names[i]}</label>
                <Input value={cartes[i]} onChange={(v) => setCarteWithMirror(i, v)} type="number" placeholder="0–160" />
              </div>
            ))}
          </div>
          {/* Annonces */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {[0, 1].map((i) => (
              <AnnoncesBlock key={i} label={`Annonces ${names[i]}`} value={annonces[i]}
                onChange={(v) => setAnnonces((a) => a.map((x, j) => j === i ? v : x) as [AnnoncesState, AnnoncesState])} />
            ))}
          </div>
          {/* Preview total manche */}
          {(cartes[0] || cartes[1]) && (
            <div style={{ background: "#f0f9ff", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#0369a1", marginBottom: 10 }}>
              Total manche → {names[0]} : <strong>{previewNous}</strong> · {names[1]} : <strong>{previewEux}</strong>
              {annonces[0].total === annonces[1].total && (annonces[0].total > 0) && <span style={{ color: "#d97706" }}> (annonces égales = annulées)</span>}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={addRound}>+ Valider la manche</Btn>
            <Btn variant="ghost" onClick={() => capot(0)}>Capot {names[0]}</Btn>
            <Btn variant="ghost" onClick={() => capot(1)}>Capot {names[1]}</Btn>
          </div>
        </Card>
      )}

      {rounds.length > 0 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>Historique ({rounds.length} manches)</h3>
            <Btn variant="danger" onClick={() => setRounds([])} style={{ padding: "3px 8px", fontSize: 11 }}>Reset</Btn>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ color: "#9ca3af" }}>
                <th style={{ padding: "3px 6px", textAlign: "left" }}>#</th>
                <th style={{ padding: "3px 6px", textAlign: "right" }}>{names[0]} cartes</th>
                <th style={{ padding: "3px 6px", textAlign: "right" }}>{names[0]} ann.</th>
                <th style={{ padding: "3px 6px", textAlign: "right" }}>{names[1]} cartes</th>
                <th style={{ padding: "3px 6px", textAlign: "right" }}>{names[1]} ann.</th>
                <th />
              </tr></thead>
              <tbody>
                {rounds.map((r, i) => editIdx === i ? (
                  <tr key={i} style={{ borderTop: "1px solid #f3f4f6", background: "#fafaf9" }}>
                    <td style={{ padding: "3px 6px", color: "#9ca3af" }}>{i + 1}</td>
                    <td style={{ padding: "2px 4px" }}><input type="number" value={editVals.nous_cartes} onChange={(e) => setEditVals((v) => ({ ...v, nous_cartes: e.target.value }))} style={{ width: 48, border: "1px solid #6366f1", borderRadius: 4, padding: "2px 4px", fontSize: 12, textAlign: "right" }} /></td>
                    <td style={{ padding: "2px 4px" }}><input type="number" value={editVals.nous_ann} onChange={(e) => setEditVals((v) => ({ ...v, nous_ann: e.target.value }))} style={{ width: 42, border: "1px solid #7c3aed", borderRadius: 4, padding: "2px 4px", fontSize: 12, textAlign: "right" }} /></td>
                    <td style={{ padding: "2px 4px" }}><input type="number" value={editVals.eux_cartes} onChange={(e) => setEditVals((v) => ({ ...v, eux_cartes: e.target.value }))} style={{ width: 48, border: "1px solid #6366f1", borderRadius: 4, padding: "2px 4px", fontSize: 12, textAlign: "right" }} /></td>
                    <td style={{ padding: "2px 4px" }}><input type="number" value={editVals.eux_ann} onChange={(e) => setEditVals((v) => ({ ...v, eux_ann: e.target.value }))} style={{ width: 42, border: "1px solid #7c3aed", borderRadius: 4, padding: "2px 4px", fontSize: 12, textAlign: "right" }} /></td>
                    <td style={{ padding: "2px 4px", whiteSpace: "nowrap" }}>
                      <button onClick={() => saveEdit(i)} style={{ border: "none", background: "#4f46e5", color: "#fff", borderRadius: 4, padding: "2px 6px", fontSize: 11, cursor: "pointer", marginRight: 2 }}>✓</button>
                      <button onClick={() => setEditIdx(null)} style={{ border: "none", background: "#e5e7eb", color: "#374151", borderRadius: 4, padding: "2px 6px", fontSize: 11, cursor: "pointer" }}>✕</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "3px 6px", color: "#9ca3af" }}>{i + 1}</td>
                    <td style={{ padding: "3px 6px", textAlign: "right", fontWeight: 600 }}>{r.nous_cartes}</td>
                    <td style={{ padding: "3px 6px", textAlign: "right", color: r.nous_ann > 0 ? "#7c3aed" : "#9ca3af" }}>{r.nous_ann > 0 ? `+${r.nous_ann}` : "—"}</td>
                    <td style={{ padding: "3px 6px", textAlign: "right", fontWeight: 600 }}>{r.eux_cartes}</td>
                    <td style={{ padding: "3px 6px", textAlign: "right", color: r.eux_ann > 0 ? "#7c3aed" : "#9ca3af" }}>{r.eux_ann > 0 ? `+${r.eux_ann}` : "—"}</td>
                    <td style={{ padding: "3px 6px" }}><button onClick={() => startEdit(i)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 13, color: "#9ca3af" }}>✏️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Btn variant="ghost" onClick={() => { setSetup(true); setRounds([]); }}>← Nouvelle partie</Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COINCHE
// ═══════════════════════════════════════════════════════════════════════════════

type CoincheMult = "normal" | "coinche" | "surcoinche";
type TrumpColor = "♠" | "♥" | "♦" | "♣" | "SA" | "TA";

interface CoincheRound {
  preneur: 0 | 1; bid: number; trump: TrumpColor; mult: CoincheMult;
  cartes: [number, number]; ann: [number, number]; // scores par équipe après calcul
}

const COINCHE_MULT: Record<CoincheMult, number> = { normal: 1, coinche: 2, surcoinche: 4 };
const BIDS = [80, 90, 100, 110, 120, 130, 140, 150, 160];
const TRUMPS: TrumpColor[] = ["♠", "♥", "♦", "♣", "SA", "TA"];

function CoincheGame({ users, onDone }: { users: User[]; onDone: () => void }) {
  const [teams, setTeams] = useState<[GamePlayer[], GamePlayer[]]>([[], []]);
  const [names, setNames] = useState(["Nous", "Eux"]);
  const [rounds, setRounds] = useState<CoincheRound[]>([]);
  const [target, setTarget] = useState(3000);
  const [setup, setSetup] = useState(true);

  // Saisie manche
  const [preneur, setPreneur] = useState<0 | 1>(0);
  const [bid, setBid] = useState(80);
  const [trump, setTrump] = useState<TrumpColor>("♥");
  const [mult, setMult] = useState<CoincheMult>("normal");
  const [cartes, setCartes] = useState(["", ""]);
  const [annonces, setAnnonces] = useState<[AnnoncesState, AnnoncesState]>([{ total: 0, belote: false }, { total: 0, belote: false }]);

  function setCoincheCarte(idx: number, v: string) {
    const n = parseInt(v);
    setCartes((c) => {
      const next = [...c];
      next[idx] = v;
      if (!isNaN(n) && n >= 0 && n <= 160) next[1 - idx] = String(160 - n);
      return next;
    });
  }

  const totals = rounds.reduce((acc, r) => [acc[0] + r.ann[0], acc[1] + r.ann[1]], [0, 0]);
  const winner = totals[0] >= target ? 0 : totals[1] >= target ? 1 : null;
  const [editCIdx, setEditCIdx] = useState<number | null>(null);
  const [editCVals, setEditCVals] = useState(["", ""]);

  function startEditC(i: number) { setEditCVals([String(rounds[i].ann[0]), String(rounds[i].ann[1])]); setEditCIdx(i); }
  function saveEditC(i: number) { setRounds((rs) => rs.map((r, j) => j !== i ? r : { ...r, ann: [parseInt(editCVals[0]) || 0, parseInt(editCVals[1]) || 0] as [number, number] })); setEditCIdx(null); }

  function addRound() {
    const c0 = parseInt(cartes[0]) || 0;
    const c1 = parseInt(cartes[1]) || 0;
    const rawAnn = calcAnnonces(annonces[0], annonces[1]);
    const totalPreneur = (preneur === 0 ? c0 : c1) + (preneur === 0 ? rawAnn.nous : rawAnn.eux);
    const won = bid === 250 ? (preneur === 0 ? c0 === 162 : c1 === 162) : totalPreneur >= bid;
    const enjeu = bid * COINCHE_MULT[mult];
    const belote0 = annonces[0].belote ? 20 : 0;
    const belote1 = annonces[1].belote ? 20 : 0;

    let score0 = 0, score1 = 0;
    if (won) {
      if (preneur === 0) { score0 = enjeu + belote0; score1 = belote1; }
      else { score1 = enjeu + belote1; score0 = belote0; }
    } else {
      if (preneur === 0) { score1 = enjeu + belote1; score0 = belote0; }
      else { score0 = enjeu + belote0; score1 = belote1; }
    }
    // round 10
    score0 = Math.round(score0 / 10) * 10;
    score1 = Math.round(score1 / 10) * 10;

    setRounds((r) => [...r, { preneur, bid, trump, mult, cartes: [c0, c1], ann: [score0, score1] }]);
    setCartes(["", ""]); setAnnonces([{ total: 0, belote: false }, { total: 0, belote: false }]);
    setMult("normal");
  }

  function finish() {
    const all = [...teams[0], ...teams[1]];
    saveResult({ id: Date.now().toString(), game: "coinche", date: new Date().toISOString(), players: all, scores: all.map((p) => teams[0].includes(p) ? totals[0] : totals[1]), lowWins: false });
    onDone();
  }

  if (setup) return (
    <Card>
      <h2 style={{ margin: "0 0 18px", fontSize: 18 }}>⚙️ Configuration Coinche</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[0, 1].map((i) => (
          <div key={i}>
            <Input value={names[i]} onChange={(v) => setNames((t) => t.map((x, j) => j === i ? v : x))} placeholder={`Équipe ${i + 1}`} style={{ width: 140, marginBottom: 8 }} />
            <PlayerPicker users={users.filter((u) => !teams[1 - i].some((p) => p.id === u.id))} selected={teams[i]}
              onChange={(p) => setTeams((t) => t.map((x, j) => j === i ? p : x) as [GamePlayer[], GamePlayer[]])} min={1} max={4} />
          </div>
        ))}
        <div>
          <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>Score cible</label>
          <Input value={target} onChange={(v) => setTarget(parseInt(v) || 3000)} type="number" style={{ width: 120 }} />
        </div>
        <Btn onClick={() => setSetup(false)} disabled={teams[0].length === 0 || teams[1].length === 0}>Commencer →</Btn>
      </div>
    </Card>
  );

  // Preview
  const c0 = parseInt(cartes[0]) || 0; const c1 = parseInt(cartes[1]) || 0;
  const rawAnn = calcAnnonces(annonces[0], annonces[1]);
  const ptPreneur = (preneur === 0 ? c0 + rawAnn.nous : c1 + rawAnn.eux);
  const willWin = cartes[preneur] !== "" && ptPreneur >= bid;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[0, 1].map((i) => (
          <Card key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{names[i]}</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 4, margin: "4px 0" }}>
              {teams[i].map((p) => <Avatar key={p.id} player={p} size={22} />)}
            </div>
            <div style={{ fontSize: 38, fontWeight: 800, color: "#4f46e5" }}>{totals[i]}</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>/ {target}</div>
          </Card>
        ))}
      </div>

      {winner !== null && (
        <Card style={{ textAlign: "center", background: "#f0fdf4", border: "1px solid #86efac" }}>
          <div style={{ fontSize: 22 }}>🏆</div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{names[winner]} gagne !</div>
          <Btn onClick={finish} style={{ marginTop: 10 }}>Enregistrer et terminer</Btn>
        </Card>
      )}

      {winner === null && (
        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>Manche {rounds.length + 1}</h3>
          {/* Preneur */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>Preneur</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[0, 1].map((i) => (
                <button key={i} onClick={() => setPreneur(i as 0 | 1)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, background: preneur === i ? "#4f46e5" : "#f3f4f6", color: preneur === i ? "#fff" : "#374151" }}>
                  {names[i]}
                </button>
              ))}
            </div>
          </div>
          {/* Contrat */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>Contrat</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {BIDS.map((b) => (
                <button key={b} onClick={() => setBid(b)} style={{ padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: bid === b ? "#4f46e5" : "#f3f4f6", color: bid === b ? "#fff" : "#374151" }}>
                  {b === 250 ? "Capot" : b}
                </button>
              ))}
            </div>
          </div>
          {/* Couleur */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>Atout</label>
            <div style={{ display: "flex", gap: 6 }}>
              {TRUMPS.map((t) => (
                <button key={t} onClick={() => setTrump(t)} style={{ width: 40, height: 36, borderRadius: 8, border: "none", cursor: "pointer", fontSize: t.length > 1 ? 11 : 18, fontWeight: 700, background: trump === t ? "#4f46e5" : "#f3f4f6", color: trump === t ? "#fff" : (t === "♥" || t === "♦") ? "#dc2626" : "#374151" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          {/* Coinche */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>Coinche</label>
            <div style={{ display: "flex", gap: 8 }}>
              {([["normal", "Normal ×1"], ["coinche", "Coinché ×2"], ["surcoinche", "Surcoinché ×4"]] as [CoincheMult, string][]).map(([m, l]) => (
                <button key={m} onClick={() => setMult(m)} style={{ flex: 1, padding: "6px 4px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: mult === m ? "#7c3aed" : "#f3f4f6", color: mult === m ? "#fff" : "#374151" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {/* Cartes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {[0, 1].map((i) => (
              <div key={i}>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Cartes {names[i]}</label>
                <Input value={cartes[i]} onChange={(v) => setCoincheCarte(i, v)} type="number" placeholder="0–160" />
              </div>
            ))}
          </div>
          {/* Annonces */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {[0, 1].map((i) => (
              <AnnoncesBlock key={i} label={`Annonces ${names[i]}`} value={annonces[i]}
                onChange={(v) => setAnnonces((a) => a.map((x, j) => j === i ? v : x) as [AnnoncesState, AnnoncesState])} />
            ))}
          </div>
          {/* Preview */}
          {cartes[preneur] !== "" && (
            <div style={{ background: willWin ? "#f0fdf4" : "#fff1f2", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: willWin ? "#166534" : "#991b1b", marginBottom: 10 }}>
              {willWin ? "✅" : "❌"} {names[preneur]} : {ptPreneur} pts (objectif {bid}) → enjeu {bid * COINCHE_MULT[mult]} pts
            </div>
          )}
          <Btn onClick={addRound} disabled={cartes[0] === "" || cartes[1] === ""}>+ Valider la manche</Btn>
        </Card>
      )}

      {rounds.length > 0 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>Historique ({rounds.length} manches)</h3>
            <Btn variant="danger" onClick={() => setRounds([])} style={{ padding: "3px 8px", fontSize: 11 }}>Reset</Btn>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ color: "#9ca3af" }}>
                <th style={{ padding: "3px 5px", textAlign: "left" }}>#</th>
                <th style={{ padding: "3px 5px" }}>Preneur</th>
                <th style={{ padding: "3px 5px" }}>Contrat</th>
                <th style={{ padding: "3px 5px", textAlign: "right" }}>{names[0]}</th>
                <th style={{ padding: "3px 5px", textAlign: "right" }}>{names[1]}</th>
                <th />
              </tr></thead>
              <tbody>
                {rounds.map((r, i) => editCIdx === i ? (
                  <tr key={i} style={{ borderTop: "1px solid #f3f4f6", background: "#fafaf9" }}>
                    <td style={{ padding: "3px 5px", color: "#9ca3af" }}>{i + 1}</td>
                    <td style={{ padding: "3px 5px", fontWeight: 600 }}>{names[r.preneur]}</td>
                    <td style={{ padding: "3px 5px", fontSize: 11 }}>{r.bid === 250 ? "Capot" : r.bid}{r.trump}</td>
                    <td style={{ padding: "2px 4px" }}><input type="number" value={editCVals[0]} onChange={(e) => setEditCVals((v) => [e.target.value, v[1]])} style={{ width: 52, border: "1px solid #6366f1", borderRadius: 4, padding: "2px 4px", fontSize: 12, textAlign: "right" }} /></td>
                    <td style={{ padding: "2px 4px" }}><input type="number" value={editCVals[1]} onChange={(e) => setEditCVals((v) => [v[0], e.target.value])} style={{ width: 52, border: "1px solid #6366f1", borderRadius: 4, padding: "2px 4px", fontSize: 12, textAlign: "right" }} /></td>
                    <td style={{ padding: "2px 4px", whiteSpace: "nowrap" }}>
                      <button onClick={() => saveEditC(i)} style={{ border: "none", background: "#4f46e5", color: "#fff", borderRadius: 4, padding: "2px 6px", fontSize: 11, cursor: "pointer", marginRight: 2 }}>✓</button>
                      <button onClick={() => setEditCIdx(null)} style={{ border: "none", background: "#e5e7eb", color: "#374151", borderRadius: 4, padding: "2px 6px", fontSize: 11, cursor: "pointer" }}>✕</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "3px 5px", color: "#9ca3af" }}>{i + 1}</td>
                    <td style={{ padding: "3px 5px", fontWeight: 600 }}>{names[r.preneur]}</td>
                    <td style={{ padding: "3px 5px" }}>{r.bid === 250 ? "Capot" : r.bid}{r.trump} {r.mult !== "normal" ? `×${COINCHE_MULT[r.mult]}` : ""}</td>
                    <td style={{ padding: "3px 5px", textAlign: "right", fontWeight: 700, color: r.ann[0] > 0 ? "#15803d" : "#9ca3af" }}>{r.ann[0] > 0 ? `+${r.ann[0]}` : "0"}</td>
                    <td style={{ padding: "3px 5px", textAlign: "right", fontWeight: 700, color: r.ann[1] > 0 ? "#15803d" : "#9ca3af" }}>{r.ann[1] > 0 ? `+${r.ann[1]}` : "0"}</td>
                    <td style={{ padding: "3px 5px" }}><button onClick={() => startEditC(i)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 13, color: "#9ca3af" }}>✏️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Btn variant="ghost" onClick={() => { setSetup(true); setRounds([]); }}>← Nouvelle partie</Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAROT
// ═══════════════════════════════════════════════════════════════════════════════

type TarotBid = "petite" | "garde" | "garde_sans" | "garde_contre" | "misere";
type Poignee = "none" | "simple" | "double" | "triple";
type PetitAuBout = "none" | "preneur" | "defense";
type Chelem = "none" | "annonce_reussi" | "non_annonce" | "annonce_rate";

interface TarotRound {
  preneur: number; bid: TarotBid; oudlers: number; points: number;
  poignee: Poignee; poignee_player: number;
  petit_au_bout: PetitAuBout; chelem: Chelem;
  scores: number[];
}

const BID_LABELS: Record<TarotBid, string> = { petite: "Petite ×1", garde: "Garde ×2", garde_sans: "G. sans ×4", garde_contre: "G. contre ×6", misere: "Misère" };
const BID_MULT: Record<TarotBid, number> = { petite: 1, garde: 2, garde_sans: 4, garde_contre: 6, misere: 0 };
const OUDLER_TARGET = [56, 51, 41, 36];
const POIGNEE_PTS: Record<Poignee, number> = { none: 0, simple: 20, double: 30, triple: 40 };
const POIGNEE_LABELS: Record<Poignee, string> = { none: "Aucune", simple: "Simple (+20)", double: "Double (+30)", triple: "Triple (+40)" };
const MISERE_SCORE = 200; // score fixe misère

function calcTarot(preneur: number, bid: TarotBid, oudlers: number, points: number, nb: number, poignee: Poignee, petitAuBout: PetitAuBout, chelem: Chelem): number[] {
  const result = Array(nb).fill(0);

  // ─── Misère : le preneur doit faire 0 point ───────────────────────────────
  if (bid === "misere") {
    const won = points === 0;
    const score = won ? MISERE_SCORE : -MISERE_SCORE;
    result[preneur] = score * (nb - 1);
    for (let i = 0; i < nb; i++) if (i !== preneur) result[i] = -score;
    return result;
  }

  // ─── Contrats normaux ─────────────────────────────────────────────────────
  const mult = BID_MULT[bid];
  const diff = points - OUDLER_TARGET[oudlers];
  const won = diff >= 0;
  let base = (25 + Math.abs(diff)) * mult;

  // Petit au bout
  if (petitAuBout === "preneur") base += 10 * mult;
  else if (petitAuBout === "defense") base -= 10 * mult;

  const poigneePts = POIGNEE_PTS[poignee] * mult;

  let chelemBonus = 0;
  if (chelem === "annonce_reussi") chelemBonus = 400;
  else if (chelem === "non_annonce") chelemBonus = 200;
  else if (chelem === "annonce_rate") chelemBonus = -200;

  const score = won ? base : -base;
  result[preneur] = score * (nb - 1);
  for (let i = 0; i < nb; i++) if (i !== preneur) result[i] = -score;

  if (poigneePts > 0) {
    if (won) { result[preneur] += poigneePts * (nb - 1); for (let i = 0; i < nb; i++) if (i !== preneur) result[i] -= poigneePts; }
    else { result[preneur] -= poigneePts * (nb - 1); for (let i = 0; i < nb; i++) if (i !== preneur) result[i] += poigneePts; }
  }

  if (chelemBonus !== 0) {
    result[preneur] += chelemBonus * (nb - 1);
    for (let i = 0; i < nb; i++) if (i !== preneur) result[i] -= chelemBonus;
  }

  return result;
}

function TarotGame({ users, onDone }: { users: User[]; onDone: () => void }) {
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [rounds, setRounds] = useState<TarotRound[]>([]);
  const [setup, setSetup] = useState(true);
  const [entry, setEntry] = useState({ preneur: 0, bid: "petite" as TarotBid, oudlers: 0, points: "", poignee: "none" as Poignee, poignee_player: 0, petit_au_bout: "none" as PetitAuBout, chelem: "none" as Chelem });

  const nb = players.length;
  const totals = rounds.reduce((acc, r) => acc.map((v, i) => v + r.scores[i]), Array(nb).fill(0));
  const [editTIdx, setEditTIdx] = useState<number | null>(null);
  const [editTVals, setEditTVals] = useState<string[]>([]);

  function startEditT(i: number) { setEditTVals(rounds[i].scores.map(String)); setEditTIdx(i); }
  function saveEditT(i: number) { setRounds((rs) => rs.map((r, j) => j !== i ? r : { ...r, scores: editTVals.map((v) => parseInt(v) || 0) })); setEditTIdx(null); }

  function addRound() {
    const pts = parseInt(entry.points);
    if (isNaN(pts)) return;
    const scores = calcTarot(entry.preneur, entry.bid, entry.oudlers, pts, nb, entry.poignee, entry.petit_au_bout, entry.chelem);
    setRounds((r) => [...r, { ...entry, points: pts, scores }]);
    setEntry((e) => ({ ...e, points: "", poignee: "none", petit_au_bout: "none", chelem: "none" }));
  }

  function finish() {
    saveResult({ id: Date.now().toString(), game: "tarot", date: new Date().toISOString(), players, scores: totals, lowWins: false });
    onDone();
  }

  if (setup) return (
    <Card>
      <h2 style={{ margin: "0 0 18px", fontSize: 18 }}>⚙️ Configuration Tarot</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <PlayerPicker users={users} selected={players} onChange={setPlayers} min={3} max={5} />
        <Btn onClick={() => setSetup(false)} disabled={players.length < 3}>Commencer avec {players.length} joueurs →</Btn>
      </div>
    </Card>
  );

  const isMisere = entry.bid === "misere";

  // Preview score
  const preview = entry.points !== "" ? (() => {
    const pts = parseInt(entry.points) || 0;
    if (isMisere) {
      const won = pts === 0;
      return { won, gain: won ? MISERE_SCORE * (nb - 1) : -MISERE_SCORE * (nb - 1) };
    }
    const diff = pts - OUDLER_TARGET[entry.oudlers];
    const won = diff >= 0;
    const base = (25 + Math.abs(diff)) * BID_MULT[entry.bid];
    return { won, gain: won ? base * (nb - 1) : -base * (nb - 1) };
  })() : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Scoreboard players={players} scores={totals} />

      <Card>
        <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>Donne {rounds.length + 1}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Preneur */}
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>Preneur</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {players.map((p, i) => (
                <button key={p.id} onClick={() => setEntry((e) => ({ ...e, preneur: i }))} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: entry.preneur === i ? "#4f46e5" : "#f3f4f6", color: entry.preneur === i ? "#fff" : "#374151" }}>
                  <Avatar player={p} size={18} />{p.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
          {/* Contrat */}
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>Contrat</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["petite", "garde", "garde_sans", "garde_contre", "misere"] as TarotBid[]).map((b) => (
                <button key={b} onClick={() => setEntry((e) => ({ ...e, bid: b }))} style={{ padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: entry.bid === b ? (b === "misere" ? "#7c3aed" : "#4f46e5") : "#f3f4f6", color: entry.bid === b ? "#fff" : "#374151" }}>
                  {BID_LABELS[b]}
                </button>
              ))}
            </div>
            {isMisere && <div style={{ fontSize: 12, color: "#7c3aed", marginTop: 6 }}>Le preneur doit faire 0 point. Score fixe : ±{MISERE_SCORE} pts.</div>}
          </div>
          {/* Bouts — masqué en misère */}
          {!isMisere && (
            <div>
              <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>Bouts (objectif : {OUDLER_TARGET[entry.oudlers]} pts)</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[0, 1, 2, 3].map((n) => (
                  <button key={n} onClick={() => setEntry((e) => ({ ...e, oudlers: n }))} style={{ width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, background: entry.oudlers === n ? "#4f46e5" : "#f3f4f6", color: entry.oudlers === n ? "#fff" : "#374151" }}>{n}</button>
                ))}
              </div>
            </div>
          )}
          {/* Points */}
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              {isMisere ? "Points du preneur (doit être 0 pour réussir)" : "Points du preneur (0–91)"}
            </label>
            <Input value={entry.points} onChange={(v) => setEntry((e) => ({ ...e, points: v }))} type="number" placeholder={isMisere ? "0" : "ex: 54"} />
          </div>
          {preview && (
            <div style={{ background: preview.won ? "#f0fdf4" : "#fff1f2", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: preview.won ? "#166534" : "#991b1b" }}>
              {preview.won ? "✅ Réussi" : "❌ Chuté"} — Preneur : {preview.gain > 0 ? "+" : ""}{preview.gain} pts (hors annonces)
            </div>
          )}

          {/* ─── Annonces Tarot — masquées en misère ─── */}
          {!isMisere && <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#374151", marginBottom: 10 }}>Annonces</div>

            {/* Poignée */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>Poignée (joueur + type)</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                {players.map((p, i) => (
                  <button key={p.id} onClick={() => setEntry((e) => ({ ...e, poignee_player: i, poignee: e.poignee === "none" ? "simple" : e.poignee }))} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: entry.poignee_player === i && entry.poignee !== "none" ? "#4f46e5" : "#f3f4f6", color: entry.poignee_player === i && entry.poignee !== "none" ? "#fff" : "#374151" }}>
                    <Avatar player={p} size={16} />{p.name.split(" ")[0]}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(["none", "simple", "double", "triple"] as Poignee[]).map((pg) => (
                  <button key={pg} onClick={() => setEntry((e) => ({ ...e, poignee: pg }))} style={{ padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: entry.poignee === pg ? "#7c3aed" : "#f3f4f6", color: entry.poignee === pg ? "#fff" : "#374151" }}>
                    {POIGNEE_LABELS[pg]}
                  </button>
                ))}
              </div>
            </div>

            {/* Petit au bout */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>Petit au bout (±{10 * BID_MULT[entry.bid]} pts)</label>
              <div style={{ display: "flex", gap: 6 }}>
                {([["none", "—"], ["preneur", "Preneur"], ["defense", "Défense"]] as [PetitAuBout, string][]).map(([v, l]) => (
                  <button key={v} onClick={() => setEntry((e) => ({ ...e, petit_au_bout: v }))} style={{ padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: entry.petit_au_bout === v ? "#0369a1" : "#f3f4f6", color: entry.petit_au_bout === v ? "#fff" : "#374151" }}>{l}</button>
                ))}
              </div>
            </div>

            {/* Chelem */}
            <div>
              <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>Chelem</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {([["none", "Aucun"], ["annonce_reussi", "Annoncé ✓ (+400)"], ["non_annonce", "Non-annoncé (+200)"], ["annonce_rate", "Annoncé ✗ (-200)"]] as [Chelem, string][]).map(([v, l]) => (
                  <button key={v} onClick={() => setEntry((e) => ({ ...e, chelem: v }))} style={{ padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: entry.chelem === v ? "#d97706" : "#f3f4f6", color: entry.chelem === v ? "#fff" : "#374151" }}>{l}</button>
                ))}
              </div>
            </div>
          </div>}

          <Btn onClick={addRound} disabled={entry.points === ""}>+ Valider la donne</Btn>
        </div>
      </Card>

      {rounds.length > 0 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>Historique ({rounds.length} donnes)</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="danger" onClick={() => setRounds([])} style={{ padding: "3px 8px", fontSize: 11 }}>Reset</Btn>
              <Btn variant="secondary" onClick={finish} style={{ padding: "3px 8px", fontSize: 11 }}>Terminer</Btn>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ color: "#9ca3af" }}>
                <th style={{ padding: "3px 5px", textAlign: "left" }}>#</th>
                <th style={{ padding: "3px 5px" }}>Preneur</th>
                <th style={{ padding: "3px 5px" }}>Contrat</th>
                {players.map((p) => <th key={p.id} style={{ padding: "3px 5px" }}>{p.name.split(" ")[0]}</th>)}
                <th style={{ padding: "3px 5px" }}>+</th>
                <th />
              </tr></thead>
              <tbody>
                {rounds.map((r, i) => editTIdx === i ? (
                  <tr key={i} style={{ borderTop: "1px solid #f3f4f6", background: "#fafaf9" }}>
                    <td style={{ padding: "3px 5px", color: "#9ca3af" }}>{i + 1}</td>
                    <td style={{ padding: "3px 5px", fontWeight: 600 }}>{players[r.preneur]?.name.split(" ")[0]}</td>
                    <td style={{ padding: "3px 5px", fontSize: 11 }}>{BID_LABELS[r.bid].split(" ")[0]}</td>
                    {editTVals.map((v, j) => (
                      <td key={j} style={{ padding: "2px 3px" }}>
                        <input type="number" value={v} onChange={(e) => setEditTVals((vals) => vals.map((x, k) => k === j ? e.target.value : x))} style={{ width: 46, border: "1px solid #6366f1", borderRadius: 4, padding: "2px 3px", fontSize: 12, textAlign: "right" }} />
                      </td>
                    ))}
                    <td />
                    <td style={{ padding: "2px 4px", whiteSpace: "nowrap" }}>
                      <button onClick={() => saveEditT(i)} style={{ border: "none", background: "#4f46e5", color: "#fff", borderRadius: 4, padding: "2px 6px", fontSize: 11, cursor: "pointer", marginRight: 2 }}>✓</button>
                      <button onClick={() => setEditTIdx(null)} style={{ border: "none", background: "#e5e7eb", color: "#374151", borderRadius: 4, padding: "2px 6px", fontSize: 11, cursor: "pointer" }}>✕</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "3px 5px", color: "#9ca3af" }}>{i + 1}</td>
                    <td style={{ padding: "3px 5px", fontWeight: 600 }}>{players[r.preneur]?.name.split(" ")[0]}</td>
                    <td style={{ padding: "3px 5px" }}>{BID_LABELS[r.bid].split(" ")[0]}</td>
                    {r.scores.map((s, j) => (
                      <td key={j} style={{ padding: "3px 5px", fontWeight: 600, color: s > 0 ? "#15803d" : s < 0 ? "#dc2626" : "#9ca3af" }}>{s > 0 ? "+" : ""}{s}</td>
                    ))}
                    <td style={{ padding: "3px 5px", fontSize: 11, color: "#9ca3af" }}>
                      {r.poignee !== "none" ? "P" : ""}{r.petit_au_bout !== "none" ? "pb" : ""}{r.chelem !== "none" ? "Ch" : ""}
                    </td>
                    <td style={{ padding: "3px 5px" }}><button onClick={() => startEditT(i)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 13, color: "#9ca3af" }}>✏️</button></td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid #e5e7eb", fontWeight: 800 }}>
                  <td colSpan={3} style={{ padding: "3px 5px", color: "#9ca3af" }}>∑</td>
                  {totals.map((t, i) => (
                    <td key={i} style={{ padding: "3px 5px", color: t > 0 ? "#15803d" : t < 0 ? "#dc2626" : "#9ca3af" }}>{t > 0 ? "+" : ""}{t}</td>
                  ))}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Btn variant="ghost" onClick={() => { setSetup(true); setRounds([]); }}>← Nouvelle partie</Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAPAYOO
// ═══════════════════════════════════════════════════════════════════════════════

function PapayooGame({ users, onDone }: { users: User[]; onDone: () => void }) {
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [rounds, setRounds] = useState<{ scores: number[] }[]>([]);
  const [setup, setSetup] = useState(true);
  const [entry, setEntry] = useState<string[]>(Array(6).fill(""));
  const [target, setTarget] = useState(200);

  const nb = players.length;
  const totals = rounds.reduce((acc, r) => acc.map((v, i) => v + r.scores[i]), Array(nb).fill(0));
  const loserIdx = totals.some((t) => t >= target) ? totals.indexOf(Math.max(...totals)) : null;
  const [editPIdx, setEditPIdx] = useState<number | null>(null);
  const [editPVals, setEditPVals] = useState<string[]>([]);

  function startEditP(i: number) { setEditPVals(rounds[i].scores.map(String)); setEditPIdx(i); }
  function saveEditP(i: number) { setRounds((rs) => rs.map((r, j) => j !== i ? r : { scores: editPVals.map((v) => parseInt(v) || 0) })); setEditPIdx(null); }

  function addRound() {
    setRounds((r) => [...r, { scores: entry.slice(0, nb).map((v) => parseInt(v) || 0) }]);
    setEntry(Array(6).fill(""));
  }

  function finish() {
    saveResult({ id: Date.now().toString(), game: "papayoo", date: new Date().toISOString(), players, scores: totals, lowWins: true });
    onDone();
  }

  if (setup) return (
    <Card>
      <h2 style={{ margin: "0 0 18px", fontSize: 18 }}>⚙️ Configuration Papayoo</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <PlayerPicker users={users} selected={players} onChange={setPlayers} min={3} max={6} />
        <div>
          <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>Score éliminatoire</label>
          <Input value={target} onChange={(v) => setTarget(parseInt(v) || 200)} type="number" style={{ width: 120 }} />
        </div>
        <Btn onClick={() => setSetup(false)} disabled={players.length < 3}>Commencer avec {players.length} joueurs →</Btn>
      </div>
    </Card>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Scoreboard players={players} scores={totals} lowWins />
      {loserIdx !== null && (
        <Card style={{ textAlign: "center", background: "#fff1f2", border: "1px solid #fecdd3" }}>
          <div style={{ fontSize: 22 }}>💀</div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{players[loserIdx].name} est éliminé !</div>
          <Btn onClick={finish} style={{ marginTop: 10 }}>Enregistrer et terminer</Btn>
        </Card>
      )}
      <Card>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Manche {rounds.length + 1}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {players.map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar player={p} size={26} />
              <span style={{ width: 80, fontSize: 13, fontWeight: 600 }}>{p.name.split(" ")[0]}</span>
              <Input value={entry[i]} onChange={(v) => setEntry((e) => e.map((x, j) => j === i ? v : x))} type="number" placeholder="pts" />
            </div>
          ))}
          <Btn onClick={addRound}>+ Ajouter la manche</Btn>
        </div>
      </Card>
      {rounds.length > 0 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>Historique ({rounds.length})</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="danger" onClick={() => setRounds([])} style={{ padding: "3px 8px", fontSize: 11 }}>Reset</Btn>
              <Btn variant="secondary" onClick={finish} style={{ padding: "3px 8px", fontSize: 11 }}>Terminer</Btn>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ color: "#9ca3af" }}>
                <th style={{ padding: "3px 5px", textAlign: "left" }}>#</th>
                {players.map((p) => <th key={p.id} style={{ padding: "3px 5px" }}>{p.name.split(" ")[0]}</th>)}
                <th />
              </tr></thead>
              <tbody>
                {rounds.map((r, i) => editPIdx === i ? (
                  <tr key={i} style={{ borderTop: "1px solid #f3f4f6", background: "#fafaf9" }}>
                    <td style={{ padding: "3px 5px", color: "#9ca3af" }}>{i + 1}</td>
                    {editPVals.map((v, j) => (
                      <td key={j} style={{ padding: "2px 3px" }}>
                        <input type="number" value={v} onChange={(e) => setEditPVals((vals) => vals.map((x, k) => k === j ? e.target.value : x))} style={{ width: 46, border: "1px solid #6366f1", borderRadius: 4, padding: "2px 3px", fontSize: 12, textAlign: "right" }} />
                      </td>
                    ))}
                    <td style={{ padding: "2px 4px", whiteSpace: "nowrap" }}>
                      <button onClick={() => saveEditP(i)} style={{ border: "none", background: "#4f46e5", color: "#fff", borderRadius: 4, padding: "2px 6px", fontSize: 11, cursor: "pointer", marginRight: 2 }}>✓</button>
                      <button onClick={() => setEditPIdx(null)} style={{ border: "none", background: "#e5e7eb", color: "#374151", borderRadius: 4, padding: "2px 6px", fontSize: 11, cursor: "pointer" }}>✕</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "3px 5px", color: "#9ca3af" }}>{i + 1}</td>
                    {r.scores.map((s, j) => <td key={j} style={{ padding: "3px 5px", fontWeight: 600 }}>{s}</td>)}
                    <td style={{ padding: "3px 5px" }}><button onClick={() => startEditP(i)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 13, color: "#9ca3af" }}>✏️</button></td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid #e5e7eb", fontWeight: 800 }}>
                  <td style={{ padding: "3px 5px", color: "#9ca3af" }}>∑</td>
                  {totals.map((t, i) => <td key={i} style={{ padding: "3px 5px", color: t >= target ? "#dc2626" : "#374151" }}>{t}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Btn variant="ghost" onClick={() => { setSetup(true); setRounds([]); }}>← Nouvelle partie</Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════════

const GAME_LABELS: Record<string, string> = { belote: "🃏 Belote", coinche: "🎯 Coinche", tarot: "🔮 Tarot", papayoo: "🎴 Papayoo" };

function StatsPage({ users }: { users: User[] }) {
  const history = loadHistory();
  const [filterGame, setFilterGame] = useState("all");
  const [filterPlayer, setFilterPlayer] = useState<number | "all">("all");

  const filtered = history.filter((r) =>
    (filterGame === "all" || r.game === filterGame) &&
    (filterPlayer === "all" || r.players.some((p) => p.id === filterPlayer))
  );

  const stats: Record<number, { name: string; avatar: string | null; games: number; wins: number }> = {};
  filtered.forEach((r) => {
    const best = r.lowWins ? Math.min(...r.scores) : Math.max(...r.scores);
    r.players.forEach((p, i) => {
      if (!stats[p.id]) stats[p.id] = { name: p.name, avatar: p.avatar, games: 0, wins: 0 };
      stats[p.id].games++;
      if (r.scores[i] === best) stats[p.id].wins++;
    });
  });

  const sorted = Object.entries(stats).map(([id, s]) => ({ id: +id, ...s, rate: s.games ? Math.round(s.wins / s.games * 100) : 0 })).sort((a, b) => b.rate - a.rate);
  const knownUsers = users.filter((u) => history.some((r) => r.players.some((p) => p.id === u.id)));

  if (history.length === 0) return (
    <Card style={{ textAlign: "center", padding: 40 }}>
      <div style={{ fontSize: 36 }}>📊</div>
      <div style={{ fontWeight: 600, color: "#374151", marginTop: 8 }}>Aucune partie enregistrée</div>
      <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Joue une partie et clique sur "Terminer"</div>
    </Card>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Jeu</label>
            <select value={filterGame} onChange={(e) => setFilterGame(e.target.value)} style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 10px", fontSize: 13 }}>
              <option value="all">Tous</option>
              {["belote", "coinche", "tarot", "papayoo"].map((g) => <option key={g} value={g}>{GAME_LABELS[g]}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Joueur</label>
            <select value={filterPlayer} onChange={(e) => setFilterPlayer(e.target.value === "all" ? "all" : +e.target.value)} style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 10px", fontSize: 13 }}>
              <option value="all">Tous</option>
              {knownUsers.map((u) => <option key={u.id} value={u.id}>{u.nickname || `${u.first_name} ${u.last_name}`}</option>)}
            </select>
          </div>
          <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>{filtered.length} partie{filtered.length > 1 ? "s" : ""}</span>
        </div>
      </Card>

      {sorted.length > 0 && (
        <Card>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Classement</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {sorted.map((s, rank) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: rank === 0 ? "#fefce8" : "#f9fafb", border: `1px solid ${rank === 0 ? "#fde68a" : "#e5e7eb"}` }}>
                <span style={{ width: 22, textAlign: "center" }}>{rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `${rank + 1}.`}</span>
                <Avatar player={{ id: s.id, name: s.name, avatar: s.avatar }} size={34} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>{s.games} partie{s.games > 1 ? "s" : ""} · {s.wins} victoire{s.wins > 1 ? "s" : ""}</div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 20, color: rank === 0 ? "#d97706" : "#374151" }}>{s.rate}%</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Historique</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((r) => {
            const best = r.lowWins ? Math.min(...r.scores) : Math.max(...r.scores);
            const winner = r.players[r.scores.indexOf(best)];
            return (
              <div key={r.id} style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{GAME_LABELS[r.game] ?? r.game}</span>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>{new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                </div>
                <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                  {r.players.map((p, i) => (
                    <span key={p.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, fontSize: 12, background: r.scores[i] === best ? "#fefce8" : "#f3f4f6", border: `1px solid ${r.scores[i] === best ? "#fde68a" : "#e5e7eb"}`, fontWeight: r.scores[i] === best ? 700 : 400 }}>
                      <Avatar player={p} size={14} />{p.name.split(" ")[0]} · {r.scores[i]}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "#d97706", marginTop: 5, fontWeight: 700 }}>🏆 {winner?.name}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

const GAMES_LIST = [
  { id: "belote"  as GameType, label: "Belote",   icon: "🃏", desc: "2 équipes · Annonces + Belote/Rebelote" },
  { id: "coinche" as GameType, label: "Coinche",  icon: "🎯", desc: "2 équipes · Contrat + Coinche/Surcoinche" },
  { id: "tarot"   as GameType, label: "Tarot",    icon: "🔮", desc: "3–5 joueurs · Poignée · Petit au bout · Chelem" },
  { id: "papayoo" as GameType, label: "Papayoo",  icon: "🎴", desc: "3–6 joueurs · Le moins de points gagne" },
];

export default function GamesPage() {
  const [selected, setSelected] = useState<GameType | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [tab, setTab] = useState<"games" | "stats">("games");

  useEffect(() => { usersApi.list().then(setUsers).catch(() => {}); }, []);

  function back() { setSelected(null); }

  const icons: Record<GameType, string> = { belote: "🃏", coinche: "🎯", tarot: "🔮", papayoo: "🎴" };

  if (selected) return (
    <div style={{ maxWidth: 560, margin: "32px auto", padding: "0 16px", fontFamily: "sans-serif" }}>
      <button onClick={back} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14, marginBottom: 14, padding: 0 }}>← Retour</button>
      <h1 style={{ margin: "0 0 18px", fontSize: 22 }}>{icons[selected]} {selected.charAt(0).toUpperCase() + selected.slice(1)}</h1>
      {selected === "belote"  && <BeloteGame  users={users} onDone={back} />}
      {selected === "coinche" && <CoincheGame users={users} onDone={back} />}
      {selected === "tarot"   && <TarotGame   users={users} onDone={back} />}
      {selected === "papayoo" && <PapayooGame users={users} onDone={back} />}
    </div>
  );

  return (
    <div style={{ maxWidth: 560, margin: "32px auto", padding: "0 16px", fontFamily: "sans-serif" }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>🎲 Jeux</h1>
      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid #e5e7eb" }}>
        {[{ id: "games", label: "Jeux" }, { id: "stats", label: "📊 Stats" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as "games" | "stats")} style={{ padding: "10px 20px", border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? "#4f46e5" : "#6b7280", borderBottom: `2px solid ${tab === t.id ? "#4f46e5" : "transparent"}`, marginBottom: -1 }}>{t.label}</button>
        ))}
      </div>
      {tab === "games" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {GAMES_LIST.map((g) => (
            <button key={g.id} onClick={() => setSelected(g.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", cursor: "pointer", textAlign: "left" }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.07)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}>
              <span style={{ fontSize: 30 }}>{g.icon}</span>
              <div><div style={{ fontWeight: 700, fontSize: 16 }}>{g.label}</div><div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{g.desc}</div></div>
              <span style={{ marginLeft: "auto", color: "#9ca3af" }}>→</span>
            </button>
          ))}
        </div>
      )}
      {tab === "stats" && <StatsPage users={users} />}
    </div>
  );
}
