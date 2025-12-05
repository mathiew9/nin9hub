import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { getTicTacToeSocket } from "../../../sockets/tictactoe";

/* -------- Types locaux -------- */
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
  myId: string | null;
  hostId: string | null;
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
  myId: null,
  hostId: null,
};

export function useTicTacToeOnline() {
  const socket = useMemo(() => getTicTacToeSocket(), []);
  const [s, setS] = useState<State>(initialState);
  const lastLeaveSentForRoomIdRef = useRef<string | null>(null);
  const latestVersion = useRef(0);
  const roomIdRef = useRef<string | null>(null);
  const leftRef = useRef(false);

  const canPlay =
    s.status === "playing" && !s.winner && s.role !== null && s.turn === s.role;

  const isHost = !!(socket.id && s.hostId && socket.id === s.hostId);

  const setError = (code: string, message: string) =>
    setS((prev) => ({ ...prev, lastError: { code, message } }));

  const refreshMyId = useCallback(() => {
    setS((prev) => ({ ...prev, myId: socket.id || prev.myId }));
  }, [socket]);

  const leaveNow = useCallback(() => {
    const rid = roomIdRef.current; // déjà défini dans ton hook
    if (!rid) return;

    // petit anti-spam: si on envoie 10 fois de suite pour la même room d’un seul coup
    if (lastLeaveSentForRoomIdRef.current === rid) return;
    lastLeaveSentForRoomIdRef.current = rid;

    try {
      socket.emit("online:leave", () => {
        // on ne remet pas forcément à null ici; ce flag protège juste
        // un spam immédiat. Il sera réinitialisé quand on quittera la room localement.
      });
    } catch {}
  }, [socket]);

  useEffect(() => {
    const onExit = () => leaveNow();
    window.addEventListener("ninehub:exit-online", onExit);
    return () => window.removeEventListener("ninehub:exit-online", onExit);
  }, [leaveNow]);

  /* -------- Boot / connect -------- */
  useEffect(() => {
    roomIdRef.current = s.roomId;
  }, [s.roomId]);

  useEffect(() => {
    const onConnect = () =>
      setS((prev) => ({ ...prev, myId: socket.id || prev.myId }));
    onConnect();
    socket.on("connect", onConnect);
    return () => {
      socket.off("connect", onConnect); // ensure cleanup returns void
    };
  }, [socket]);

  /* -------- Events -------- */
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
      hostId?: string;
      guestId?: string;
    }) {
      if (roomIdRef.current && payload.roomId !== roomIdRef.current) return;

      const { board, turn, winner } = payload.state;

      setS((prev) => {
        if (
          prev.roomId &&
          prev.roomId === payload.roomId &&
          payload.stateVersion < prev.stateVersion
        ) {
          return prev;
        }

        const status: Status = winner
          ? "ended"
          : payload.started
          ? "playing"
          : "waiting";

        const nextHostId =
          payload.hostId && payload.hostId.length > 0
            ? payload.hostId
            : prev.hostId;

        if (!roomIdRef.current) roomIdRef.current = payload.roomId;

        return {
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
          hostId: nextHostId,
        };
      });

      if (payload.stateVersion > latestVersion.current) {
        latestVersion.current = payload.stateVersion;
      }
    }

    function onOpponentLeft(payload?: {
      roomId?: string;
      hostId?: string;
      players?: 1 | 2;
    }) {
      if (
        roomIdRef.current &&
        payload?.roomId &&
        payload.roomId !== roomIdRef.current
      ) {
        return;
      }
      setS((prev) => ({
        ...prev,
        status: "waiting",
        started: false,
        turn: null,
        opponentLeft: true,
        playersCount: payload?.players ?? 1,
        hostId:
          payload?.hostId && payload.hostId.length > 0
            ? payload.hostId
            : prev.hostId,
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

  /* -------- Actions -------- */
  const safeLeaveIfNeeded = useCallback(async () => {
    if (!s.roomId) return;
    await new Promise<void>((resolve) => {
      try {
        socket.emit("online:leave", () => resolve());
        setTimeout(() => resolve(), 200);
      } catch {
        resolve();
      }
    });
    setS(initialState);
    latestVersion.current = 0;
    leftRef.current = false;
    roomIdRef.current = null;
    refreshMyId();
  }, [socket, s.roomId, refreshMyId]);

  const createRoom = useCallback(async () => {
    await safeLeaveIfNeeded();
    return new Promise<AckSuccess<{ roomId: string; role: Player }> | AckError>(
      (resolve) => {
        socket.emit(
          "online:createRoom",
          (res: Ack<{ roomId: string; role: Player }>) => {
            if (res.ok) {
              latestVersion.current = 0;
              roomIdRef.current = res.data.roomId;
              setS((prev) => ({
                ...prev,
                roomId: res.data.roomId,
                role: res.data.role,
                status: "waiting",
                opponentLeft: false,
                lastError: null,
                rematchVotes: 0,
                myRematchVoted: false,
                hostId: socket.id ?? prev.hostId,
                stateVersion: 0,
              }));
              refreshMyId();
            } else {
              setError(res.code, res.message);
            }
            resolve(res);
          }
        );
      }
    );
  }, [socket, safeLeaveIfNeeded, refreshMyId]);

  const joinRoom = useCallback(
    async (roomId: string) => {
      await safeLeaveIfNeeded();
      return new Promise<
        AckSuccess<{ role: Player; players: number }> | AckError
      >((resolve) => {
        socket.emit(
          "online:joinRoom",
          { roomId },
          (res: Ack<{ role: Player; players: number }>) => {
            if (res.ok) {
              latestVersion.current = 0;
              roomIdRef.current = roomId;
              setS((prev) => ({
                ...prev,
                roomId,
                role: res.data.role,
                status: "waiting",
                opponentLeft: false,
                lastError: null,
                rematchVotes: 0,
                myRematchVoted: false,
                stateVersion: 0,
              }));
              refreshMyId();
            } else {
              setError(res.code, res.message);
            }
            resolve(res);
          }
        );
      });
    },
    [socket, safeLeaveIfNeeded, refreshMyId]
  );

  const startGame = useCallback(async () => {
    return new Promise<AckSuccess<{}> | AckError>((resolve) => {
      socket.emit("online:start", (res: Ack<{}>) => {
        if (res.ok) latestVersion.current = 0;
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
      }>;
    }
    return new Promise<AckSuccess<{ votes: number }> | AckError>((resolve) => {
      socket.emit("online:rematch:request", (res: Ack<{ votes: number }>) => {
        if (res.ok) setS((prev) => ({ ...prev, myRematchVoted: true }));
        else setError(res.code, res.message);
        resolve(res);
      });
    });
  }, [socket, s.myRematchVoted, s.rematchVotes]);

  const leave = useCallback(async () => {
    return new Promise<AckSuccess<{}> | AckError>((resolve) => {
      socket.emit("online:leave", (res: Ack<{}>) => {
        setS(initialState);
        latestVersion.current = 0;
        leftRef.current = false;
        roomIdRef.current = null;
        refreshMyId();
        resolve(res);
      });
    });
  }, [socket, refreshMyId]);

  /* -------- Lifecycles -------- */
  useEffect(() => {
    if (!s.opponentLeft) return;
    const t = setTimeout(
      () => setS((prev) => ({ ...prev, opponentLeft: false })),
      5000
    );
    return () => clearTimeout(t);
  }, [s.opponentLeft]);

  useEffect(() => {
    return () => {
      leaveNow();
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
    window.addEventListener("pagehide", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onBeforeUnload);
    };
  }, [socket, s.roomId]);

  return {
    ...s,
    canPlay,
    isHost,
    createRoom,
    joinRoom,
    startGame,
    playTurn,
    requestRematch,
    leave,
    leaveNow,
    clearError: () => setS((p) => ({ ...p, lastError: null })),
  };
}
