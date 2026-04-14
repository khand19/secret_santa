import { useState, useEffect } from "react";
import { usersApi, User } from "../api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type GameType = "belote" | "tarot" | "papayoo" | "stats";

interface GamePlayer { id: number; name: string; avatar: string | null; }

interface GameResult {
  id: string;
  game: GameType;
  date: string;
  players: GamePlayer[];
  scores: number[];
  lowWins: boolean;
}

const STORAGE_KEY = "games_history_v1";

function loadHistory(): GameResult[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function saveResult(result: GameResult) {
  const history = loadHistory();
  history.unshift(result);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 200)));
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, ...style }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, style }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean; style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = { border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 14, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 };
  const variants = {
    primary:   { background: "#4f46e5", color: "#fff" },
    secondary: { background: "#f3f4f6", color: "#374151" },
    danger:    { background: "#fee2e2", color: "#991b1b" },
    ghost:     { background: "transparent", color: "#6b7280", border: "1px solid #e5e7eb" } as React.CSSProperties,
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
}

function Input({ value, onChange, placeholder, type = "text", style }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; style?: React.CSSProperties;
}) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "7px 12px", fontSize: 14, width: "100%", boxSizing: "border-box", ...style }} />
  );
}

// ─── Avatar joueur ────────────────────────────────────────────────────────────

function Avatar({ player, size = 32 }: { player: GamePlayer; size?: number }) {
  if (player.avatar) {
    return <img src={player.avatar} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, color: "#fff", fontWeight: 700, flexShrink: 0 }}>
      {player.name[0]?.toUpperCase()}
    </div>
  );
}

// ─── Sélecteur de joueurs ─────────────────────────────────────────────────────

