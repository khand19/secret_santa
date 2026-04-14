import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type GameType = "belote" | "tarot" | "papayoo";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, ...style }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, style }: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = { border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 14, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, transition: "opacity 0.15s" };
  const variants = {
    primary:   { background: "#4f46e5", color: "#fff" },
    secondary: { background: "#f3f4f6", color: "#374151" },
    danger:    { background: "#fee2e2", color: "#991b1b" },
    ghost:     { background: "transparent", color: "#6b7280", border: "1px solid #e5e7eb" },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
}

function Input({ value, onChange, placeholder, type = "text", style }: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  style?: React.CSSProperties;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "7px 12px", fontSize: 14, width: "100%", boxSizing: "border-box", ...style }}
    />
  );
}

// ─── Scoreboard commun ────────────────────────────────────────────────────────

function Scoreboard({ players, scores, lowWins = false }: { players: string[]; scores: number[]; lowWins?: boolean }) {
  const sorted = [...players.map((p, i) => ({ name: p, score: scores[i] }))]
    .sort((a, b) => lowWins ? a.score - b.score : b.score - a.score);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {sorted.map((p, rank) => (
        <div key={p.name} style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 14px", borderRadius: 10,
          background: rank === 0 ? "#fefce8" : "#f9fafb",
          border: `1px solid ${rank === 0 ? "#fde68a" : "#e5e7eb"}`,
        }}>
          <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>
            {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `${rank + 1}.`}
          </span>
          <span style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>{p.name}</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: rank === 0 ? "#d97706" : "#374151" }}>{p.score}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BELOTE
// ═══════════════════════════════════════════════════════════════════════════════

interface BeloteRound { nous: number; eux: number; }

