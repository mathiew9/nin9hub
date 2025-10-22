import { io, Socket } from "socket.io-client";

const SERVER_URL =
  import.meta.env.VITE_TTT_SERVER_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

export function getTicTacToeSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: true,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
    });
  }
  return socket;
}
