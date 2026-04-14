import { useState } from "react";
import { User } from "../api/client";
import { GamePlayer, saveResult } from "./types";
import { Card, Btn, Avatar, PlayerPicker } from "./ui";

// ─── Constantes ───────────────────────────────────────────────────────────────

const ROWS = [
  { key: "red",    label: "Rouge", numbers: [2,3,4,5,6,7,8,9,10,11,12], bg: "#fee2e2", border: "#fca5a5", text: "#991b1b", accent: "#dc2626" },
  { key: "yellow", label: "Jaune", numbers: [2,3,4,5,6,7,8,9,10,11,12], bg: "#fef9c3", border: "#fde68a", text: "#854d0e", accent: "#ca8a04" },
  { key: "green",  label: "Vert",  numbers: [12,11,10,9,8,7,6,5,4,3,2], bg: "#dcfce7", border: "#86efac", text: "#166534", accent: "#16a34a" },
  { key: "blue",   label: "Bleu",  numbers: [12,11,10,9,8,7,6,5,4,3,2], bg: "#dbeafe", border: "#93c5fd", text: "#1e40af", accent: "#2563eb" },
] as const;

type RowKey = "red" | "yellow" | "green" | "blue";

// Chaque rangée = 12 cases : indices 0-10 = chiffres, index 11 = verrou (auto)
// Score : n croix → n*(n+1)/2
function rowScore(checks: boolean[]): number {
  const n = checks.filter(Boolean).length;
  return n * (n + 1) / 2;
}

// Dernier chiffre coché (indices 0-10 uniquement, pas le verrou)
function lastNumberChecked(checks: boolean[]): number {
  for (let i = 10; i >= 0; i--) if (checks[i]) return i;
  return -1;
}

// ─── État d'un joueur ─────────────────────────────────────────────────────────

interface PlayerSheet {
  player: GamePlayer;
  // 12 booleans par rangée : 0-10 = chiffres, 11 = verrou
  rows: Record<RowKey, boolean[]>;
  penalties: boolean[];
}

function emptySheet(player: GamePlayer): PlayerSheet {
  return {
    player,
    rows: {
      red:    Array(12).fill(false),
      yellow: Array(12).fill(false),
      green:  Array(12).fill(false),
      blue:   Array(12).fill(false),
    },
    penalties: [false, false, false, false],
  };
}

function totalScore(sheet: PlayerSheet): number {
  return Object.values(sheet.rows).reduce((s, r) => s + rowScore(r), 0)
    - sheet.penalties.filter(Boolean).length * 5;
}

// ─── Feuille d'un joueur ──────────────────────────────────────────────────────