function BeloteGame() {
  const [teams, setTeams] = useState(["Nous", "Eux"]);
  const [rounds, setRounds] = useState<BeloteRound[]>([]);
  const [entry, setEntry] = useState({ nous: "", eux: "" });
  const [target, setTarget] = useState(1000);
  const [setup, setSetup] = useState(true);

  const totals = rounds.reduce((acc, r) => [acc[0] + r.nous, acc[1] + r.eux], [0, 0]);
  const winner = totals[0] >= target ? teams[0] : totals[1] >= target ? teams[1] : null;

  function addRound() {
    const n = parseInt(entry.nous) || 0;
    const e = parseInt(entry.eux) || 0;
    setRounds((r) => [...r, { nous: n, eux: e }]);
    setEntry({ nous: "", eux: "" });
  }

  function capot(teamIdx: number) {
    const r: BeloteRound = teamIdx === 0 ? { nous: 252, eux: 0 } : { nous: 0, eux: 252 };
    setRounds((prev) => [...prev, r]);
    setEntry({ nous: "", eux: "" });
  }

  if (setup) {
    return (
      <Card>
        <h2 style={{ margin: "0 0 20px", fontSize: 18 }}>⚙️ Configuration Belote</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {["Équipe 1", "Équipe 2"].map((label, i) => (
            <div key={i}>
              <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>{label}</label>
              <Input value={teams[i]} onChange={(v) => setTeams((t) => t.map((x, j) => j === i ? v : x))} placeholder={label} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>Score cible</label>
            <Input value={target} onChange={(v) => setTarget(parseInt(v) || 1000)} type="number" />
          </div>
          <Btn onClick={() => setSetup(false)}>Commencer →</Btn>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Scores */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {teams.map((t, i) => (
          <Card key={i} style={{ textAlign: "center", background: totals[i] >= target ? "#fefce8" : "#fff" }}>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{t}</div>
            <div style={{ fontSize: 40, fontWeight: 800, color: "#4f46e5" }}>{totals[i]}</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>/ {target}</div>
          </Card>
        ))}
      </div>

      {winner && (
        <Card style={{ textAlign: "center", background: "#f0fdf4", border: "1px solid #86efac" }}>
          <div style={{ fontSize: 24 }}>🏆</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{winner} gagne la partie !</div>
        </Card>
      )}

      {/* Saisie manche */}
      {!winner && (
        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>Manche {rounds.length + 1}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>{teams[0]}</label>
              <Input value={entry.nous} onChange={(v) => setEntry((e) => ({ ...e, nous: v }))} type="number" placeholder="0–162" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>{teams[1]}</label>
              <Input value={entry.eux} onChange={(v) => setEntry((e) => ({ ...e, eux: v }))} type="number" placeholder="0–162" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={addRound}>+ Ajouter la manche</Btn>
            <Btn variant="ghost" onClick={() => capot(0)}>Capot {teams[0]}</Btn>
            <Btn variant="ghost" onClick={() => capot(1)}>Capot {teams[1]}</Btn>
          </div>
        </Card>
      )}

      {/* Historique */}
      {rounds.length > 0 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Historique ({rounds.length} manches)</h3>
            <Btn variant="danger" onClick={() => { setRounds([]); }} style={{ padding: "4px 10px", fontSize: 12 }}>Réinitialiser</Btn>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `auto 1fr 1fr`, gap: "4px 12px", fontSize: 13 }}>
            <div style={{ color: "#9ca3af", fontWeight: 600 }}>#</div>
            <div style={{ color: "#9ca3af", fontWeight: 600 }}>{teams[0]}</div>
            <div style={{ color: "#9ca3af", fontWeight: 600 }}>{teams[1]}</div>
            {rounds.map((r, i) => (
              <>
                <div key={`n-${i}`} style={{ color: "#9ca3af" }}>{i + 1}</div>
                <div key={`a-${i}`} style={{ fontWeight: 600 }}>{r.nous}</div>
                <div key={`b-${i}`} style={{ fontWeight: 600 }}>{r.eux}</div>
              </>
            ))}
          </div>
        </Card>
      )}

      <Btn variant="ghost" onClick={() => { setSetup(true); setRounds([]); setEntry({ nous: "", eux: "" }); }}>
        ← Nouvelle partie
      </Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAROT
// ═══════════════════════════════════════════════════════════════════════════════

type TarotBid = "petite" | "garde" | "garde_sans" | "garde_contre";
interface TarotRound {
  preneur: number;
  bid: TarotBid;
  oudlers: number;
  points: number;
  scores: number[];
}

const BID_LABELS: Record<TarotBid, string> = { petite: "Petite", garde: "Garde", garde_sans: "Garde sans", garde_contre: "Garde contre" };
const BID_MULT: Record<TarotBid, number> = { petite: 1, garde: 2, garde_sans: 4, garde_contre: 6 };
const OUDLER_TARGET = [56, 51, 41, 36];

function calcTarot(preneur: number, bid: TarotBid, oudlers: number, points: number, nbPlayers: number): number[] {
  const target = OUDLER_TARGET[oudlers];
  const diff = points - target;
  const won = diff >= 0;
  const base = (25 + Math.abs(diff)) * BID_MULT[bid];
  const score = won ? base : -base;
  const result = Array(nbPlayers).fill(0);
  result[preneur] = score * (nbPlayers - 1);
  for (let i = 0; i < nbPlayers; i++) {
    if (i !== preneur) result[i] = -score;
  }
  return result;
}

function TarotGame() {
  const [players, setPlayers] = useState(["", "", "", ""]);
  const [nbPlayers, setNbPlayers] = useState(4);
  const [rounds, setRounds] = useState<TarotRound[]>([]);
  const [setup, setSetup] = useState(true);
  const [entry, setEntry] = useState<{ preneur: number; bid: TarotBid; oudlers: number; points: string }>({ preneur: 0, bid: "petite", oudlers: 0, points: "" });

  const totals = rounds.reduce(
    (acc, r) => acc.map((v, i) => v + r.scores[i]),
    Array(nbPlayers).fill(0),
  );

  const activePlayers = players.slice(0, nbPlayers).map((p, i) => p || `Joueur ${i + 1}`);

  function addRound() {
    const pts = parseInt(entry.points);
    if (isNaN(pts)) return;
    const scores = calcTarot(entry.preneur, entry.bid, entry.oudlers, pts, nbPlayers);
    setRounds((r) => [...r, { ...entry, points: pts, scores }]);
    setEntry((e) => ({ ...e, points: "" }));
  }

  if (setup) {
    return (
      <Card>
        <h2 style={{ margin: "0 0 20px", fontSize: 18 }}>⚙️ Configuration Tarot</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 6 }}>Nombre de joueurs</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[3, 4, 5].map((n) => (
                <button key={n} onClick={() => setNbPlayers(n)} style={{
                  padding: "6px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
                  background: nbPlayers === n ? "#4f46e5" : "#f3f4f6",
                  color: nbPlayers === n ? "#fff" : "#374151",
                }}>{n}</button>
              ))}
            </div>
          </div>
          {Array.from({ length: nbPlayers }).map((_, i) => (
            <div key={i}>
              <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>Joueur {i + 1}</label>
              <Input value={players[i]} onChange={(v) => setPlayers((p) => p.map((x, j) => j === i ? v : x))} placeholder={`Joueur ${i + 1}`} />
            </div>
          ))}
          <Btn onClick={() => setSetup(false)}>Commencer →</Btn>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Scores */}
      <Scoreboard players={activePlayers} scores={totals} />

      {/* Saisie */}
      <Card>
        <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>Donne {rounds.length + 1}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Preneur */}
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Preneur</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {activePlayers.map((p, i) => (
                <button key={i} onClick={() => setEntry((e) => ({ ...e, preneur: i }))} style={{
                  padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  background: entry.preneur === i ? "#4f46e5" : "#f3f4f6",
                  color: entry.preneur === i ? "#fff" : "#374151",
                }}>{p}</button>
              ))}
            </div>
          </div>
          {/* Contrat */}
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Contrat</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["petite", "garde", "garde_sans", "garde_contre"] as TarotBid[]).map((b) => (
                <button key={b} onClick={() => setEntry((e) => ({ ...e, bid: b }))} style={{
                  padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  background: entry.bid === b ? "#4f46e5" : "#f3f4f6",
                  color: entry.bid === b ? "#fff" : "#374151",
                }}>{BID_LABELS[b]}</button>
              ))}
            </div>
          </div>
          {/* Bouts */}
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
              Bouts (objectif : {OUDLER_TARGET[entry.oudlers]} pts)
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              {[0, 1, 2, 3].map((n) => (
                <button key={n} onClick={() => setEntry((e) => ({ ...e, oudlers: n }))} style={{
                  width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700,
                  background: entry.oudlers === n ? "#4f46e5" : "#f3f4f6",
                  color: entry.oudlers === n ? "#fff" : "#374151",
                }}>{n}</button>
              ))}
            </div>
          </div>
          {/* Points */}
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Points réalisés par le preneur</label>
            <Input value={entry.points} onChange={(v) => setEntry((e) => ({ ...e, points: v }))} type="number" placeholder="0–91" />
          </div>
          {entry.points !== "" && (
            <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#166534" }}>
              {(() => {
                const pts = parseInt(entry.points) || 0;
                const target = OUDLER_TARGET[entry.oudlers];
                const diff = pts - target;
                const won = diff >= 0;
                const base = (25 + Math.abs(diff)) * BID_MULT[entry.bid];
                return `${won ? "✅ Réussi" : "❌ Chuté"} — Preneur : ${won ? "+" : ""}${won ? base * (nbPlayers - 1) : -base * (nbPlayers - 1)} pts`;
              })()}
            </div>
          )}
          <Btn onClick={addRound} disabled={entry.points === ""}>+ Valider la donne</Btn>
        </div>
      </Card>

      {/* Historique */}
      {rounds.length > 0 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Historique ({rounds.length} donnes)</h3>
            <Btn variant="danger" onClick={() => setRounds([])} style={{ padding: "4px 10px", fontSize: 12 }}>Réinitialiser</Btn>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: "#9ca3af", textAlign: "left" }}>
                  <th style={{ padding: "4px 8px" }}>#</th>
                  <th style={{ padding: "4px 8px" }}>Preneur</th>
                  <th style={{ padding: "4px 8px" }}>Contrat</th>
                  {activePlayers.map((p) => <th key={p} style={{ padding: "4px 8px" }}>{p}</th>)}
                </tr>
              </thead>
              <tbody>
                {rounds.map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "4px 8px", color: "#9ca3af" }}>{i + 1}</td>
                    <td style={{ padding: "4px 8px", fontWeight: 600 }}>{activePlayers[r.preneur]}</td>
                    <td style={{ padding: "4px 8px" }}>{BID_LABELS[r.bid]}</td>
                    {r.scores.map((s, j) => (
                      <td key={j} style={{ padding: "4px 8px", fontWeight: 600, color: s > 0 ? "#15803d" : s < 0 ? "#dc2626" : "#9ca3af" }}>
                        {s > 0 ? "+" : ""}{s}
                      </td>
                    ))}
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
// PAPAYOO
// ═══════════════════════════════════════════════════════════════════════════════

