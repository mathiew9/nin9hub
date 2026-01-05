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
    playersCount,
    opponentLeft,
    rematchVotes,
    myRematchVoted,
    requestRematch,
    leave,
    playTurn,
    settings,
    turnDeadlineAt,
  } = useOnline();

  // Timer tick used to compute remaining time
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!turnDeadlineAt) return;

    const id = window.setInterval(() => setNow(Date.now()), 300);
    return () => window.clearInterval(id);
  }, [turnDeadlineAt]);

  // Remaining time (seconds), or null when timer is disabled
  const timeLeftSec = useMemo(() => {
    if (!turnDeadlineAt || (settings?.turnTimeMs ?? 0) <= 0) return null;

    const msLeft = Math.max(0, turnDeadlineAt - now);
    return Math.ceil(msLeft / 1000);
  }, [turnDeadlineAt, now, settings?.turnTimeMs]);

  // Dynamic grid size: settings.gridSize (3..5), else √board.length, else 3
  const gridSize = useMemo(() => {
    const fromSettings = (settings as any)?.gridSize;

    if (
      Number.isInteger(fromSettings) &&
      fromSettings >= 3 &&
      fromSettings <= 5
    ) {
      return fromSettings as number;
    }

    const n = Math.sqrt((board?.length ?? 9) as number);
    return Number.isInteger(n) ? (n as number) : 3;
  }, [settings, board]);

  // Derived UI texts (status + center text)
  const statusText = useMemo(() => {
    if (winner) return null;
    if (playersCount < 2) return "En attente de l’autre joueur…";
    if (!canPlay) return "En attente de l’adversaire…";
    return "À toi de jouer.";
  }, [winner, playersCount, canPlay]);

  // Status bar state (used for styling/behavior)
  const stateForBar: "playing" | "won" | "draw" =
    winner === "draw" ? "draw" : winner ? "won" : "playing";

  // Board interaction handler
  const onCellClick = (i: number) => {
    if (!canPlay || winner) return;
    playTurn(i);
  };

  return (
    <>
      {opponentLeft && (
        <div className="wr-banner warn">
          Ton adversaire a quitté la partie. En attente d’un joueur…
        </div>
      )}

      <TicTacToeStatusBar
        // Left: only the symbol of the player who is acting (or the winner). Nothing on draw.
        leftText="Tour :"
        leftSymbol={
          winner === "draw"
            ? null
            : winner
            ? (winner as Player) // winner is "X" | "O"
            : turn ?? null // current turn player
        }
        // Center: explicit state message
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
        // Right: timer only while playing
        timeLeftSec={winner ? null : timeLeftSec}
        state={stateForBar}
      />

      <div className="wr-boardBox">
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
      </div>

      {!winner && <div className="wr-help">{statusText}</div>}

      {winner && (
        <div className="wr-outcomeRow">
          <div
            className={`wr-outcome ${
              winner === "draw" ? "draw" : winner === role ? "ok" : "bad"
            }`}
          >
            {winner === "draw"
              ? "Égalité."
              : winner === role
              ? "Victoire !"
              : "Défaite."}
          </div>

          <div className="wr-actions">
            <button
              className={`commonButton commonMenuButton wr-btn ${
                myRematchVoted || rematchVotes === 2 ? "is-disabled" : ""
              }`}
              onClick={() => requestRematch()}
              disabled={myRematchVoted || rematchVotes === 2}
              title={
                myRematchVoted
                  ? "En attente de l’autre…"
                  : "Proposer un rematch"
              }
            >
              {rematchVotes === 0 && !myRematchVoted && "Rejouer (0/2)"}
              {rematchVotes === 1 && !myRematchVoted && "Rejouer (1/2)"}
              {myRematchVoted &&
                rematchVotes < 2 &&
                "En attente de l’autre (1/2)…"}
              {rematchVotes === 2 && "Rejouer (2/2)"}
            </button>

            <button
              className="commonButton commonMenuButton wr-btn"
              onClick={() => leave()}
            >
              Quitter
            </button>
          </div>
        </div>
      )}
    </>
  );
}
