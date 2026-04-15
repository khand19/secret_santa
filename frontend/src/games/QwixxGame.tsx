import { useState, useEffect, useRef, useCallback } from "react";
import { User } from "../api/client";
import { GamePlayer, saveResult } from "./types";
import { PlayerPicker } from "./ui";

// ─── Constantes ───────────────────────────────────────────────────────────────

const ROWS = [
  { key: "red",    label: "R", numbers: [2,3,4,5,6,7,8,9,10,11,12], bg: "#fee2e2", border: "#fca5a5", text: "#991b1b", accent: "#dc2626" },
  { key: "yellow", label: "J", numbers: [2,3,4,5,6,7,8,9,10,11,12], bg: "#fef9c3", border: "#fde68a", text: "#854d0e", accent: "#ca8a04" },
  { key: "green",  label: "V", numbers: [12,11,10,9,8,7,6,5,4,3,2], bg: "#dcfce7", border: "#86efac", text: "#166534", accent: "#16a34a" },
  { key: "blue",   label: "B", numbers: [12,11,10,9,8,7,6,5,4,3,2], bg: "#dbeafe", border: "#93c5fd", text: "#1e40af", accent: "#2563eb" },
] as const;

type RowKey = "red" | "yellow" | "green" | "blue";

// 12 cases : 0–10 = chiffres (2→12 ou 12→2), 11 = verrou (auto)
export type RowChecks = boolean[]; // length 12

export interface QwixxSheet {
  rows: Record<RowKey, RowChecks>;
  penalties: boolean[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowScore(checks: RowChecks): number {
  const n = checks.filter(Boolean).length;
  return n * (n + 1) / 2;
}

function lastNum(checks: RowChecks): number {
  for (let i = 10; i >= 0; i--) if (checks[i]) return i;
  return -1;
}

function numCount(checks: RowChecks): number {
  return checks.slice(0, 11).filter(Boolean).length;
}

export function emptySheet(): QwixxSheet {
  return {
    rows: {
      red:    Array(12).fill(false),
      yellow: Array(12).fill(false),
      green:  Array(12).fill(false),
      blue:   Array(12).fill(false),
    },
    penalties: [false, false, false, false],
  };
}

function sheetTotal(sheet: QwixxSheet): number {
  return Object.values(sheet.rows).reduce((s, r) => s + rowScore(r), 0)
    - sheet.penalties.filter(Boolean).length * 5;
}

function toggleCell(sheet: QwixxSheet, rowKey: RowKey, idx: number, lockedRows: string[] = []): QwixxSheet {
  if (idx === 11) return sheet; // verrou non cliquable
  const row = [...sheet.rows[rowKey]];
  const last = lastNum(row);
  const myLocked = row[11];
  const globallyLocked = lockedRows.includes(rowKey);

  // Ligne globalement verrouillée par quelqu'un d'autre :
  // je peux uniquement cocher la dernière case (idx=10) si pas encore cochée
  if (globallyLocked && !myLocked && idx !== 10) return sheet;

  if (row[idx]) {
    // Décocher seulement la dernière case cochée
    if (idx !== last) return sheet;
    row[idx] = false;
    if (idx === 10) row[11] = false; // déverrouille aussi
  } else {
    if (idx <= last) return sheet; // doit avancer vers la droite
    row[idx] = true;
    if (idx === 10) row[11] = true; // verrou auto dès qu'on coche le dernier chiffre
  }
  return { ...sheet, rows: { ...sheet.rows, [rowKey]: row } };
}

function computeLockedRows(sheets: QwixxSheet[]): string[] {
  const locked = new Set<string>();
  for (const sheet of sheets) {
    for (const key of Object.keys(sheet.rows) as RowKey[]) {
      if (sheet.rows[key][11]) locked.add(key);
    }
  }
  return Array.from(locked);
}

function isGameOver(sheets: QwixxSheet[], lockedRows: string[]): boolean {
  if (lockedRows.length >= 2) return true;
  return sheets.some((s) => s.penalties.filter(Boolean).length >= 4);
}

function togglePenalty(sheet: QwixxSheet, i: number): QwixxSheet {
  const p = [...sheet.penalties];
  p[i] = !p[i];
  return { ...sheet, penalties: p };
}

// ─── URL WebSocket ────────────────────────────────────────────────────────────

function wsUrl(code: string): string {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const host = import.meta.env.DEV ? "localhost:8000" : window.location.host;
  return `${proto}://${host}/api/qwixx/rooms/${code}/ws`;
}

// ─── RowView ──────────────────────────────────────────────────────────────────

function RowView({
  row, checks, hideScore, readOnly, onChange, globallyLocked = false,
}: {
  row: typeof ROWS[number];
  checks: RowChecks;
  hideScore: boolean;
  readOnly: boolean;
  onChange?: (idx: number) => void;
  globallyLocked?: boolean;
}) {
  const last = lastNum(checks);
  const myLocked = checks[11];
  const score = rowScore(checks);
  // Ligne globalement verrouillée par qqun mais pas encore par moi → je peux seulement cocher idx=10
  const canOnlyCheckLast = globallyLocked && !myLocked;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 3,
      background: (globallyLocked && myLocked) ? "#f3f4f6" : row.bg,
      border: `1px solid ${globallyLocked ? "#d1d5db" : row.border}`,
      borderRadius: 8, padding: "4px 6px",
      opacity: (globallyLocked && myLocked) ? 0.7 : 1,
    }}>
      {/* Label */}
      <span style={{
        width: 18, fontSize: 11, fontWeight: 800,
        color: row.accent, flexShrink: 0, textAlign: "center",
      }}>
        {row.label}
      </span>

