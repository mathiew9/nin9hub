import type { Server } from "socket.io";
import { registerGameSocketRouter } from "./core/socketRouter";
import { tttAdapter } from "./games/tictactoe/adapter";
// import { c4Adapter } from "./games/connect4/adapter";

export function registerSockets(io: Server) {
  // On branche TTT d’abord (le plus safe).
  registerGameSocketRouter({ io, adapter: tttAdapter });

  // Tu brancheras C4 quand l’adapter existera.
  // registerGameSocketRouter({ io, adapter: c4Adapter });
}