function PlayerSheetView({ sheet, onChange, scoreHidden, onToggleHide }: {
  sheet: PlayerSheet;
  onChange: (s: PlayerSheet) => void;
  scoreHidden: boolean;
  onToggleHide: () => void;
}) {
  function toggleCell(rowKey: RowKey, idx: number) {
    // Le verrou (idx=11) n'est pas cliquable directement
    if (idx === 11) return;

    const row = [...sheet.rows[rowKey]];
    const last = lastNumberChecked(row);

    if (row[idx]) {
      // Décocher uniquement la dernière case cochée
      if (idx === last) {
        row[idx] = false;
        // Si c'était le chiffre final (idx=10), déverrouilller aussi
        if (idx === 10) row[11] = false;
      }
    } else {
      // Cocher seulement si on avance vers la droite
      if (idx > last) {
        // Case finale (idx=10) : nécessite au moins 5 croix existantes
        if (idx === 10 && row.slice(0, 10).filter(Boolean).length < 5) return;
        row[idx] = true;
        // Auto-verrou quand on coche le chiffre final
        if (idx === 10) row[11] = true;
      }
    }
    onChange({ ...sheet, rows: { ...sheet.rows, [rowKey]: row } });
  }

  function togglePenalty(i: number) {
    const p = [...sheet.penalties];
    p[i] = !p[i];
    onChange({ ...sheet, penalties: p });
  }

  const score = totalScore(sheet);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {ROWS.map((row) => {
        const checks = sheet.rows[row.key];
        const last = lastNumberChecked(checks);
        const locked = checks[11];
        const rs = rowScore(checks);
        // Nb de chiffres cochés (sans le verrou)
        const numCount = checks.slice(0, 11).filter(Boolean).length;

        return (
          <div key={row.key} style={{ background: row.bg, border: `1px solid ${row.border}`, borderRadius: 10, padding: "8px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: row.text, width: 38, flexShrink: 0 }}>{row.label}</span>

              {/* 11 cases chiffres */}
              <div style={{ display: "flex", gap: 3, flex: 1, overflowX: "auto" }}>
                {row.numbers.map((num, idx) => {
                  const checked = checks[idx];
                  const afterLast = idx <= last && !checked;
                  const isLastNum = idx === 10;
                  const lockBlocked = isLastNum && !checked && numCount < 5;
                  const disabled = afterLast || lockBlocked || locked;

                  return (
                    <button
                      key={idx}
                      onClick={() => !disabled && toggleCell(row.key, idx)}
                      title={isLastNum && !checked ? `Nécessite 5 croix (actuellement ${numCount})` : undefined}
                      style={{
                        minWidth: 27, height: 27,
                        borderRadius: 6,
                        border: `2px solid ${checked ? row.accent : isLastNum ? row.accent : row.border}`,
                        background: checked ? row.accent : "#fff",
                        color: checked ? "#fff" : disabled ? "#d1d5db" : row.text,
                        fontSize: num >= 10 ? 10 : 12, fontWeight: 700,
                        cursor: disabled ? "default" : "pointer",
                        flexShrink: 0, opacity: afterLast ? 0.25 : 1,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {num}
                    </button>
                  );
                })}

                {/* Case verrou séparée (auto) */}
                <div
                  style={{
                    minWidth: 27, height: 27, borderRadius: "50%",
                    border: `2px solid ${locked ? row.accent : row.border}`,
                    background: locked ? row.accent : "#fff",
                    color: locked ? "#fff" : "#d1d5db",
                    fontSize: 13, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginLeft: 2,
                  }}
                >
                  🔒
                </div>
              </div>

              {/* Score de la rangée */}
              <span style={{ fontSize: 13, fontWeight: 800, color: row.accent, minWidth: 26, textAlign: "right", flexShrink: 0 }}>
                {scoreHidden ? "?" : rs}
              </span>
            </div>

            {locked && (
              <div style={{ fontSize: 10, color: row.accent, fontWeight: 700, marginTop: 4 }}>
                ✓ Verrouillée · {numCount} chiffres + verrou = {scoreHidden ? "?" : `${rs} pts`}
              </div>
            )}
            {!locked && numCount >= 4 && (
              <div style={{ fontSize: 10, color: row.text, marginTop: 3, opacity: 0.7 }}>
                {numCount}/5 croix avant le verrou {numCount >= 5 ? "· prêt à verrouiller ✓" : ""}
              </div>
            )}
          </div>
        );
      })}

      {/* Pénalités + score */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Pénalités</span>
        <div style={{ display: "flex", gap: 5 }}>
          {sheet.penalties.map((p, i) => (
            <button key={i} onClick={() => togglePenalty(i)}
              style={{ width: 28, height: 28, borderRadius: 6, border: `2px solid ${p ? "#dc2626" : "#e5e7eb"}`, background: p ? "#fee2e2" : "#fff", color: p ? "#dc2626" : "#9ca3af", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {p ? "✕" : "—"}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 11, color: "#6b7280" }}>
          = <strong style={{ color: "#dc2626" }}>-{sheet.penalties.filter(Boolean).length * 5}</strong>
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onToggleHide}
            style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", color: "#6b7280" }}>
            {scoreHidden ? "👁 Voir" : "🙈 Cacher"}
          </button>
          <div style={{ fontSize: 22, fontWeight: 800, color: score >= 0 ? "#4f46e5" : "#dc2626" }}>
            {scoreHidden ? "?" : `${score} pts`}
          </div>
        </div>
      </div>

      {/* Détail du score (caché si scoreHidden) */}
      {!scoreHidden && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ROWS.map((row) => {
            const n = sheet.rows[row.key].filter(Boolean).length;
            const s = rowScore(sheet.rows[row.key]);
            return (
              <div key={row.key} style={{ flex: 1, minWidth: 52, textAlign: "center", background: row.bg, border: `1px solid ${row.border}`, borderRadius: 8, padding: "4px 6px" }}>
                <div style={{ fontSize: 10, color: row.text, fontWeight: 600 }}>{row.label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: row.accent }}>{s}</div>
                <div style={{ fontSize: 10, color: row.text }}>{n} croix</div>
              </div>
            );
          })}
          <div style={{ flex: 1, minWidth: 52, textAlign: "center", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 8, padding: "4px 6px" }}>
            <div style={{ fontSize: 10, color: "#991b1b", fontWeight: 600 }}>Pénalités</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#dc2626" }}>-{sheet.penalties.filter(Boolean).length * 5}</div>
            <div style={{ fontSize: 10, color: "#991b1b" }}>{sheet.penalties.filter(Boolean).length}/4</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function QwixxGame({ users, onDone }: { users: User[]; onDone: () => void }) {
  const [selectedPlayers, setSelectedPlayers] = useState<GamePlayer[]>([]);
  const [sheets, setSheets] = useState<PlayerSheet[]>([]);
  const [setup, setSetup] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [hiddenScores, setHiddenScores] = useState<boolean[]>([]);

  function startGame() {
    setSheets(selectedPlayers.map(emptySheet));
    setHiddenScores(selectedPlayers.map(() => false));
    setActiveIdx(0);
    setSetup(false);
  }

  function updateSheet(i: number, s: PlayerSheet) {
    setSheets((prev) => prev.map((x, j) => j === i ? s : x));
  }

  function toggleHide(i: number) {
    setHiddenScores((prev) => prev.map((v, j) => j === i ? !v : v));
  }

  function finish() {
    const scores = sheets.map(totalScore);
    saveResult({ id: Date.now().toString(), game: "qwixx", date: new Date().toISOString(), players: sheets.map((s) => s.player), scores, lowWins: false });
    onDone();
  }

  if (setup) return (
    <Card>
      <h2 style={{ margin: "0 0 18px", fontSize: 18 }}>⚙️ Configuration Qwixx</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <PlayerPicker users={users} selected={selectedPlayers} onChange={setSelectedPlayers} min={2} max={5} />
        <Btn onClick={startGame} disabled={selectedPlayers.length < 2}>
          Commencer avec {selectedPlayers.length} joueur{selectedPlayers.length > 1 ? "s" : ""} →
        </Btn>
      </div>
    </Card>
  );

  const scores = sheets.map(totalScore);
  const maxScore = Math.max(...scores);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Onglets joueurs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e5e7eb", overflowX: "auto" }}>
        {sheets.map((s, i) => (
          <button key={s.player.id} onClick={() => setActiveIdx(i)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: activeIdx === i ? 700 : 500, color: activeIdx === i ? "#4f46e5" : "#6b7280", borderBottom: `2px solid ${activeIdx === i ? "#4f46e5" : "transparent"}`, marginBottom: -1, whiteSpace: "nowrap", flexShrink: 0 }}>
            <Avatar player={s.player} size={20} />
            {s.player.name.split(" ")[0]}
            <span style={{ fontSize: 12, fontWeight: 800, color: activeIdx === i ? "#4f46e5" : "#9ca3af" }}>
              {hiddenScores[i] ? "🙈" : scores[i]}
            </span>
          </button>
        ))}
      </div>

      {/* Feuille du joueur actif */}
      {sheets[activeIdx] && (
        <PlayerSheetView
          sheet={sheets[activeIdx]}
          onChange={(s) => updateSheet(activeIdx, s)}
          scoreHidden={hiddenScores[activeIdx] ?? false}
          onToggleHide={() => toggleHide(activeIdx)}
        />
      )}

      {/* Classement */}
      <Card style={{ padding: "10px 14px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>Classement</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {[...sheets.map((s, i) => ({ s, i, score: scores[i] }))]
            .sort((a, b) => b.score - a.score)
            .map(({ s, i, score }, rank) => (
              <div key={s.player.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 18, fontSize: 13 }}>{rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `${rank + 1}.`}</span>
                <Avatar player={s.player} size={22} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{s.player.name.split(" ")[0]}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: score === maxScore ? "#d97706" : "#374151" }}>
                  {hiddenScores[i] ? "🙈" : score}
                </span>
              </div>
            ))}
        </div>
        <Btn onClick={finish} style={{ marginTop: 12, width: "100%" }}>Terminer et enregistrer</Btn>
      </Card>

      <Btn variant="ghost" onClick={() => { setSetup(true); setSheets([]); }}>← Nouvelle partie</Btn>
    </div>
  );
}
