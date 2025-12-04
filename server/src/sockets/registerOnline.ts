import type { Server } from "socket.io";
import { registerCoreRoomHandlers } from "../core/socketsCore";
import { registerTicTacToeHandlers } from "../games/tictactoe/socketHandlers";

/** Orchestrateur : branche le core + les handlers de jeu */
export function registerOnline(io: Server) {
  // Pas de namespace pour l’instant : simple et rétro-compatible
  registerCoreRoomHandlers(io, io); // create/join/leave + waiting/state/opponentLeft
  registerTicTacToeHandlers(io, io); // start/playTurn/rematch (TTT)
}
