import { useState } from "react";
import { User } from "../api/client";
import { GamePlayer, saveResult } from "./types";
import { Card, Btn, Input, Avatar, PlayerPicker, Scoreboard } from "./ui";

// ─── Types & constantes ───────────────────────────────────────────────────────

type TarotBid = "petite" | "garde" | "garde_sans" | "garde_contre" | "misere";
type Poignee = "none" | "simple" | "double" | "triple";
type PetitAuBout = "none" | "preneur" | "defense";
type Chelem = "none" | "annonce_reussi" | "non_annonce" | "annonce_rate";

interface TarotRound {
  preneur: number; bid: TarotBid; oudlers: number; points: number;
  poignee: Poignee; poignee_player: number;
  petit_au_bout: PetitAuBout; chelem: Chelem;
  allie: number | null;
  scores: number[];
}

const BID_LABELS: Record<TarotBid, string> = { petite: "Petite ×1", garde: "Garde ×2", garde_sans: "G. sans ×4", garde_contre: "G. contre ×6", misere: "Misère (10 pts)" };
const BID_MULT: Record<TarotBid, number> = { petite: 1, garde: 2, garde_sans: 4, garde_contre: 6, misere: 0 };
const OUDLER_TARGET = [56, 51, 41, 36];
const POIGNEE_PTS: Record<Poignee, number> = { none: 0, simple: 20, double: 30, triple: 40 };
const POIGNEE_LABELS: Record<Poignee, string> = { none: "Aucune", simple: "Simple", double: "Double", triple: "Triple" };
// Nb de cartes requis [3j, 4j, 5j]
const POIGNEE_CARDS: Record<Poignee, number[]> = { none: [0,0,0], simple: [13,10,8], double: [15,13,10], triple: [18,15,13] };

// ─── Calcul des scores ────────────────────────────────────────────────────────

