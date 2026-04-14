import { useState } from "react";
import { User } from "../api/client";
import { GamePlayer, saveResult } from "./types";
import { Card, Btn, Input, Avatar, PlayerPicker } from "./ui";
import { AnnoncesState, AnnoncesBlock, calcAnnonces } from "./annonces";

interface BeloteRound { nous_cartes: number; eux_cartes: number; nous_ann: number; eux_ann: number; }

export default function BeloteGame({ users, onDone }: { users: User[]; onDone: () => void }) {
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

  const previewAnn = calcAnnonces(annonces[0], annonces[1]);
  const previewNous = (parseInt(cartes[0]) || 0) + previewAnn.nous;
  const previewEux = (parseInt(cartes[1]) || 0) + previewAnn.eux;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {[0, 1].map((i) => (
              <div key={i}>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Cartes {names[i]}</label>
                <Input value={cartes[i]} onChange={(v) => setCarteWithMirror(i, v)} type="number" placeholder="0–160" />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {[0, 1].map((i) => (
              <AnnoncesBlock key={i} label={`Annonces ${names[i]}`} value={annonces[i]}
                onChange={(v) => setAnnonces((a) => a.map((x, j) => j === i ? v : x) as [AnnoncesState, AnnoncesState])} />
            ))}
          </div>
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
