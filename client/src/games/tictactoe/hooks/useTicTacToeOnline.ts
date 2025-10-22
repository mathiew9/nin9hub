import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { getTicTacToeSocket } from "../../../sockets/tictactoe";

type Player = "X" | "O";
type Cell = Player | null;
type Winner = Player | "draw" | null;

type AckSuccess<T> = { ok: true; data: T };
type AckError = { ok: false; code: string; message: string };
type Ack<T> = AckSuccess<T> | AckError;

type Status = "setup" | "waiting" | "playing" | "ended";

type State = {
  status: Status;
  roomId: string | null;
  role: Player | null;
  board: Cell[];
  turn: Player | null;
  started: boolean;
  winner: Winner;
  playersCount: 1 | 2;
  stateVersion: number;
  rematchVotes: 0 | 1 | 2;
  lastError: { code: string; message: string } | null;
  opponentLeft: boolean;
};

const initialState: State = {
  status: "setup",
  roomId: null,
  role: null,
  board: Array<Cell>(9).fill(null),
  turn: null,
  started: false,
  winner: null,
  playersCount: 1,
  stateVersion: 0,
  rematchVotes: 0,
  lastError: null,
  opponentLeft: false,
};

export function useTicTacToeOnline() {
  const socket = useMemo(() => getTicTacToeSocket(), []);
  const [s, setS] = useState<State>(initialState);
  const latestVersion = useRef(0);

  // Derived
  const canPlay =
    s.status === "playing" && !s.winner && s.role !== null && s.turn === s.role;

  // helpers
  const setError = (code: string, message: string) =>
    setS((prev) => ({ ...prev, lastError: { code, message } }));

  // --- Event listeners ---
  useEffect(() => {
    function onWaiting(payload: { players: 1 | 2 }) {
      setS((prev) => ({
        ...prev,
        playersCount: payload.players,
        status: "waiting",
        started: false,
        opponentLeft: false,
      }));
    }

    function onState(payload: {
      roomId: string;
      board: Cell[];
      turn: Player;
      started: boolean;
      winner: Winner;
      playersCount: 1 | 2;
      stateVersion: number;
    }) {
      // anti-retard : ignorer les états obsolètes
      if (payload.stateVersion < latestVersion.current) return;
      latestVersion.current = payload.stateVersion;

      const status: Status = payload.winner
        ? "ended"
        : payload.started
        ? "playing"
        : "waiting";

      setS((prev) => ({
        ...prev,
        roomId: payload.roomId ?? prev.roomId,
        board: payload.board,
        turn: payload.turn,
        started: payload.started,
        winner: payload.winner,
        playersCount: payload.playersCount,
        stateVersion: payload.stateVersion,
        status,
        opponentLeft: false,
        rematchVotes: (prev.rematchVotes ?? 0) as 0 | 1 | 2,
      }));
    }

    function onOpponentLeft() {
      setS((prev) => ({
        ...prev,
        status: "waiting",
        started: false,
        opponentLeft: true,
        playersCount: 1,
      }));
    }

    function onRematchStatus(payload: { votes: 1 | 2 }) {
      setS((prev) => ({ ...prev, rematchVotes: payload.votes as 0 | 1 | 2 }));
    }

    function onError(payload: { code: string; message: string }) {
      setError(payload.code, payload.message);
    }

    socket.on("online:waiting", onWaiting);
    socket.on("online:state", onState);
    socket.on("online:opponent:left", onOpponentLeft);
    socket.on("online:rematch:status", onRematchStatus);
    socket.on("online:error", onError);

    return () => {
      socket.off("online:waiting", onWaiting);
      socket.off("online:state", onState);
      socket.off("online:opponent:left", onOpponentLeft);
      socket.off("online:rematch:status", onRematchStatus);
      socket.off("online:error", onError);
    };
  }, [socket]);

  // --- Actions (avec ACK) ---
  const createRoom = useCallback(async () => {
    return new Promise<AckSuccess<{ roomId: string; role: Player }> | AckError>(
      (resolve) => {
        socket.emit(
          "online:createRoom",
          (res: Ack<{ roomId: string; role: Player }>) => {
            if (res.ok) {
              setS((prev) => ({
                ...prev,
                roomId: res.data.roomId,
                role: res.data.role,
                status: "waiting",
                opponentLeft: false,
                lastError: null,
              }));
              resolve(res);
            } else {
              setError(res.code, res.message);
              resolve(res);
            }
          }
        );
      }
    );
  }, [socket]);

  const joinRoom = useCallback(
    async (roomId: string) => {
      return new Promise<
        AckSuccess<{ role: Player; players: number }> | AckError
      >((resolve) => {
        socket.emit(
          "online:joinRoom",
          { roomId },
          (res: Ack<{ role: Player; players: number }>) => {
            if (res.ok) {
              setS((prev) => ({
                ...prev,
                roomId,
                role: res.data.role,
                status: "waiting",
                opponentLeft: false,
                lastError: null,
              }));
              resolve(res);
            } else {
              setError(res.code, res.message);
              resolve(res);
            }
          }
        );
      });
    },
    [socket]
  );

  const startGame = useCallback(async () => {
    return new Promise<AckSuccess<{}> | AckError>((resolve) => {
      socket.emit("online:start", (res: Ack<{}>) => {
        if (!res.ok) setError(res.code, res.message);
        resolve(res);
      });
    });
  }, [socket]);

  const playTurn = useCallback(
    async (index: number) => {
      if (!canPlay)
        return {
          ok: false,
          code: "NOT_YOUR_TURN",
          message: "Pas ton tour.",
        } as AckError;
      return new Promise<AckSuccess<{}> | AckError>((resolve) => {
        socket.emit("online:playTurn", { index }, (res: Ack<{}>) => {
          if (!res.ok) setError(res.code, res.message);
          resolve(res);
        });
      });
    },
    [socket, canPlay]
  );

  const requestRematch = useCallback(async () => {
    return new Promise<AckSuccess<{ votes: number }> | AckError>((resolve) => {
      socket.emit("online:rematch:request", (res: Ack<{ votes: number }>) => {
        if (!res.ok) setError(res.code, res.message);
        resolve(res);
      });
    });
  }, [socket]);

  const leave = useCallback(async () => {
    return new Promise<AckSuccess<{}> | AckError>((resolve) => {
      socket.emit("online:leave", (res: Ack<{}>) => {
        // on reset local quoi qu’il arrive
        setS(initialState);
        latestVersion.current = 0;
        resolve(res);
      });
    });
  }, [socket]);

  return {
    // state
    ...s,
    canPlay,
    // actions
    createRoom,
    joinRoom,
    startGame,
    playTurn,
    requestRematch,
    leave,
    // util
    clearError: () => setS((p) => ({ ...p, lastError: null })),
  };
}
