import type { Server, Namespace, Socket } from "socket.io";
import type { GameAdapter } from "./roomService";
import { RoomService } from "./roomService";
import type { Ack } from "./typesCore";

/**
 * Enregistre les handlers socket pour UN jeu donné.
 * - 1 adapter = 1 jeu
 * - 1 RoomService par jeu
 */
export function registerGameSocketRouter<TState, TGameSettings, TMove>(args: {
  io: Server;
  nsp?: Namespace; // optionnel, default = io
  adapter: GameAdapter<TState, TGameSettings, TMove>;
}) {
  const { io, adapter } = args;
  const nsp = args.nsp ?? io;

  const roomService = new RoomService<TState, TGameSettings, TMove>(
    io,
    nsp,
    adapter,
  );

  nsp.on("connection", (socket: Socket) => {
    /* ---------------- ROOM LIFECYCLE ---------------- */

    socket.on(adapter.clientEvents.CreateRoom, (payload, ack: Ack<any>) => {
      roomService.createRoom(socket, payload, ack);
    });

    socket.on(adapter.clientEvents.JoinRoom, (payload, ack: Ack<any>) => {
      roomService.joinRoom(socket, payload, ack);
    });

    socket.on(adapter.clientEvents.Leave, (ack: Ack<{}>) => {
      roomService.leaveRoom(socket, ack);
    });

    socket.on("disconnect", () => {
      roomService.leaveRoom(socket);
    });

    /* ---------------- GAME FLOW ---------------- */

    socket.on(adapter.clientEvents.Start, (ack: Ack<{}>) => {
      roomService.start(socket, ack);
    });

    socket.on(adapter.clientEvents.PlayTurn, (payload: TMove, ack: Ack<{}>) => {
      roomService.playTurn(socket, payload, ack);
    });

    socket.on(
      adapter.clientEvents.RematchRequest,
      (ack: Ack<{ votes: number }>) => {
        roomService.rematchRequest(socket, ack);
      },
    );

    /* ---------------- OPTIONAL FEATURES ---------------- */
    if (adapter.clientEvents.UpdateSettings) {
      socket.on(
        adapter.clientEvents.UpdateSettings,
        (partial: any, ack: Ack<any>) => {
          roomService.updateSettings(socket, partial, ack);
        },
      );
    }

    if (adapter.clientEvents.SwapRoles) {
      socket.on(adapter.clientEvents.SwapRoles, (ack: Ack<{}>) => {
        roomService.swapRoles(socket, ack);
      });
    }

    // (optionnel) BackToSettings si tu veux le rebrancher ensuite
    if (adapter.clientEvents.BackToSettings) {
      socket.on(adapter.clientEvents.BackToSettings, (ack: Ack<{}>) => {
        roomService.backToSettings(socket, ack);
      });
    }
  });
}