      {/* Cases chiffres */}
      {row.numbers.map((num, idx) => {
        const checked = checks[idx];
        const isLast = idx === 10;
        const afterLast = idx <= last && !checked;
        // disabled si : readOnly, déjà passé, ma ligne verrouillée, ou ligne globale et pas l'idx final
        const disabled = readOnly || afterLast || myLocked || (canOnlyCheckLast && idx !== 10);

        return (
          <button
            key={idx}
            onClick={() => !disabled && onChange?.(idx)}
            style={{
              width: 22, height: 28, borderRadius: 5, flexShrink: 0,
              border: `1.5px solid ${checked ? row.accent : isLast ? row.accent : row.border}`,
              background: checked ? row.accent : "#fff",
              color: checked ? "#fff" : afterLast ? "#d1d5db" : row.text,
              fontSize: num >= 10 ? 9 : 11, fontWeight: 700,
              cursor: disabled ? "default" : "pointer",
              opacity: afterLast ? 0.3 : 1,
              padding: 0, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {num}
          </button>
        );
      })}

      {/* Verrou (séparé, auto) */}
      <div style={{
        width: 22, height: 28, borderRadius: "50%", flexShrink: 0,
        border: `1.5px solid ${myLocked ? row.accent : row.border}`,
        background: myLocked ? row.accent : "#f9fafb",
        fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center",
        marginLeft: 1,
      }}>
        {myLocked ? "✓" : "🔒"}
      </div>

      {/* Score */}
      <span style={{
        width: 22, fontSize: 13, fontWeight: 800,
        color: row.accent, flexShrink: 0, textAlign: "right",
      }}>
        {hideScore ? "—" : score || ""}
      </span>
    </div>
  );
}

// ─── SheetView ────────────────────────────────────────────────────────────────

function SheetView({
  sheet, onChange, hideScore, playerName, compact = false, lockedRows = [],
}: {
  sheet: QwixxSheet;
  onChange?: (updated: QwixxSheet) => void;
  hideScore: boolean;
  playerName?: string;
  compact?: boolean;
  lockedRows?: string[];
}) {
  const total = sheetTotal(sheet);
  const penCount = sheet.penalties.filter(Boolean).length;
  const readOnly = !onChange;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 4 : 6 }}>
      {playerName && (
        <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 2 }}>{playerName}</div>
      )}

      {/* Rangées */}
      {ROWS.map((row) => (
        <RowView
          key={row.key}
          row={row}
          checks={sheet.rows[row.key]}
          hideScore={hideScore}
          readOnly={readOnly}
          globallyLocked={lockedRows.includes(row.key)}
          onChange={readOnly ? undefined : (idx) => onChange?.(toggleCell(sheet, row.key, idx, lockedRows))}
        />
      ))}

      {/* Pénalités + total */}
      {!compact && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "#f9fafb", border: "1px solid #e5e7eb",
          borderRadius: 8, padding: "6px 8px",
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", flexShrink: 0 }}>Pénal.</span>
          <div style={{ display: "flex", gap: 4 }}>
            {sheet.penalties.map((p, i) => (
              <button
                key={i}
                onClick={() => !readOnly && onChange?.(togglePenalty(sheet, i))}
                style={{
                  width: 26, height: 26, borderRadius: 5,
                  border: `1.5px solid ${p ? "#dc2626" : "#e5e7eb"}`,
                  background: p ? "#fee2e2" : "#fff",
                  color: p ? "#dc2626" : "#9ca3af",
                  fontSize: 11, fontWeight: 700,
                  cursor: readOnly ? "default" : "pointer",
                }}
              >
                {p ? "✕" : "—"}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>
            -{penCount * 5}
          </span>
          <div style={{ marginLeft: "auto", fontSize: 20, fontWeight: 800, color: total >= 0 ? "#4f46e5" : "#dc2626" }}>
            {hideScore ? "?" : `${total} pts`}
          </div>
        </div>
      )}

      {/* Détail scores par rangée (quand visible) */}
      {!compact && !hideScore && (
        <div style={{ display: "flex", gap: 4 }}>
          {ROWS.map((row) => {
            const s = rowScore(sheet.rows[row.key]);
            const n = numCount(sheet.rows[row.key]);
            return (
              <div key={row.key} style={{
                flex: 1, textAlign: "center",
                background: row.bg, border: `1px solid ${row.border}`,
                borderRadius: 6, padding: "3px 0",
              }}>
                <div style={{ fontSize: 9, color: row.text, fontWeight: 700 }}>{row.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: row.accent }}>{s}</div>
                <div style={{ fontSize: 9, color: row.text }}>{n}✓</div>
              </div>
            );
          })}
          <div style={{
            flex: 1, textAlign: "center",
            background: "#fff1f2", border: "1px solid #fecdd3",
            borderRadius: 6, padding: "3px 0",
          }}>
            <div style={{ fontSize: 9, color: "#991b1b", fontWeight: 700 }}>-5</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#dc2626" }}>-{penCount * 5}</div>
            <div style={{ fontSize: 9, color: "#991b1b" }}>{penCount}/4</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Solo Game ────────────────────────────────────────────────────────────────

function GameOverScreen({ players, sheets, onDone, onNew }: {
  players: GamePlayer[];
  sheets: QwixxSheet[];
  onDone: () => void;
  onNew: () => void;
}) {
  const scores = sheets.map(sheetTotal);
  const sorted = [...players.map((p, i) => ({ p, score: scores[i] }))]
    .sort((a, b) => b.score - a.score);

  function save() {
    saveResult({
      id: Date.now().toString(), game: "qwixx",
      date: new Date().toISOString(),
      players, scores, lowWins: false,
    });
    onDone();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 4px" }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 20, textAlign: "center" }}>Partie terminée !</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map(({ p, score }, rank) => (
          <div key={p.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 14px", borderRadius: 10,
            background: rank === 0 ? "#fef9c3" : "#f9fafb",
            border: `1.5px solid ${rank === 0 ? "#fde68a" : "#e5e7eb"}`,
          }}>
            <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>
              {rank === 0 ? "🏆" : `${rank + 1}.`}
            </span>
            {p.avatar
              ? <img src={p.avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
              : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 700 }}>{p.name[0]}</div>
            }
            <span style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{p.name}</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#4f46e5" }}>{score}</span>
          </div>
        ))}
      </div>
      <button onClick={save}
        style={{ padding: "12px", borderRadius: 10, border: "none", background: "#4f46e5", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
        Enregistrer et quitter
      </button>
      <button onClick={onNew}
        style={{ padding: "8px", borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 13, color: "#9ca3af" }}>
        Nouvelle partie
      </button>
    </div>
  );
}

