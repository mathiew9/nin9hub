import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

import "./Connect4.css";
import Connect4Board, { Disc, WinningCell } from "./shared/Connect4Board";

const ROWS = 6;
const COLS = 7;

interface Props {
  mode: "ai" | "friend" | "online";
  setMode: (mode: "ai" | "friend" | "online" | null) => void;
}

export default function Connect4({ mode, setMode }: Props) {
  const { t } = useTranslation();

  const [board, setBoard] = useState<Disc[][]>(
    Array(ROWS)
      .fill(null)
      .map(() => Array(COLS).fill(null)),
  );

  const [currentPlayer, setCurrentPlayer] = useState<"red" | "yellow">("red");
  const [winner, setWinner] = useState<"red" | "yellow" | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [score, setScore] = useState({ red: 0, yellow: 0 });
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const [winningCells, setWinningCells] = useState<WinningCell[]>([]);

  const checkWinner = (
    b: (string | null)[][],
    row: number,
    col: number,
    player: string,
  ): WinningCell[] | null => {
    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];

    for (const [dx, dy] of directions) {
      const cells: WinningCell[] = [{ row, col }];

      for (let step = 1; step < 4; step++) {
        const r = row + step * dx;
        const c = col + step * dy;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || b[r][c] !== player)
          break;
        cells.push({ row: r, col: c });
      }

      for (let step = 1; step < 4; step++) {
        const r = row - step * dx;
        const c = col - step * dy;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || b[r][c] !== player)
          break;
        cells.push({ row: r, col: c });
      }

      if (cells.length >= 4) return cells;
    }

    return null;
  };

  const checkDraw = (b: (string | null)[][]) => {
    return b.every((row) => row.every((cell) => cell !== null));
  };

  const isColumnFull = (col: number) => board[0][col] !== null;

  const dropDisc = (col: number) => {
    if (winner || isDraw) return;
    if (isColumnFull(col)) return;

    const newBoard = board.map((row) => [...row]);

    for (let row = ROWS - 1; row >= 0; row--) {
      if (!newBoard[row][col]) {
        newBoard[row][col] = currentPlayer;
        setBoard(newBoard);

        const result = checkWinner(newBoard, row, col, currentPlayer);
        if (result) {
          setWinner(currentPlayer);
          setWinningCells(result);
          setScore((prev) => ({
            ...prev,
            [currentPlayer]: prev[currentPlayer] + 1,
          }));
        } else if (checkDraw(newBoard)) {
          setIsDraw(true);
        } else {
          setCurrentPlayer(currentPlayer === "red" ? "yellow" : "red");
        }
        break;
      }
    }
  };

  const resetGame = () => {
    setBoard(
      Array(ROWS)
        .fill(null)
        .map(() => Array(COLS).fill(null)),
    );
    setCurrentPlayer("red");
    setWinner(null);
    setIsDraw(false);
    setWinningCells([]);
  };

  const resetScore = () => {
    setScore({ red: 0, yellow: 0 });
  };

  const getAvailableColumns = () => {
    return board[0]
      .map((_, colIndex) => colIndex)
      .filter((col) => board[0][col] === null);
  };

  useEffect(() => {
    if (mode === "ai" && currentPlayer === "yellow" && !winner && !isDraw) {
      const timeout = setTimeout(() => {
        const availableCols = getAvailableColumns();
        if (availableCols.length > 0) {
          const randomCol =
            availableCols[Math.floor(Math.random() * availableCols.length)];
          dropDisc(randomCol);
        }
      }, 800);

      return () => clearTimeout(timeout);
    }
  }, [board, currentPlayer, mode, winner, isDraw]);

  const isHoveredPlayable = (row: number, col: number) => {
    if (hoverCol !== col) return false;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === null) return r === row;
    }
    return false;
  };

  // ✅ règle d’interaction (offline) : friend = toujours, ai = seulement quand red joue
  const canInteract =
    mode === "friend" || (mode === "ai" && currentPlayer === "red");

  return (
    <div className="connect4">
      <h2>
        {winner ? (
          <>
            <span
              className={`connect4Badge ${
                winner === "red" ? "connect4RedBadge" : "connect4YellowBadge"
              }`}
            >
              {t(`games.connect4.colors.${winner}`)}
            </span>{" "}
            {t("games.connect4.inGame.wins")}!
          </>
        ) : !isDraw ? (
          <>
            <span
              className={`connect4Badge ${
                currentPlayer === "red"
                  ? "connect4RedBadge"
                  : "connect4YellowBadge"
              }`}
            >
              {t(`games.connect4.colors.${currentPlayer}`)}
            </span>{" "}
            {t("games.connect4.inGame.turn")}
          </>
        ) : null}
      </h2>

      {isDraw && !winner && <h2>{t("common.results.draw")}</h2>}

      <div className="commonGameLayout">
        <div className="side">
          <div className="scoreCard">
            <div className="scoreCardMode">
              <div className="modeText">
                {t("common.modes.gameMode")} :{" "}
                {mode === "ai"
                  ? t("common.modes.withai")
                  : t("common.modes.withfriend")}
              </div>
            </div>

            <div className="scoreCardHeader">
              <div className="scoreTitle">{t("common.labels.score")}</div>
            </div>

            <div className="scoreCardBody">
              <p>
                <span className="connect4RedBadge connect4Badge">
                  {t("games.connect4.colors.red")}
                </span>{" "}
                - {score.red}
              </p>
              <p>
                <span className="connect4YellowBadge connect4Badge">
                  {t("games.connect4.colors.yellow")}
                </span>{" "}
                - {score.yellow}
              </p>
            </div>

            <div className="scoreCardFooter">
              <button
                className="commonButton commonMediumButton resetScore"
                onClick={resetScore}
              >
                {t("common.actions.resetScore")}
              </button>
              <button
                className="commonButton commonMediumButton changeModeButton"
                onClick={() => setMode(null)}
              >
                {t("common.modes.changeGameMode")}
              </button>
            </div>
          </div>
        </div>

        <div className="center">
          <Connect4Board
            board={board}
            currentPlayer={currentPlayer}
            winner={winner}
            isDraw={isDraw}
            hoverCol={hoverCol}
            setHoverCol={setHoverCol}
            winningCells={winningCells}
            canInteract={canInteract}
            dropDisc={dropDisc}
            isHoveredPlayable={isHoveredPlayable}
            isColumnFull={isColumnFull}
          />
        </div>

        <div className="side hidden" />
      </div>

      <button
        className="commonButton commonMediumButton connect4PlayAgainButton"
        onClick={resetGame}
      >
        {t("common.actions.playAgain")}
      </button>
    </div>
  );
}
