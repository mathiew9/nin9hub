import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./Connect4.css";

const ROWS = 6;
const COLS = 7;

interface Props {
  mode: "ai" | "friend";
  setMode: (mode: "ai" | "friend" | null) => void;
}

export default function Connect4({ mode, setMode }: Props) {
  const { t } = useTranslation();
  const [board, setBoard] = useState(
    Array(ROWS)
      .fill(null)
      .map(() => Array(COLS).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState("red");
  const [winner, setWinner] = useState<string | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [score, setScore] = useState({ red: 0, yellow: 0 });
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [lastMove, setLastMove] = useState<{ row: number; col: number } | null>(
    null
  );
  const [winningCells, setWinningCells] = useState<
    { row: number; col: number }[]
  >([]);
  const fallTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (fallTimeoutRef.current !== null) {
        clearTimeout(fallTimeoutRef.current);
      }
    };
  }, []);

  const dropDisc = (col: number) => {
    if (winner || isDraw) return;
    const newBoard = board.map((row) => [...row]);
    for (let row = ROWS - 1; row >= 0; row--) {
      if (!newBoard[row][col]) {
        newBoard[row][col] = currentPlayer;
        setLastMove({ row, col });
        if (fallTimeoutRef.current) {
          clearTimeout(fallTimeoutRef.current);
        }
        fallTimeoutRef.current = window.setTimeout(() => {
          setLastMove(null);
          fallTimeoutRef.current = null;
        }, 1000);
        setBoard(newBoard);
        const result = checkWinner(newBoard, row, col, currentPlayer);
        if (result) {
          setWinner(currentPlayer);
          setWinningCells(result);
          setScore((prev) => ({
            ...prev,
            [currentPlayer]: prev[currentPlayer as keyof typeof prev] + 1,
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

  const checkWinner = (
    board: string[][],
    row: number,
    col: number,
    player: string
  ): { row: number; col: number }[] | null => {
    const directions = [
      [0, 1], // horizontal
      [1, 0], // vertical
      [1, 1], // diagonale ↘
      [1, -1], // diagonale ↙
    ];

    for (const [dx, dy] of directions) {
      const cells = [{ row, col }];

      for (let step = 1; step < 4; step++) {
        const r = row + step * dx;
        const c = col + step * dy;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player)
          break;
        cells.push({ row: r, col: c });
      }

      for (let step = 1; step < 4; step++) {
        const r = row - step * dx;
        const c = col - step * dy;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player)
          break;
        cells.push({ row: r, col: c });
      }

      if (cells.length >= 4) {
        return cells;
      }
    }

    return null;
  };

  const checkDraw = (board: string[][]) => {
    return board.every((row) => row.every((cell) => cell !== null));
  };

  const resetGame = () => {
    setBoard(
      Array(ROWS)
        .fill(null)
        .map(() => Array(COLS).fill(null))
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

  const isColumnFull = (col: number) => board[0][col] !== null;

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
              {t(`connect4.${winner}`)}
            </span>{" "}
            {t("connect4.wins")}!
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
              {t(`connect4.${currentPlayer}`)}
            </span>{" "}
            {t("connect4.turn")}
          </>
        ) : null}
      </h2>

      {isDraw && !winner && <h2>{t("tictactoe.draw")}</h2>}
      <div className="gameLayout">
        <div className="side left">
          <div className="scoreCard">
            <div className="scoreCardMode">
              <div className="modeText">
                {t("tictactoe.gamemode")} :{" "}
                {mode === "ai"
                  ? t("tictactoe.withai")
                  : t("tictactoe.withfriend")}
              </div>
            </div>
            <div className="scoreCardHeader">
              <div className="scoreTitle">{t("general.score")}</div>
            </div>
            <div className="scoreCardBody">
              <p>
                <span className="connect4RedBadge connect4Badge">
                  {t("connect4.red")}
                </span>{" "}
                - {score.red}
              </p>
              <p>
                <span className="connect4YellowBadge connect4Badge">
                  {t("connect4.yellow")}
                </span>{" "}
                - {score.yellow}
              </p>
            </div>
            <div className="scoreCardFooter">
              <button className="resetScore" onClick={resetScore}>
                {t("tictactoe.resetScore")}
              </button>
              <button
                className="changeModeButton"
                onClick={() => setMode(null)}
              >
                {t("tictactoe.changeGameMode")}
              </button>
            </div>
          </div>
        </div>

        <div className="center">
          <div className="connect4-board">
            {/* Jeton fantôme au-dessus de la colonne survolée */}
            {hoverCol !== null &&
              !winner &&
              !isDraw &&
              !isColumnFull(hoverCol) &&
              (mode === "friend" || currentPlayer === "red") && (
                <div
                  key={`${currentPlayer}-${hoverCol}`}
                  className={`ghost-token ${currentPlayer}`}
                  style={{
                    left: `${hoverCol * 68 + 13}px`,
                    top: "-70px",
                  }}
                />
              )}

            <div className="column-overlays">
              {Array(COLS)
                .fill(null)
                .map((_, colIndex) => (
                  <div
                    key={colIndex}
                    className={`column-overlay ${
                      isColumnFull(colIndex) ? "col-full" : "col-playable"
                    }`}
                    onMouseEnter={() => setHoverCol(colIndex)}
                    onMouseLeave={() => setHoverCol(null)}
                    onClick={() => {
                      if (
                        (mode === "friend" || currentPlayer === "red") &&
                        !winner &&
                        !isDraw &&
                        !isColumnFull(colIndex)
                      ) {
                        dropDisc(colIndex);
                      }
                    }}
                  />
                ))}
            </div>
            {board.map((row, rowIndex) => (
              <div key={rowIndex} className="row">
                {row.map((cell, colIndex) => (
                  <div
                    key={`${colIndex}-${
                      lastMove?.row === rowIndex && lastMove?.col === colIndex
                        ? Date.now()
                        : ""
                    }`}
                    className={`cell ${cell || ""}
                    ${
                      !winner &&
                      !isDraw &&
                      (mode === "friend" || currentPlayer === "red") &&
                      isHoveredPlayable(rowIndex, colIndex)
                        ? `hoverable hoverable-${currentPlayer}`
                        : ""
                    }
                    ${
                      lastMove?.row === rowIndex && lastMove?.col === colIndex
                        ? "falling"
                        : ""
                    }
                    ${
                      lastMove === null &&
                      winningCells.some(
                        (c) => c.row === rowIndex && c.col === colIndex
                      )
                        ? "cell--win"
                        : ""
                    }
                  `}
                    style={
                      lastMove?.row === rowIndex && lastMove?.col === colIndex
                        ? ({
                            ["--fall-distance" as any]: `${
                              -(rowIndex + 1) * 68
                            }px`,
                          } as React.CSSProperties)
                        : undefined
                    }
                    onMouseEnter={() => setHoverCol(colIndex)}
                    onMouseLeave={() => setHoverCol(null)}
                    onClick={() => {
                      if (mode === "friend" || currentPlayer === "red") {
                        dropDisc(colIndex);
                      }
                    }}
                  />
                ))}
              </div>
            ))}
          </div>

          <button className="connect4-restart-button" onClick={resetGame}>
            {t("general.playAgain")}
          </button>
        </div>

        <div className="side right"></div>
      </div>
    </div>
  );
}
