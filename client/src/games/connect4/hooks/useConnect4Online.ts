import { useMemo } from "react";
import { getSocket } from "../../../sockets/socket";

export function useConnect4Online() {
  const socket = useMemo(() => getSocket(), []);

  const createRoom;
  const joinRoom;
  const lastError;
  const clearError;
  const roomId;
  const status;
  const leave;

  return {
    createRoom,
    joinRoom,
    lastError,
    clearError,
    roomId,
    status,
    leave,
  };
}
