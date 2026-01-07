import { useEffect, useMemo, useState } from "react";

import TicTacToeBoard from "../shared/TicTacToeBoard";
import TicTacToeStatusBar from "../shared/TicTacToeStatusBar";
import { useOnline } from "./TicTacToeOnlineProvider";

type Player = "X" | "O";
type Cell = Player | null;

export default function TicTacToeBoardOnlineAdapter() {
  // Online game state & actions
  const {
    board,
    role,
    turn,
    winner,
    winningLine,
    canPlay,
    //playersCount,
    //opponentLeft,
    rematchVotes,
    myRematchVoted,
    requestRematch,
    leave,
    playTurn,
    settings,
    turnDeadlineAt,
    turnStartedAt,
  } = useOnline();

  // Timer tick (used to compute remaining time)
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!turnDeadlineAt && !turnStartedAt) return;

    const id = window.setInterval(() => setNow(Date.now()), 300);
    return () => window.clearInterval(id);
  }, [turnDeadlineAt, turnStartedAt]);

  const isInfinite = (settings?.turnTimeMs ?? 0) <= 0;

  const timeLeft = useMemo<number | null>(() => {
    const turnTimeMs = settings?.turnTimeMs ?? 0;
    if (!turnDeadlineAt) return null;

    const msLeft = Math.max(0, turnDeadlineAt - now);
    const raw = Math.ceil(msLeft / 1000);
    const max = Math.ceil(turnTimeMs / 1000);

    return Math.min(max, raw);
  }, [turnDeadlineAt, now, settings?.turnTimeMs]);

  const elapsedSec = useMemo<number | null>(() => {
    if (!turnStartedAt) return null;
    const ms = Math.max(0, now - turnStartedAt);
    return Math.floor(ms / 1000);
  }, [turnStartedAt, now]);

  // Grid size resolution
  const gridSize = useMemo(() => {
    const fromSettings = (settings as any)?.gridSize;

    if (
      Number.isInteger(fromSettings) &&
      fromSettings >= 3 &&
      fromSettings <= 5
    ) {
      return fromSettings as number;
    }

    const n = Math.sqrt(board?.length ?? 9);
    return Number.isInteger(n) ? n : 3;
  }, [settings, board]);

  // Status bar visual state
  const stateForBar: "playing" | "won" | "draw" =
    winner === "draw" ? "draw" : winner ? "won" : "playing";

  // Board interaction
  const onCellClick = (i: number) => {
    if (!canPlay || winner) return;
    playTurn(i);
  };

  return (
    <>
      {/* uncommented code below when reconnectGraceMs and preserveGameOnLeave are implemented */}
      {/* {opponentLeft && (
        <div className="wr-banner warn">
          Ton adversaire a quitté la partie. En attente d’un joueur…
        </div>
      )} */}

      <TicTacToeStatusBar
        leftText={winner ? "" : "Tour :"}
        leftSymbol={
          winner === "draw" ? null : winner ? (winner as Player) : turn ?? null
        }
        centerText={
          winner === "draw"
            ? "Égalité"
            : winner
            ? winner === role
              ? "Victoire !"
              : "Défaite."
            : canPlay
            ? "À vous de jouer"
            : "En attente"
        }
        isInfinite={isInfinite}
        timeSec={winner ? null : isInfinite ? elapsedSec : timeLeft}
        state={stateForBar}
      />

      <div className="ttt-online-boardBox">
        <TicTacToeBoard
          board={board as Cell[]}
          gridSize={gridSize}
          currentPlayer={(turn ?? "X") as Player}
          winningLine={winningLine}
          gameDone={!!winner}
          onCellClick={onCellClick}
          mode="online"
          canPlay={canPlay}
        />
        <div className="ttt-online-help">{"Vous êtes " + role + "."}</div>
      </div>

      {winner && (
        <div className="ttt-online-actions">
          <button
            className={`commonButton ttt-online-actionBtn ${
              myRematchVoted || rematchVotes === 2 ? "is-disabled" : ""
            }`}
            onClick={requestRematch}
            disabled={myRematchVoted || rematchVotes === 2}
            title={
              myRematchVoted ? "En attente de l’autre…" : "Proposer un rematch"
            }
          >
            {rematchVotes === 0 && !myRematchVoted && "Rejouer (0/2)"}
            {rematchVotes === 1 && !myRematchVoted && "Rejouer (1/2)"}
            {myRematchVoted &&
              rematchVotes < 2 &&
              "En attente de l’autre (1/2)…"}
            {rematchVotes === 2 && "Rejouer (2/2)"}
          </button>

          <button className="commonButton ttt-online-actionBtn" onClick={leave}>
            Quitter
          </button>
        </div>
      )}
    </>
  );
}
