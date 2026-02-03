import type { Server } from "socket.io";
import { registerGameSocketRouter } from "./core/socketRouter";
import { tttAdapter } from "./games/tictactoe/adapter";
import { c4Adapter } from "./games/connect4/adapter";

export function registerSockets(io: Server) {
  // On branche TTT
  registerGameSocketRouter({ io, adapter: tttAdapter });

  // On branche C4 plus tard.
  registerGameSocketRouter({ io, adapter: c4Adapter });
}
