// server/src/games/tictactoe/domain.ts
// 🎯 Pur domaine : aucune dépendance socket, seulement des fonctions pures.

import type { Player, Cell } from "../../protocol/types";

/** Retourne l’autre joueur. */
export function other(p: Player): Player {
  return p === "X" ? "O" : "X";
}

/** Crée un board vide (n x n). */
export function emptyBoard(gridSize = 3): Cell[] {
  return Array<Cell>(gridSize * gridSize).fill(null);
}

/** Vérifie si un index de case est valide et libre. */
export function isValidMove(board: Cell[], index: number): boolean {
  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index < board.length &&
    board[index] === null
  );
}

/** Applique un coup (IMMUTABLE) et renvoie le nouveau board. */
export function applyMove(
  board: Cell[],
  index: number,
  player: Player
): Cell[] {
  if (!isValidMove(board, index)) return board;
  const next = board.slice();
  next[index] = player;
  return next;
}

/**
 * Calcule la victoire/égalité pour un board n×n avec condition k alignés.
 * Renvoie { winner, draw, line } où:
 *  - winner: "X" | "O" | null
 *  - draw: boolean (vrai si plateau plein et pas de winner)
 *  - line: indices de la ligne gagnante (sinon [])
 */
export function checkWinner(
  board: Cell[],
  gridSize = 3,
  winLength = 3
): { winner: Player | null; draw: boolean; line: number[] } {
  // bornes
  if (winLength > gridSize) winLength = gridSize;

  // Génère toutes les lignes candidates (horizontales, verticales, diagonales)
  const lines: number[][] = [];

  // horizontales
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c <= gridSize - winLength; c++) {
      const L: number[] = [];
      for (let k = 0; k < winLength; k++) L.push(r * gridSize + (c + k));
      lines.push(L);
    }
  }
  // verticales
  for (let c = 0; c < gridSize; c++) {
    for (let r = 0; r <= gridSize - winLength; r++) {
      const L: number[] = [];
      for (let k = 0; k < winLength; k++) L.push((r + k) * gridSize + c);
      lines.push(L);
    }
  }
  // diagonales principales
  for (let r = 0; r <= gridSize - winLength; r++) {
    for (let c = 0; c <= gridSize - winLength; c++) {
      const L: number[] = [];
      for (let k = 0; k < winLength; k++) L.push((r + k) * gridSize + (c + k));
      lines.push(L);
    }
  }
  // diagonales secondaires
  for (let r = 0; r <= gridSize - winLength; r++) {
    for (let c = winLength - 1; c < gridSize; c++) {
      const L: number[] = [];
      for (let k = 0; k < winLength; k++) L.push((r + k) * gridSize + (c - k));
      lines.push(L);
    }
  }

  // recherche d’une ligne gagnante
  for (const L of lines) {
    const a = board[L[0]];
    if (!a) continue;
    let ok = true;
    for (let i = 1; i < L.length; i++) {
      if (board[L[i]] !== a) {
        ok = false;
        break;
      }
    }
    if (ok) return { winner: a, draw: false, line: L };
  }

  // égalité si plus aucune case libre
  const draw = board.every((c) => c !== null);
  return { winner: null, draw, line: [] };
}