function calcTarot(preneur: number, bid: TarotBid, oudlers: number, points: number, nb: number, poignee: Poignee, petitAuBout: PetitAuBout, chelem: Chelem, allie: number | null): number[] {
  const result = Array(nb).fill(0);

  // Misère : points = nb de misères déclarées (1 ou 2), vaut 10 pts chacune
  if (bid === "misere") {
    const gain = points * 10;
    result[preneur] = gain * (nb - 1);
    for (let i = 0; i < nb; i++) if (i !== preneur) result[i] = -gain;
    return result;
  }

  const mult = BID_MULT[bid];
  const diff = points - OUDLER_TARGET[oudlers];
  const won = diff >= 0;
  let base = (25 + Math.abs(diff)) * mult;

  if (petitAuBout === "preneur") base += 10 * mult;
  else if (petitAuBout === "defense") base -= 10 * mult;

  const poigneePts = POIGNEE_PTS[poignee] * mult;

  let chelemBonus = 0;
  if (chelem === "annonce_reussi") chelemBonus = 400;
  else if (chelem === "non_annonce") chelemBonus = 200;
  else if (chelem === "annonce_rate") chelemBonus = -200;

  const score = won ? base : -base;

  // 5 joueurs avec allié : preneur ×2, allié ×1, défenseurs -1×
  if (nb === 5 && allie !== null) {
    result[preneur] = score * 2;
    result[allie] = score;
    for (let i = 0; i < nb; i++) if (i !== preneur && i !== allie) result[i] = -score;
    if (poigneePts > 0) {
      if (won) { result[preneur] += poigneePts * 2; result[allie] += poigneePts; for (let i = 0; i < nb; i++) if (i !== preneur && i !== allie) result[i] -= poigneePts; }
      else { result[preneur] -= poigneePts * 2; result[allie] -= poigneePts; for (let i = 0; i < nb; i++) if (i !== preneur && i !== allie) result[i] += poigneePts; }
    }
    if (chelemBonus !== 0) { result[preneur] += chelemBonus * 2; result[allie] += chelemBonus; for (let i = 0; i < nb; i++) if (i !== preneur && i !== allie) result[i] -= chelemBonus; }
    return result;
  }

  // 3 ou 4 joueurs
  result[preneur] = score * (nb - 1);
  for (let i = 0; i < nb; i++) if (i !== preneur) result[i] = -score;
  if (poigneePts > 0) {
    if (won) { result[preneur] += poigneePts * (nb - 1); for (let i = 0; i < nb; i++) if (i !== preneur) result[i] -= poigneePts; }
    else { result[preneur] -= poigneePts * (nb - 1); for (let i = 0; i < nb; i++) if (i !== preneur) result[i] += poigneePts; }
  }
  if (chelemBonus !== 0) { result[preneur] += chelemBonus * (nb - 1); for (let i = 0; i < nb; i++) if (i !== preneur) result[i] -= chelemBonus; }

  return result;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function TarotGame({ users, onDone }: { users: User[]; onDone: () => void }) {
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [rounds, setRounds] = useState<TarotRound[]>([]);
  const [setup, setSetup] = useState(true);
  const [entry, setEntry] = useState({
    preneur: 0, bid: "petite" as TarotBid, oudlers: 0, points: "",
    poignee: "none" as Poignee, poignee_player: 0,
    petit_au_bout: "none" as PetitAuBout, chelem: "none" as Chelem,
    allie: null as number | null,
  });

  const nb = players.length;
  const totals = rounds.reduce((acc, r) => acc.map((v, i) => v + r.scores[i]), Array(nb).fill(0));
  const [editTIdx, setEditTIdx] = useState<number | null>(null);
  const [editTVals, setEditTVals] = useState<string[]>([]);

  function startEditT(i: number) { setEditTVals(rounds[i].scores.map(String)); setEditTIdx(i); }
  function saveEditT(i: number) { setRounds((rs) => rs.map((r, j) => j !== i ? r : { ...r, scores: editTVals.map((v) => parseInt(v) || 0) })); setEditTIdx(null); }

  function addRound() {
    const pts = parseInt(entry.points);
    if (isNaN(pts)) return;
    const scores = calcTarot(entry.preneur, entry.bid, entry.oudlers, pts, nb, entry.poignee, entry.petit_au_bout, entry.chelem, entry.allie);
    setRounds((r) => [...r, { ...entry, points: pts, scores }]);
    setEntry((e) => ({ ...e, points: "", poignee: "none", petit_au_bout: "none", chelem: "none", allie: null }));
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

  const preview = entry.points !== "" ? (() => {
    const pts = parseInt(entry.points) || 0;
    if (isMisere) return { won: true, gain: pts * 10 * (nb - 1) };
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

          {/* Allié — seulement à 5 joueurs */}
          {nb === 5 && !isMisere && (
            <div>
              <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>Allié (joueur qui a la carte appelée)</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => setEntry((e) => ({ ...e, allie: null }))} style={{ padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: entry.allie === null ? "#6b7280" : "#f3f4f6", color: entry.allie === null ? "#fff" : "#374151" }}>Inconnu</button>
                {players.map((p, i) => i === entry.preneur ? null : (
                  <button key={p.id} onClick={() => setEntry((e) => ({ ...e, allie: i }))} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: entry.allie === i ? "#059669" : "#f3f4f6", color: entry.allie === i ? "#fff" : "#374151" }}>
                    <Avatar player={p} size={18} />{p.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contrat */}
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>Contrat</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["petite", "garde", "garde_sans", "garde_contre", "misere"] as TarotBid[]).map((b) => (
                <button key={b} onClick={() => setEntry((e) => ({ ...e, bid: b, points: (b === "misere") !== (e.bid === "misere") ? "" : e.points }))} style={{ padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: entry.bid === b ? (b === "misere" ? "#7c3aed" : "#4f46e5") : "#f3f4f6", color: entry.bid === b ? "#fff" : "#374151" }}>
                  {BID_LABELS[b]}
                </button>
              ))}
            </div>
            {isMisere && <div style={{ fontSize: 12, color: "#7c3aed", marginTop: 6 }}>Ni atout ni tête. Vaut 10 pts par misère déclarée. On peut cumuler 2 misères.</div>}
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

          {/* Points / Misères */}
          <div>
            {isMisere ? (
              <>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>Nombre de misères déclarées</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[1, 2].map((n) => (
                    <button key={n} onClick={() => setEntry((e) => ({ ...e, points: String(n) }))} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, background: entry.points === String(n) ? "#7c3aed" : "#f3f4f6", color: entry.points === String(n) ? "#fff" : "#374151" }}>
                      {n} misère{n > 1 ? "s" : ""} (+{n * 10} pts)
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Points du preneur (0–91)</label>
                <Input value={entry.points} onChange={(v) => setEntry((e) => ({ ...e, points: v }))} type="number" placeholder="ex: 54" />
              </>
            )}
          </div>

          {preview && (
            <div style={{ background: preview.won ? "#f0fdf4" : "#fff1f2", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: preview.won ? "#166534" : "#991b1b" }}>
              {preview.won ? "✅ Réussi" : "❌ Chuté"} — Preneur : {preview.gain > 0 ? "+" : ""}{preview.gain} pts (hors annonces)
            </div>
          )}

          {/* Annonces Tarot — masquées en misère */}
          {!isMisere && (
            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
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
                      {pg === "none" ? "Aucune" : `${POIGNEE_LABELS[pg]} (${POIGNEE_CARDS[pg][nb - 3]} cartes)`}
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
            </div>
          )}

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
