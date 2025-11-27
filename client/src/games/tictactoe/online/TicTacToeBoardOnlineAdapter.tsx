import { useMemo } from "react";
import TicTacToeBoard from "../shared/TicTacToeBoard";
import { useOnline } from "./TicTacToeOnlineProvider";

type Player = "X" | "O";
type Cell = Player | null;

function calcWinningLine(s: Cell[]): number[] {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const L of lines) {
    const [a, b, c] = L;
    if (s[a] && s[a] === s[b] && s[a] === s[c]) return L;
  }
  return [];
}

export default function TicTacToeBoardOnlineAdapter() {
  const {
    board,
    role,
    turn,
    winner,
    canPlay,
    playersCount,
    opponentLeft,
    rematchVotes,
    myRematchVoted,
    requestRematch,
    leave,
    playTurn,
  } = useOnline();

  const winningLine = useMemo(() => calcWinningLine(board as Cell[]), [board]);

  const onCellClick = (i: number) => {
    if (!canPlay || winner) return;
    playTurn(i);
  };

  const statusText = useMemo(() => {
    if (winner) return null;
    if (playersCount < 2) return "En attente de l’autre joueur…";
    if (!canPlay) return "En attente de l’adversaire…";
    return "À toi de jouer.";
  }, [winner, playersCount, canPlay]);

  return (
    <div className="wr-onlineGame">
      {opponentLeft && (
        <div className="wr-banner warn">
          Ton adversaire a quitté la partie. En attente d’un joueur…
        </div>
      )}

      <div className="wr-statusRow">
        <span className={`wr-pill ${role === "X" ? "x" : "o"}`}>
          Ton rôle&nbsp;: <b>{role ?? "-"}</b>
        </span>
        {!winner && (
          <span className="wr-badge turn">
            Tour de&nbsp;: <b>{turn ?? "-"}</b>
          </span>
        )}
      </div>
      <div className="wr-boardBox">
        <TicTacToeBoard
          board={board as Cell[]}
          gridSize={3}
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
    </div>
  );
}