function PlayerPicker({ users, selected, onChange, min, max }: {
  users: User[]; selected: GamePlayer[]; onChange: (p: GamePlayer[]) => void; min: number; max: number;
}) {
  function toggle(user: User) {
    const name = user.nickname || `${user.first_name} ${user.last_name}`;
    const player: GamePlayer = { id: user.id, name, avatar: user.profile_image };
    const already = selected.find((p) => p.id === user.id);
    if (already) {
      onChange(selected.filter((p) => p.id !== user.id));
    } else if (selected.length < max) {
      onChange([...selected, player]);
    }
  }

  return (
    <div>
      <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 8 }}>
        Joueurs ({selected.length}/{max} · min {min})
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {users.map((u) => {
          const name = u.nickname || `${u.first_name} ${u.last_name}`;
          const isSelected = selected.some((p) => p.id === u.id);
          const isDisabled = !isSelected && selected.length >= max;
          return (
            <button key={u.id} onClick={() => toggle(u)} disabled={isDisabled}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: 10, border: "none", cursor: isDisabled ? "not-allowed" : "pointer",
                background: isSelected ? "#eef2ff" : "#f9fafb",
                opacity: isDisabled ? 0.4 : 1,
                textAlign: "left",
              }}>
              {u.profile_image
                ? <img src={u.profile_image} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />
                : <div style={{ width: 34, height: 34, borderRadius: "50%", background: isSelected ? "#4f46e5" : "#d1d5db", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 700 }}>{name[0]}</div>
              }
              <span style={{ fontWeight: 600, fontSize: 14, color: isSelected ? "#4f46e5" : "#374151" }}>{name}</span>
              {isSelected && <span style={{ marginLeft: "auto", color: "#4f46e5", fontSize: 16 }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Scoreboard ───────────────────────────────────────────────────────────────

function Scoreboard({ players, scores, lowWins = false }: { players: GamePlayer[]; scores: number[]; lowWins?: boolean }) {
  const sorted = [...players.map((p, i) => ({ player: p, score: scores[i] }))]
    .sort((a, b) => lowWins ? a.score - b.score : b.score - a.score);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {sorted.map((p, rank) => (
        <div key={p.player.id} style={{
          display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10,
          background: rank === 0 ? "#fefce8" : "#f9fafb",
          border: `1px solid ${rank === 0 ? "#fde68a" : "#e5e7eb"}`,
        }}>
          <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>
            {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `${rank + 1}.`}
          </span>
          <Avatar player={p.player} size={32} />
          <span style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>{p.player.name}</span>
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

function BeloteGame({ users, onDone }: { users: User[]; onDone: () => void }) {
  const [teams, setTeams] = useState<[GamePlayer[], GamePlayer[]]>([[], []]);
  const [rounds, setRounds] = useState<BeloteRound[]>([]);
  const [entry, setEntry] = useState({ nous: "", eux: "" });
  const [target, setTarget] = useState(1000);
  const [setup, setSetup] = useState(true);
  const [teamNames, setTeamNames] = useState(["Nous", "Eux"]);

  const totals = rounds.reduce((acc, r) => [acc[0] + r.nous, acc[1] + r.eux], [0, 0]);
  const winner = totals[0] >= target ? 0 : totals[1] >= target ? 1 : null;

  function addRound() {
    const n = parseInt(entry.nous) || 0;
    const e = parseInt(entry.eux) || 0;
    setRounds((r) => [...r, { nous: n, eux: e }]);
    setEntry({ nous: "", eux: "" });
  }

  function capot(teamIdx: number) {
    setRounds((prev) => [...prev, teamIdx === 0 ? { nous: 252, eux: 0 } : { nous: 0, eux: 252 }]);
  }

  function finish() {
    const allPlayers = [...teams[0], ...teams[1]];
    const scores = allPlayers.map((p) => teams[0].includes(p) ? totals[0] : totals[1]);
    saveResult({ id: Date.now().toString(), game: "belote", date: new Date().toISOString(), players: allPlayers, scores, lowWins: false });
    onDone();
  }

  if (setup) {
    return (
      <Card>
        <h2 style={{ margin: "0 0 20px", fontSize: 18 }}>⚙️ Configuration Belote</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {[0, 1].map((i) => (
            <div key={i}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Input value={teamNames[i]} onChange={(v) => setTeamNames((t) => t.map((x, j) => j === i ? v : x) as [string, string])}
                  placeholder={`Équipe ${i + 1}`} style={{ width: 140 }} />
                <span style={{ fontSize: 13, color: "#9ca3af" }}>({teams[i].length} joueur{teams[i].length > 1 ? "s" : ""})</span>
              </div>
              <PlayerPicker users={users.filter((u) => !teams[1 - i].some((p) => p.id === u.id))}
                selected={teams[i]}
                onChange={(p) => setTeams((t) => t.map((x, j) => j === i ? p : x) as [GamePlayer[], GamePlayer[]])}
                min={1} max={4} />
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
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[0, 1].map((i) => (
          <Card key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{teamNames[i]}</div>
            <div style={{ display: "flex", justifyContent: "center", gap: -6, marginBottom: 6 }}>
              {teams[i].map((p) => <Avatar key={p.id} player={p} size={28} />)}
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, color: "#4f46e5" }}>{totals[i]}</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>/ {target}</div>
          </Card>
        ))}
      </div>

      {winner !== null && (
        <Card style={{ textAlign: "center", background: "#f0fdf4", border: "1px solid #86efac" }}>
          <div style={{ fontSize: 24 }}>🏆</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{teamNames[winner]} gagne !</div>
          <Btn onClick={finish} style={{ marginTop: 12 }}>Enregistrer et terminer</Btn>
        </Card>
      )}

      {winner === null && (
        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>Manche {rounds.length + 1}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {[0, 1].map((i) => (
              <div key={i}>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>{teamNames[i]}</label>
                <Input value={i === 0 ? entry.nous : entry.eux}
                  onChange={(v) => setEntry((e) => i === 0 ? { ...e, nous: v } : { ...e, eux: v })}
                  type="number" placeholder="0–162" />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={addRound}>+ Ajouter la manche</Btn>
            <Btn variant="ghost" onClick={() => capot(0)}>Capot {teamNames[0]}</Btn>
            <Btn variant="ghost" onClick={() => capot(1)}>Capot {teamNames[1]}</Btn>
          </div>
        </Card>
      )}

      {rounds.length > 0 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Historique ({rounds.length} manches)</h3>
            <Btn variant="danger" onClick={() => setRounds([])} style={{ padding: "4px 10px", fontSize: 12 }}>Réinitialiser</Btn>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: "4px 12px", fontSize: 13 }}>
            <span style={{ color: "#9ca3af" }}>#</span>
            <span style={{ color: "#9ca3af" }}>{teamNames[0]}</span>
            <span style={{ color: "#9ca3af" }}>{teamNames[1]}</span>
            {rounds.map((r, i) => (
              <>
                <span key={`n${i}`} style={{ color: "#9ca3af" }}>{i + 1}</span>
                <span key={`a${i}`} style={{ fontWeight: 600 }}>{r.nous}</span>
                <span key={`b${i}`} style={{ fontWeight: 600 }}>{r.eux}</span>
              </>
            ))}
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

type TarotBid = "petite" | "garde" | "garde_sans" | "garde_contre";
interface TarotRound { preneur: number; bid: TarotBid; oudlers: number; points: number; scores: number[]; }

const BID_LABELS: Record<TarotBid, string> = { petite: "Petite", garde: "Garde", garde_sans: "G. sans", garde_contre: "G. contre" };
const BID_MULT: Record<TarotBid, number> = { petite: 1, garde: 2, garde_sans: 4, garde_contre: 6 };
const OUDLER_TARGET = [56, 51, 41, 36];

function calcTarot(preneur: number, bid: TarotBid, oudlers: number, points: number, nb: number): number[] {
  const diff = points - OUDLER_TARGET[oudlers];
  const base = (25 + Math.abs(diff)) * BID_MULT[bid];
  const score = diff >= 0 ? base : -base;
  const result = Array(nb).fill(0);
  result[preneur] = score * (nb - 1);
  for (let i = 0; i < nb; i++) if (i !== preneur) result[i] = -score;
  return result;
}

function TarotGame({ users, onDone }: { users: User[]; onDone: () => void }) {
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [rounds, setRounds] = useState<TarotRound[]>([]);
  const [setup, setSetup] = useState(true);
  const [entry, setEntry] = useState<{ preneur: number; bid: TarotBid; oudlers: number; points: string }>({ preneur: 0, bid: "petite", oudlers: 0, points: "" });

  const nb = players.length;
  const totals = rounds.reduce((acc, r) => acc.map((v, i) => v + r.scores[i]), Array(nb).fill(0));

  function addRound() {
    const pts = parseInt(entry.points);
    if (isNaN(pts)) return;
    const scores = calcTarot(entry.preneur, entry.bid, entry.oudlers, pts, nb);
    setRounds((r) => [...r, { ...entry, points: pts, scores }]);
    setEntry((e) => ({ ...e, points: "" }));
  }

  function finish() {
    saveResult({ id: Date.now().toString(), game: "tarot", date: new Date().toISOString(), players, scores: totals, lowWins: false });
    onDone();
  }

  if (setup) {
    return (
      <Card>
        <h2 style={{ margin: "0 0 20px", fontSize: 18 }}>⚙️ Configuration Tarot</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <PlayerPicker users={users} selected={players} onChange={setPlayers} min={3} max={5} />
          <Btn onClick={() => setSetup(false)} disabled={players.length < 3}>
            Commencer avec {players.length} joueurs →
          </Btn>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Scoreboard players={players} scores={totals} />

      <Card>
        <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>Donne {rounds.length + 1}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>Preneur</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {players.map((p, i) => (
                <button key={p.id} onClick={() => setEntry((e) => ({ ...e, preneur: i }))} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  background: entry.preneur === i ? "#4f46e5" : "#f3f4f6",
                  color: entry.preneur === i ? "#fff" : "#374151",
                }}>
                  <Avatar player={p} size={20} />
                  {p.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>Contrat</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["petite", "garde", "garde_sans", "garde_contre"] as TarotBid[]).map((b) => (
                <button key={b} onClick={() => setEntry((e) => ({ ...e, bid: b }))} style={{
                  padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  background: entry.bid === b ? "#4f46e5" : "#f3f4f6",
                  color: entry.bid === b ? "#fff" : "#374151",
                }}>{BID_LABELS[b]}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>
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
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Points du preneur</label>
            <Input value={entry.points} onChange={(v) => setEntry((e) => ({ ...e, points: v }))} type="number" placeholder="0–91" />
          </div>
          {entry.points !== "" && (() => {
            const pts = parseInt(entry.points) || 0;
            const diff = pts - OUDLER_TARGET[entry.oudlers];
            const won = diff >= 0;
            const base = (25 + Math.abs(diff)) * BID_MULT[entry.bid];
            return (
              <div style={{ background: won ? "#f0fdf4" : "#fff1f2", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: won ? "#166534" : "#991b1b" }}>
                {won ? "✅ Réussi" : "❌ Chuté"} — Preneur : {won ? "+" : ""}{won ? base * (nb - 1) : -base * (nb - 1)} pts
              </div>
            );
          })()}
          <Btn onClick={addRound} disabled={entry.points === ""}>+ Valider la donne</Btn>
        </div>
      </Card>

      {rounds.length > 0 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Historique ({rounds.length} donnes)</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="danger" onClick={() => setRounds([])} style={{ padding: "4px 10px", fontSize: 12 }}>Réinitialiser</Btn>
              <Btn variant="secondary" onClick={finish} style={{ padding: "4px 10px", fontSize: 12 }}>Terminer et sauvegarder</Btn>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: "#9ca3af" }}>
                  <th style={{ padding: "4px 6px", textAlign: "left" }}>#</th>
                  {players.map((p) => <th key={p.id} style={{ padding: "4px 6px", textAlign: "left" }}>{p.name.split(" ")[0]}</th>)}
                </tr>
              </thead>
              <tbody>
                {rounds.map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "4px 6px", color: "#9ca3af" }}>{i + 1}</td>
                    {r.scores.map((s, j) => (
                      <td key={j} style={{ padding: "4px 6px", fontWeight: 600, color: s > 0 ? "#15803d" : s < 0 ? "#dc2626" : "#9ca3af" }}>
                        {s > 0 ? "+" : ""}{s}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid #e5e7eb", fontWeight: 800 }}>
                  <td style={{ padding: "4px 6px", color: "#9ca3af" }}>∑</td>
                  {totals.map((t, i) => (
                    <td key={i} style={{ padding: "4px 6px", color: t > 0 ? "#15803d" : t < 0 ? "#dc2626" : "#9ca3af" }}>
                      {t > 0 ? "+" : ""}{t}
                    </td>
                  ))}
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

interface PapayooRound { scores: number[]; }

function PapayooGame({ users, onDone }: { users: User[]; onDone: () => void }) {
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [rounds, setRounds] = useState<PapayooRound[]>([]);
  const [setup, setSetup] = useState(true);
  const [entry, setEntry] = useState<string[]>(Array(6).fill(""));
  const [target, setTarget] = useState(200);

  const nb = players.length;
  const totals = rounds.reduce((acc, r) => acc.map((v, i) => v + r.scores[i]), Array(nb).fill(0));
  const loserIdx = totals.some((t) => t >= target) ? totals.indexOf(Math.max(...totals)) : null;

  function addRound() {
    const scores = entry.slice(0, nb).map((v) => parseInt(v) || 0);
    setRounds((r) => [...r, { scores }]);
    setEntry(Array(6).fill(""));
  }

  function finish() {
    saveResult({ id: Date.now().toString(), game: "papayoo", date: new Date().toISOString(), players, scores: totals, lowWins: true });
    onDone();
  }

  if (setup) {
    return (
      <Card>
        <h2 style={{ margin: "0 0 20px", fontSize: 18 }}>⚙️ Configuration Papayoo</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <PlayerPicker users={users} selected={players} onChange={setPlayers} min={3} max={6} />
          <div>
            <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>Score éliminatoire</label>
            <Input value={target} onChange={(v) => setTarget(parseInt(v) || 200)} type="number" style={{ width: 120 }} />
          </div>
          <Btn onClick={() => setSetup(false)} disabled={players.length < 3}>
            Commencer avec {players.length} joueurs →
          </Btn>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Scoreboard players={players} scores={totals} lowWins />

      {loserIdx !== null && (
        <Card style={{ textAlign: "center", background: "#fff1f2", border: "1px solid #fecdd3" }}>
          <div style={{ fontSize: 24 }}>💀</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{players[loserIdx].name} est éliminé !</div>
          <Btn onClick={finish} style={{ marginTop: 12 }}>Enregistrer et terminer</Btn>
        </Card>
      )}

      <Card>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Manche {rounds.length + 1}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {players.map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar player={p} size={28} />
              <span style={{ width: 80, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{p.name.split(" ")[0]}</span>
              <Input value={entry[i]} onChange={(v) => setEntry((e) => e.map((x, j) => j === i ? v : x))} type="number" placeholder="pts" />
            </div>
          ))}
          <Btn onClick={addRound}>+ Ajouter la manche</Btn>
        </div>
      </Card>

      {rounds.length > 0 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Historique ({rounds.length} manches)</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="danger" onClick={() => setRounds([])} style={{ padding: "4px 10px", fontSize: 12 }}>Réinitialiser</Btn>
              <Btn variant="secondary" onClick={finish} style={{ padding: "4px 10px", fontSize: 12 }}>Terminer et sauvegarder</Btn>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: "#9ca3af" }}>
                  <th style={{ padding: "4px 6px", textAlign: "left" }}>#</th>
                  {players.map((p) => <th key={p.id} style={{ padding: "4px 6px", textAlign: "left" }}>{p.name.split(" ")[0]}</th>)}
                </tr>
              </thead>
              <tbody>
                {rounds.map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "4px 6px", color: "#9ca3af" }}>{i + 1}</td>
                    {r.scores.map((s, j) => <td key={j} style={{ padding: "4px 6px", fontWeight: 600 }}>{s}</td>)}
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid #e5e7eb", fontWeight: 800 }}>
                  <td style={{ padding: "4px 6px", color: "#9ca3af" }}>∑</td>
                  {totals.map((t, i) => (
                    <td key={i} style={{ padding: "4px 6px", color: t >= target ? "#dc2626" : "#374151" }}>{t}</td>
                  ))}
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
// STATISTIQUES
// ═══════════════════════════════════════════════════════════════════════════════

const GAME_LABELS: Record<string, string> = { belote: "🃏 Belote", tarot: "🔮 Tarot", papayoo: "🃏 Papayoo" };

function StatsPage({ users }: { users: User[] }) {
  const history = loadHistory();
  const [filterGame, setFilterGame] = useState<string>("all");
  const [filterPlayer, setFilterPlayer] = useState<number | "all">("all");

  const filtered = history.filter((r) => {
    if (filterGame !== "all" && r.game !== filterGame) return false;
    if (filterPlayer !== "all" && !r.players.some((p) => p.id === filterPlayer)) return false;
    return true;
  });

  // Stats par joueur
  const playerStats: Record<number, { name: string; avatar: string | null; games: number; wins: number; totalScore: number }> = {};

  filtered.forEach((r) => {
    const winnerScore = r.lowWins ? Math.min(...r.scores) : Math.max(...r.scores);
    r.players.forEach((p, i) => {
      if (!playerStats[p.id]) playerStats[p.id] = { name: p.name, avatar: p.avatar, games: 0, wins: 0, totalScore: 0 };
      playerStats[p.id].games++;
      playerStats[p.id].totalScore += r.scores[i];
      if (r.scores[i] === winnerScore) playerStats[p.id].wins++;
    });
  });

  const sortedStats = Object.entries(playerStats)
    .map(([id, s]) => ({ id: parseInt(id), ...s, winRate: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0 }))
    .sort((a, b) => b.winRate - a.winRate);

  const appUsers = users.filter((u) => history.some((r) => r.players.some((p) => p.id === u.id)));

  if (history.length === 0) {
    return (
      <Card style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
        <div style={{ fontWeight: 600, fontSize: 16, color: "#374151" }}>Aucune partie enregistrée</div>
        <div style={{ fontSize: 14, color: "#9ca3af", marginTop: 6 }}>Joue une partie et clique sur "Terminer et sauvegarder"</div>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Filtres */}
      <Card>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Jeu</label>
            <select value={filterGame} onChange={(e) => setFilterGame(e.target.value)}
              style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 10px", fontSize: 14 }}>
              <option value="all">Tous</option>
              <option value="belote">Belote</option>
              <option value="tarot">Tarot</option>
              <option value="papayoo">Papayoo</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Joueur</label>
            <select value={filterPlayer} onChange={(e) => setFilterPlayer(e.target.value === "all" ? "all" : parseInt(e.target.value))}
              style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 10px", fontSize: 14 }}>
              <option value="all">Tous</option>
              {appUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.nickname || `${u.first_name} ${u.last_name}`}</option>
              ))}
            </select>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 13, color: "#9ca3af" }}>
            {filtered.length} partie{filtered.length > 1 ? "s" : ""}
          </div>
        </div>
      </Card>

      {/* Classement joueurs */}
      {sortedStats.length > 0 && (
        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>Classement des joueurs</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sortedStats.map((s, rank) => (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10,
                background: rank === 0 ? "#fefce8" : "#f9fafb",
                border: `1px solid ${rank === 0 ? "#fde68a" : "#e5e7eb"}`,
              }}>
                <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>
                  {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `${rank + 1}.`}
                </span>
                <Avatar player={{ id: s.id, name: s.name, avatar: s.avatar }} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>{s.games} partie{s.games > 1 ? "s" : ""}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: 18, color: rank === 0 ? "#d97706" : "#374151" }}>{s.winRate}%</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{s.wins} victoire{s.wins > 1 ? "s" : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Historique des parties */}
      <Card>
        <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>Historique des parties</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((r) => {
            const winnerScore = r.lowWins ? Math.min(...r.scores) : Math.max(...r.scores);
            const winner = r.players[r.scores.indexOf(winnerScore)];
            return (
              <div key={r.id} style={{ padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{GAME_LABELS[r.game] ?? r.game}</span>
                    <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 8 }}>
                      {new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#d97706", fontWeight: 700 }}>
                    🏆 {winner?.name}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  {r.players.map((p, i) => (
                    <div key={p.id} style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "3px 8px", borderRadius: 20, fontSize: 12,
                      background: r.scores[i] === winnerScore ? "#fefce8" : "#f3f4f6",
                      border: `1px solid ${r.scores[i] === winnerScore ? "#fde68a" : "#e5e7eb"}`,
                      fontWeight: r.scores[i] === winnerScore ? 700 : 400,
                    }}>
                      <Avatar player={p} size={16} />
                      {p.name.split(" ")[0]} · {r.scores[i]}
                    </div>
                  ))}
                </div>
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
  { id: "belote"  as GameType, label: "Belote",   icon: "🃏", desc: "2 équipes · 162 pts par manche" },
  { id: "tarot"   as GameType, label: "Tarot",    icon: "🔮", desc: "3 à 5 joueurs · Calcul automatique" },
  { id: "papayoo" as GameType, label: "Papayoo",  icon: "🎴", desc: "3 à 6 joueurs · Le moins de points gagne" },
];

export default function GamesPage() {
  const [selected, setSelected] = useState<GameType | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [tab, setTab] = useState<"games" | "stats">("games");

  useEffect(() => {
    usersApi.list().then(setUsers).catch(() => {});
  }, []);

  function back() { setSelected(null); }

  const wrapper = (title: string, children: React.ReactNode) => (
    <div style={{ maxWidth: 560, margin: "32px auto", padding: "0 16px", fontFamily: "sans-serif" }}>
      <button onClick={back} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14, marginBottom: 16, padding: 0 }}>← Retour</button>
      <h1 style={{ margin: "0 0 20px", fontSize: 22 }}>{title}</h1>
      {children}
    </div>
  );

  if (selected === "belote") return wrapper("🃏 Belote", <BeloteGame users={users} onDone={back} />);
  if (selected === "tarot")  return wrapper("🔮 Tarot",  <TarotGame  users={users} onDone={back} />);
  if (selected === "papayoo") return wrapper("🎴 Papayoo", <PapayooGame users={users} onDone={back} />);

  return (
    <div style={{ maxWidth: 560, margin: "32px auto", padding: "0 16px", fontFamily: "sans-serif" }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>🎲 Jeux</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid #e5e7eb" }}>
        {[{ id: "games", label: "Jeux" }, { id: "stats", label: "📊 Stats" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as "games" | "stats")} style={{
            padding: "10px 20px", border: "none", background: "none", cursor: "pointer",
            fontSize: 14, fontWeight: tab === t.id ? 700 : 500,
            color: tab === t.id ? "#4f46e5" : "#6b7280",
            borderBottom: `2px solid ${tab === t.id ? "#4f46e5" : "transparent"}`,
            marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "games" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {GAMES_LIST.map((g) => (
            <button key={g.id} onClick={() => setSelected(g.id)} style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "18px 20px", border: "1px solid #e5e7eb", borderRadius: 12,
              background: "#fff", cursor: "pointer", textAlign: "left",
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
      )}

      {tab === "stats" && <StatsPage users={users} />}
    </div>
  );
}
