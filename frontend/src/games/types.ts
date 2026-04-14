// ─── Types partagés ───────────────────────────────────────────────────────────

export type GameType = "belote" | "coinche" | "tarot" | "papayoo" | "qwixx";

export interface GamePlayer { id: number; name: string; avatar: string | null; }

export interface GameResult {
  id: string; game: GameType; date: string;
  players: GamePlayer[]; scores: number[]; lowWins: boolean;
}

// ─── Persistance localStorage ─────────────────────────────────────────────────

const STORAGE_KEY = "games_history_v1";

export function loadHistory(): GameResult[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

export function saveResult(r: GameResult) {
  const h = loadHistory(); h.unshift(r);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(h.slice(0, 200)));
}