interface PapayooRound { scores: number[]; }

function PapayooGame() {
  const [players, setPlayers] = useState(["", "", "", ""]);
  const [nbPlayers, setNbPlayers] = useState(4);
  const [rounds, setRounds] = useState<PapayooRound[]>([]);
  const [setup, setSetup] = useState(true);
  const [entry, setEntry] = useState<string[]>(["", "", "", "", "", ""]);
  const [target, setTarget] = useState(200);

  const totals = rounds.reduce(
    (acc, r) => acc.map((v, i) => v + r.scores[i]),
    Array(nbPlayers).fill(0),
  );

  const activePlayers = players.slice(0, nbPlayers).map((p, i) => p || `Joueur ${i + 1}`);
  const loser = totals.some((t) => t >= target) ? activePlayers[totals.indexOf(Math.max(...totals))] : null;

  function addRound() {
    const scores = entry.slice(0, nbPlayers).map((v) => parseInt(v) || 0);
    setRounds((r) => [...r, { scores }]);
    setEntry(["", "", "", "", "", ""]);
  }

  if (setup) {
    return (
      <Card>
        <h2 style={{ margin: "0 0 20px", fontSize: 18 }}>⚙️ Configuration Papayoo</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 6 }}>Nombre de joueurs</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[3, 4, 5, 6].map((n) => (
                <button key={n} onClick={() => setNbPlayers(n)} style={{
                  padding: "6px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
                  background: nbPlayers === n ? "#4f46e5" : "#f3f4f6",
                  color: nbPlayers === n ? "#fff" : "#374151",
                }}>{n}</button>
              ))}
            </div>
          </div>
          {Array.from({ length: nbPlayers }).map((_, i) => (
            <div key={i}>
              <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>Joueur {i + 1}</label>
              <Input value={players[i]} onChange={(v) => setPlayers((p) => p.map((x, j) => j === i ? v : x))} placeholder={`Joueur ${i + 1}`} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>Score éliminatoire</label>
            <Input value={target} onChange={(v) => setTarget(parseInt(v) || 200)} type="number" />
          </div>
          <Btn onClick={() => setSetup(false)}>Commencer →</Btn>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Scores */}
      <Scoreboard players={activePlayers} scores={totals} lowWins />

      {loser && (
        <Card style={{ textAlign: "center", background: "#fff1f2", border: "1px solid #fecdd3" }}>
          <div style={{ fontSize: 24 }}>💀</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{loser} est éliminé !</div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Score dépassant {target} pts</div>
        </Card>
      )}

      {/* Saisie manche */}
      <Card>
        <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>Manche {rounds.length + 1}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {activePlayers.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 90, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{p}</span>
              <Input value={entry[i]} onChange={(v) => setEntry((e) => e.map((x, j) => j === i ? v : x))} type="number" placeholder="Points" />
            </div>
          ))}
          <Btn onClick={addRound}>+ Ajouter la manche</Btn>
        </div>
      </Card>

      {/* Historique */}
      {rounds.length > 0 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Historique ({rounds.length} manches)</h3>
            <Btn variant="danger" onClick={() => setRounds([])} style={{ padding: "4px 10px", fontSize: 12 }}>Réinitialiser</Btn>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: "#9ca3af", textAlign: "left" }}>
                  <th style={{ padding: "4px 8px" }}>#</th>
                  {activePlayers.map((p) => <th key={p} style={{ padding: "4px 8px" }}>{p}</th>)}
                </tr>
              </thead>
              <tbody>
                {rounds.map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "4px 8px", color: "#9ca3af" }}>{i + 1}</td>
                    {r.scores.map((s, j) => (
                      <td key={j} style={{ padding: "4px 8px", fontWeight: 600 }}>{s}</td>
                    ))}
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid #e5e7eb", fontWeight: 800 }}>
                  <td style={{ padding: "4px 8px", color: "#9ca3af" }}>∑</td>
                  {totals.map((t, i) => (
                    <td key={i} style={{ padding: "4px 8px", color: t >= target ? "#dc2626" : "#374151" }}>{t}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Btn variant="ghost" onClick={() => { setSetup(true); setRounds([]); setEntry(["", "", "", "", "", ""]); }}>
        ← Nouvelle partie
      </Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

const GAMES: { id: GameType; label: string; icon: string; desc: string }[] = [
  { id: "belote",   label: "Belote",   icon: "🃏", desc: "2 équipes · 162 pts par manche" },
  { id: "tarot",    label: "Tarot",    icon: "🔮", desc: "3 à 5 joueurs · Calcul automatique" },
  { id: "papayoo",  label: "Papayoo",  icon: "🃏", desc: "3 à 6 joueurs · Le moins de points gagne" },
];

export default function GamesPage() {
  const [selected, setSelected] = useState<GameType | null>(null);

  if (selected === "belote") return (
    <div style={{ maxWidth: 560, margin: "32px auto", padding: "0 16px", fontFamily: "sans-serif" }}>
      <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14, marginBottom: 16, padding: 0 }}>← Retour</button>
      <h1 style={{ margin: "0 0 20px", fontSize: 22 }}>🃏 Belote</h1>
      <BeloteGame />
    </div>
  );

  if (selected === "tarot") return (
    <div style={{ maxWidth: 560, margin: "32px auto", padding: "0 16px", fontFamily: "sans-serif" }}>
      <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14, marginBottom: 16, padding: 0 }}>← Retour</button>
      <h1 style={{ margin: "0 0 20px", fontSize: 22 }}>🔮 Tarot</h1>
      <TarotGame />
    </div>
  );

  if (selected === "papayoo") return (
    <div style={{ maxWidth: 560, margin: "32px auto", padding: "0 16px", fontFamily: "sans-serif" }}>
      <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14, marginBottom: 16, padding: 0 }}>← Retour</button>
      <h1 style={{ margin: "0 0 20px", fontSize: 22 }}>🃏 Papayoo</h1>
      <PapayooGame />
    </div>
  );

  return (
    <div style={{ maxWidth: 560, margin: "32px auto", padding: "0 16px", fontFamily: "sans-serif" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>🎲 Jeux</h1>
      <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: 14 }}>Sélectionne un jeu pour commencer à compter les points.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {GAMES.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelected(g.id)}
            style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "18px 20px", border: "1px solid #e5e7eb", borderRadius: 12,
              background: "#fff", cursor: "pointer", textAlign: "left",
              transition: "box-shadow 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
          >
            <span style={{ fontSize: 32 }}>{g.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{g.label}</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{g.desc}</div>
            </div>
            <span style={{ marginLeft: "auto", color: "#9ca3af", fontSize: 18 }}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