function SoloGame({ users, onDone }: { users: User[]; onDone: () => void }) {
  const [selectedPlayers, setSelectedPlayers] = useState<GamePlayer[]>([]);
  const [sheets, setSheets] = useState<QwixxSheet[]>([]);
  const [setup, setSetup] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [hideScore, setHideScore] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  function start() {
    setSheets(selectedPlayers.map(() => emptySheet()));
    setActiveIdx(0);
    setGameOver(false);
    setSetup(false);
  }

  function updateSheet(idx: number, updated: QwixxSheet) {
    const next = sheets.map((x, j) => j === idx ? updated : x);
    setSheets(next);
    const locked = computeLockedRows(next);
    if (isGameOver(next, locked)) setGameOver(true);
  }

  if (setup) return (
    <div style={{ padding: "0 4px" }}>
      <h2 style={{ margin: "0 0 16px", fontSize: 17 }}>Solo — Joueurs</h2>
      <PlayerPicker users={users} selected={selectedPlayers} onChange={setSelectedPlayers} min={1} max={5} />
      <button
        onClick={start}
        disabled={selectedPlayers.length < 1}
        style={{ marginTop: 16, width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "#4f46e5", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: selectedPlayers.length < 1 ? 0.5 : 1 }}
      >
        Commencer →
      </button>
    </div>
  );

  if (gameOver) return (
    <GameOverScreen
      players={selectedPlayers}
      sheets={sheets}
      onDone={onDone}
      onNew={() => { setSetup(true); setGameOver(false); }}
    />
  );

  const scores = sheets.map(sheetTotal);
  const lockedRows = computeLockedRows(sheets);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Barre du haut : joueurs + hide */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "1px solid #e5e7eb", overflowX: "auto" }}>
        {sheets.map((_s, i) => (
          <button key={selectedPlayers[i].id} onClick={() => setActiveIdx(i)}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "8px 10px",
              border: "none", background: "none", cursor: "pointer", flexShrink: 0,
              borderBottom: `2px solid ${activeIdx === i ? "#4f46e5" : "transparent"}`,
              marginBottom: -1, fontSize: 13,
              color: activeIdx === i ? "#4f46e5" : "#6b7280",
              fontWeight: activeIdx === i ? 700 : 500,
            }}>
            {selectedPlayers[i].avatar
              ? <img src={selectedPlayers[i].avatar!} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />
              : <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 700 }}>{selectedPlayers[i].name[0]}</div>
            }
            <span>{selectedPlayers[i].name.split(" ")[0]}</span>
            <span style={{ fontSize: 11, fontWeight: 800 }}>
              {hideScore ? "?" : scores[i]}
            </span>
          </button>
        ))}
        <button onClick={() => setHideScore((v) => !v)}
          style={{ marginLeft: "auto", padding: "6px 10px", border: "none", background: "none", cursor: "pointer", fontSize: 13, flexShrink: 0, color: hideScore ? "#4f46e5" : "#9ca3af" }}>
          {hideScore ? "👁" : "🙈"}
        </button>
      </div>

      {/* Lignes verrouillées globalement */}
      {lockedRows.length > 0 && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: "#6b7280" }}>
          <span>Lignes fermées :</span>
          {lockedRows.map((r) => {
            const row = ROWS.find((x) => x.key === r)!;
            return <span key={r} style={{ fontWeight: 700, color: row.accent }}>{row.label}</span>;
          })}
          <span style={{ color: "#9ca3af" }}>({lockedRows.length}/2)</span>
        </div>
      )}

      {/* Feuille active */}
      {sheets[activeIdx] && (
        <SheetView
          sheet={sheets[activeIdx]}
          onChange={(s) => updateSheet(activeIdx, s)}
          hideScore={hideScore}
          lockedRows={lockedRows}
        />
      )}

      {/* Bouton terminer manuellement */}
      <button onClick={() => setGameOver(true)}
        style={{ padding: "10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#f9fafb", cursor: "pointer", fontSize: 13, color: "#374151", fontWeight: 600, marginTop: 4 }}>
        Terminer la partie
      </button>
      <button onClick={() => setSetup(true)}
        style={{ padding: "8px", borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 13, color: "#9ca3af" }}>
        ← Nouvelle partie
      </button>
    </div>
  );
}

