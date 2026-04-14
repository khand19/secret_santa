import { useState } from "react";
import { User } from "../api/client";
import { GamePlayer, saveResult } from "./types";
import { Card, Btn, Input, Avatar, PlayerPicker } from "./ui";
import { AnnoncesState, AnnoncesBlock, calcAnnonces } from "./annonces";

type CoincheMult = "normal" | "coinche" | "surcoinche";
type TrumpColor = "♠" | "♥" | "♦" | "♣" | "SA" | "TA";

interface CoincheRound {
  preneur: 0 | 1; bid: number; trump: TrumpColor; mult: CoincheMult;
  cartes: [number, number]; ann: [number, number];
}

const COINCHE_MULT: Record<CoincheMult, number> = { normal: 1, coinche: 2, surcoinche: 4 };
const BIDS = [80, 90, 100, 110, 120, 130, 140, 150, 160, 250];
const TRUMPS: TrumpColor[] = ["♠", "♥", "♦", "♣", "SA", "TA"];

export default function CoincheGame({ users, onDone }: { users: User[]; onDone: () => void }) {
  const [teams, setTeams] = useState<[GamePlayer[], GamePlayer[]]>([[], []]);
  const [names, setNames] = useState(["Nous", "Eux"]);
  const [rounds, setRounds] = useState<CoincheRound[]>([]);
  const [target, setTarget] = useState(3000);
  const [setup, setSetup] = useState(true);

  const [preneur, setPreneur] = useState<0 | 1>(0);
  const [bid, setBid] = useState(80);
  const [trump, setTrump] = useState<TrumpColor>("♥");
  const [mult, setMult] = useState<CoincheMult>("normal");
  const [cartes, setCartes] = useState(["", ""]);
  const [annonces, setAnnonces] = useState<[AnnoncesState, AnnoncesState]>([{ total: 0, belote: false }, { total: 0, belote: false }]);
  const [contreBid, setContreBid] = useState(0);
  const defense = (1 - preneur) as 0 | 1;

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
    const preneurWon = bid === 250 ? (preneur === 0 ? c0 === 162 : c1 === 162) : totalPreneur >= bid;
    const totalDefense = (preneur === 0 ? c1 + rawAnn.eux : c0 + rawAnn.nous);
    const defenseWon = contreBid > 0 && totalDefense >= contreBid;
    const won = defenseWon ? false : preneurWon;
    const enjeu = (contreBid > 0 ? Math.max(bid, contreBid) : bid) * COINCHE_MULT[mult];
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
    score0 = Math.round(score0 / 10) * 10;
    score1 = Math.round(score1 / 10) * 10;

    setRounds((r) => [...r, { preneur, bid, trump, mult, cartes: [c0, c1], ann: [score0, score1] }]);
    setCartes(["", ""]); setAnnonces([{ total: 0, belote: false }, { total: 0, belote: false }]);
    setMult("normal"); setContreBid(0);
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

          {/* Atout */}
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

          {/* Contre-annonce défense */}
          <div style={{ marginBottom: 12, background: "#fafaf9", borderRadius: 10, padding: "10px 12px" }}>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>
              Contre-annonce {names[defense]} <span style={{ color: "#9ca3af" }}>(optionnel)</span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              <button onClick={() => setContreBid(0)} style={{ padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: contreBid === 0 ? "#e5e7eb" : "#f3f4f6", color: "#374151" }}>Aucune</button>
              {BIDS.filter((b) => b > bid).map((b) => (
                <button key={b} onClick={() => setContreBid(b)} style={{ padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: contreBid === b ? "#dc2626" : "#f3f4f6", color: contreBid === b ? "#fff" : "#374151" }}>
                  {b === 250 ? "Capot" : b}
                </button>
              ))}
            </div>
            {contreBid > 0 && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>{names[defense]} doit atteindre {contreBid} pts pour gagner</div>}
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
