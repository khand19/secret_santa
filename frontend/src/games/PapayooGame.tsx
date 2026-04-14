import { useState } from "react";
import { User } from "../api/client";
import { GamePlayer, saveResult } from "./types";
import { Card, Btn, Input, Avatar, PlayerPicker, Scoreboard } from "./ui";

export default function PapayooGame({ users, onDone }: { users: User[]; onDone: () => void }) {
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
