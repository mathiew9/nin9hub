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
  myRematchVoted: boolean;
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
  myRematchVoted: false,
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

  const leftRef = useRef(false);

  const leaveNow = useCallback(() => {
    if (leftRef.current || !s.roomId) return;
    leftRef.current = true;
    try {
      socket.emit("online:leave", () => {});
    } catch {}
  }, [socket, s.roomId]);

  // --- Event listeners ---
  useEffect(() => {
    function onWaiting(payload: { players: 1 | 2 }) {
      setS((prev) => ({
        ...prev,
        playersCount: payload.players,
        status: "waiting",
        started: false,
        turn: payload.players === 2 ? prev.turn : null,
        opponentLeft: payload.players === 2 ? false : prev.opponentLeft,
      }));
    }

    function onState(payload: {
      roomId: string;
      started: boolean;
      playersCount: 1 | 2;
      stateVersion: number;
      state: { board: Cell[]; turn: Player; winner: Winner };
    }) {
      if (payload.stateVersion < latestVersion.current) return;
      latestVersion.current = payload.stateVersion;

      const { board, turn, winner } = payload.state;
      const status: Status = winner
        ? "ended"
        : payload.started
        ? "playing"
        : "waiting";

      setS((prev) => ({
        ...prev,
        roomId: payload.roomId ?? prev.roomId,
        board,
        turn,
        started: payload.started,
        winner,
        playersCount: payload.playersCount,
        opponentLeft:
          payload.playersCount === 2 || payload.started
            ? false
            : prev.opponentLeft,
        stateVersion: payload.stateVersion,
        status,
        rematchVotes: (prev.rematchVotes ?? 0) as 0 | 1 | 2,
      }));
    }

    function onOpponentLeft() {
      setS((prev) => ({
        ...prev,
        status: "waiting",
        started: false,
        turn: null,
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
              latestVersion.current = 0;
              leftRef.current = false;
              setS((prev) => ({
                ...prev,
                roomId: res.data.roomId,
                role: res.data.role,
                status: "waiting",
                opponentLeft: false,
                lastError: null,
                rematchVotes: 0,
                myRematchVoted: false,
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
              latestVersion.current = 0;
              leftRef.current = false;
              setS((prev) => ({
                ...prev,
                roomId,
                role: res.data.role,
                status: "waiting",
                opponentLeft: false,
                lastError: null,
                rematchVotes: 0,
                myRematchVoted: false,
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
        if (res.ok) latestVersion.current = 0; // ✅ optionnel
        else setError(res.code, res.message);
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
    if (s.myRematchVoted) {
      return { ok: true, data: { votes: s.rematchVotes } } as AckSuccess<{
        votes: number;
      }>; // idempotent
    }
    return new Promise<AckSuccess<{ votes: number }> | AckError>((resolve) => {
      socket.emit("online:rematch:request", (res: Ack<{ votes: number }>) => {
        if (res.ok) {
          setS((prev) => ({ ...prev, myRematchVoted: true })); // ✅ désactiver seulement chez moi
        } else {
          setError(res.code, res.message);
        }
        resolve(res);
      });
    });
  }, [socket, s.myRematchVoted, s.rematchVotes]);

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

  useEffect(() => {
    if (!s.opponentLeft) return;
    const t = setTimeout(() => {
      setS((prev) => ({ ...prev, opponentLeft: false }));
    }, 5000);
    return () => clearTimeout(t);
  }, [s.opponentLeft]);

  useEffect(() => {
    return () => {
      leaveNow(); // notifie le serveur au démontage
    };
  }, [leaveNow]);

  useEffect(() => {
    const onBeforeUnload = () => {
      if (!s.roomId) return;
      try {
        socket.emit("online:leave", () => {});
      } catch {}
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onBeforeUnload); // iOS/Safari

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onBeforeUnload);
    };
  }, [socket, s.roomId]);

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
    leaveNow,
    // util
    clearError: () => setS((p) => ({ ...p, lastError: null })),
  };
}