// ─── Multiplayer ──────────────────────────────────────────────────────────────

interface RemotePlayer {
  user_id: number;
  name: string;
  avatar: string | null;
  sheet: QwixxSheet;
  connected: boolean;
}

function MultiGame({ roomCode, currentUser, onLeave }: {
  roomCode: string;
  currentUser: User;
  onLeave: () => void;
}) {
  const [players, setPlayers] = useState<RemotePlayer[]>([]);
  const [mySheet, setMySheet] = useState<QwixxSheet>(emptySheet());
  const [lockedRows, setLockedRows] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [hideScore, setHideScore] = useState(false);
  const [viewOther, setViewOther] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const myId = currentUser.id;

  const sendUpdate = useCallback((sheet: QwixxSheet) => {
    wsRef.current?.readyState === WebSocket.OPEN &&
      wsRef.current.send(JSON.stringify({ type: "update", sheet }));
  }, []);

  useEffect(() => {
    const ws = new WebSocket(wsUrl(roomCode));
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "state") {
        setPlayers(data.players ?? []);
        setLockedRows(data.locked_rows ?? []);
        setGameOver(data.game_over ?? false);
        const me = (data.players ?? []).find((p: RemotePlayer) => p.user_id === myId);
        if (me) setMySheet(me.sheet);
      }
    };

    return () => ws.close();
  }, [roomCode, myId]);

  function updateMySheet(sheet: QwixxSheet) {
    setMySheet(sheet);
    sendUpdate(sheet);
  }

  const others = players.filter((p) => p.user_id !== myId);
  const viewedPlayer = viewOther !== null ? others.find((p) => p.user_id === viewOther) : null;

  // Écran de fin de partie
  if (gameOver) {
    const gamePlayers: GamePlayer[] = players.map((p) => ({
      id: p.user_id,
      name: p.name,
      avatar: p.avatar ?? null,
    }));
    const gameSheets = players.map((p) => p.sheet);
    return (
      <GameOverScreen
        players={gamePlayers}
        sheets={gameSheets}
        onDone={onLeave}
        onNew={onLeave}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Header : code + statut + hide */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>
          Code&nbsp;: <strong style={{ fontSize: 14, letterSpacing: 2, color: "#374151" }}>{roomCode}</strong>
        </span>
        <span style={{ fontSize: 11, marginLeft: 4 }}>
          {connected ? <span style={{ color: "#16a34a" }}>● En ligne</span> : <span style={{ color: "#dc2626" }}>● Déconnecté</span>}
        </span>
        <button onClick={() => setHideScore((v) => !v)}
          style={{ marginLeft: "auto", padding: "5px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: hideScore ? "#eef2ff" : "#fff", cursor: "pointer", fontSize: 12, color: hideScore ? "#4f46e5" : "#6b7280", fontWeight: 600 }}>
          {hideScore ? "👁 Voir" : "🙈 Cacher"}
        </button>
      </div>

      {/* Lignes verrouillées */}
      {lockedRows.length > 0 && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: "#6b7280" }}>
          <span>Lignes fermées :</span>
          {lockedRows.map((r) => {
            const row = ROWS.find((x) => x.key === r)!;
            return <span key={r} style={{ fontWeight: 700, color: row.accent }}>{row.label}</span>;
          })}
          <span style={{ color: "#9ca3af" }}>({lockedRows.length}/2)</span>
        </div>
      )}

      {/* Autres joueurs — barre compacte */}
      {others.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {others.map((p) => {
            const total = sheetTotal(p.sheet);
            const isViewing = viewOther === p.user_id;
            return (
              <button key={p.user_id} onClick={() => setViewOther(isViewing ? null : p.user_id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 10px", borderRadius: 8,
                  border: `1.5px solid ${isViewing ? "#4f46e5" : "#e5e7eb"}`,
                  background: isViewing ? "#eef2ff" : "#f9fafb",
                  cursor: "pointer", fontSize: 12,
                }}>
                {p.avatar
                  ? <img src={p.avatar} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />
                  : <div style={{ width: 20, height: 20, borderRadius: "50%", background: p.connected ? "#4f46e5" : "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 700 }}>{p.name[0]}</div>
                }
                <span style={{ fontWeight: 600, color: "#374151" }}>{p.name.split(" ")[0]}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#4f46e5" }}>
                  {hideScore ? "?" : total}
                </span>
                {!p.connected && <span style={{ fontSize: 9, color: "#9ca3af" }}>hors ligne</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Feuille d'un autre joueur (lecture seule) */}
      {viewedPlayer && (
        <div style={{ background: "#f9fafb", borderRadius: 10, padding: 10, border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>
            Feuille de {viewedPlayer.name.split(" ")[0]}
          </div>
          <SheetView sheet={viewedPlayer.sheet} hideScore={hideScore} compact lockedRows={lockedRows} />
        </div>
      )}

      {/* Ma feuille */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
          Ma feuille — {currentUser.nickname || currentUser.first_name}
        </div>
        <SheetView
          sheet={mySheet}
          onChange={updateMySheet}
          hideScore={hideScore}
          lockedRows={lockedRows}
        />
      </div>

      <button onClick={onLeave}
        style={{ padding: "8px", borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
        ← Quitter la partie
      </button>
    </div>
  );
}

// ─── Lobby Multiplayer ────────────────────────────────────────────────────────

function MultiLobby({ onJoin, onBack }: {
  onJoin: (code: string) => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createRoom() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/qwixx/rooms", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCode(data.code);
    } catch {
      setError("Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  }

  async function joinRoom() {
    const c = joinCode.trim().toUpperCase();
    if (c.length < 4) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/qwixx/rooms/${c}`, { credentials: "include" });
      if (!res.ok) throw new Error("Partie introuvable");
      onJoin(c);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 4px" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 17 }}>🌐 Multijoueur</h2>
      <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
        Chaque joueur joue sur son propre téléphone, les feuilles sont synchronisées en temps réel.
      </p>

      {/* Créer */}
      <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#166534", marginBottom: 10 }}>
          Créer une nouvelle partie
        </div>
        {code ? (
          <>
            <div style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}>
              Partage ce code avec les autres joueurs :
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 6, color: "#16a34a", textAlign: "center", padding: "10px 0" }}>
              {code}
            </div>
            <button onClick={() => onJoin(code)}
              style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "#16a34a", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Rejoindre ma partie →
            </button>
          </>
        ) : (
          <button onClick={createRoom} disabled={loading}
            style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "#16a34a", color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "..." : "Créer une partie"}
          </button>
        )}
      </div>

      {/* Rejoindre */}
      <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#1e40af", marginBottom: 10 }}>
          Rejoindre une partie existante
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && joinRoom()}
            placeholder="Code (ex: A1B2C3)"
            maxLength={6}
            style={{ flex: 1, border: "1.5px solid #93c5fd", borderRadius: 8, padding: "10px 12px", fontSize: 16, fontWeight: 700, letterSpacing: 2, textAlign: "center", outline: "none", textTransform: "uppercase" }}
          />
          <button onClick={joinRoom} disabled={loading || joinCode.length < 4}
            style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: joinCode.length < 4 ? 0.5 : 1 }}>
            →
          </button>
        </div>
      </div>

      {error && <div style={{ color: "#dc2626", fontSize: 13, textAlign: "center" }}>{error}</div>}

      <button onClick={onBack}
        style={{ padding: "8px", borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 13, color: "#9ca3af" }}>
        ← Retour
      </button>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

type Mode = "setup" | "solo" | "multi-lobby" | "multi";

export default function QwixxGame({ users, onDone, currentUser }: {
  users: User[];
  onDone: () => void;
  currentUser: User;
}) {
  const [mode, setMode] = useState<Mode>("setup");
  const [roomCode, setRoomCode] = useState("");

  if (mode === "solo") {
    return <SoloGame users={users} onDone={onDone} />;
  }

  if (mode === "multi-lobby") {
    return (
      <MultiLobby
        onJoin={(code) => { setRoomCode(code); setMode("multi"); }}
        onBack={() => setMode("setup")}
      />
    );
  }

  if (mode === "multi" && roomCode) {
    return (
      <MultiGame
        roomCode={roomCode}
        currentUser={currentUser}
        onLeave={() => { setRoomCode(""); setMode("setup"); }}
      />
    );
  }

  // Setup screen
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 4px" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 17 }}>🎲 Qwixx</h2>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#6b7280" }}>
        Cochez les nombres de gauche à droite. Score : n×(n+1)/2 par rangée.
      </p>

      <button onClick={() => setMode("solo")}
        style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", textAlign: "left" }}>
        <span style={{ fontSize: 28 }}>👤</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Solo</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Sur cet appareil · plusieurs joueurs en alternance</div>
        </div>
        <span style={{ marginLeft: "auto", color: "#9ca3af" }}>→</span>
      </button>

      <button onClick={() => setMode("multi-lobby")}
        style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", textAlign: "left" }}>
        <span style={{ fontSize: 28 }}>🌐</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Multijoueur</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Chaque joueur sur son téléphone · temps réel</div>
        </div>
        <span style={{ marginLeft: "auto", color: "#9ca3af" }}>→</span>
      </button>

      <button onClick={onDone}
        style={{ padding: "8px", borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
        ← Retour aux jeux
      </button>
    </div>
  );
}
