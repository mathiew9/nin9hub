import { useState, useEffect, useRef, useMemo } from "react";
import { Difficulty, SudokuGrid, Cell, StoredSudokuGame } from "./types";
import { generateCompleteGrid, removeCells, isValid } from "./sudokuUtils";
import { generateDailyGrid } from "./sudokuDailyUtils";
import { saveGame, loadGame } from "../../utils/storage";
import { useTranslation } from "react-i18next";
import { FaExclamation } from "react-icons/fa";
import SudokuKeyboard from "./SudokuKeyboard";

type Props = {
  level: Difficulty;
  onBack: () => void;
};

export default function Sudoku({ level, onBack }: Props) {
  const { t } = useTranslation();
  const [grid, setGrid] = useState<SudokuGrid>(
    Array.from({ length: 9 }, () =>
      Array.from(
        { length: 9 },
        (): Cell => ({
          value: null,
          notes: [],
          readonly: false,
        })
      )
    )
  );

  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [newGridRequested, setNewGridRequested] = useState(false);
  const [noteMode, setNoteMode] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const numberCounts = useMemo(() => {
    const counts = Array(10).fill(0); // index 0 inutilisé
    for (let row of grid) {
      for (let cell of row) {
        if (cell.value !== null) {
          counts[cell.value]++;
        }
      }
    }
    return counts;
  }, [grid]);
  const hasGenerated = useRef(false);
  const hasUserStarted = useRef(false);

  const handleInputFromKeyboard = (input: number | null) => {
    if (gameFinished) return;
    if (!selectedCell) return;

    const { row, col } = selectedCell;
    const cell = grid[row][col];

    if (
      !hasUserStarted.current &&
      typeof input === "number" &&
      !cell.readonly
    ) {
      hasUserStarted.current = true;
    }
    if (cell.readonly) return;

    const newGrid = grid.map((r) => r.map((c) => ({ ...c })));
    const target = newGrid[row][col];

    if (input === null) {
      target.value = null;
      target.notes = [];
    } else if (noteMode) {
      target.notes = target.notes.includes(input)
        ? target.notes.filter((n) => n !== input)
        : [...target.notes, input].sort();
    } else {
      const count = numberCounts[input];
      const currentValue = grid[row][col].value;
      const isTryingToRemoveSameValue = currentValue === input;

      if (count >= 9 && !isTryingToRemoveSameValue) return;

      const isSameValue = target.value === input;

      if (isSameValue) {
        target.value = null;
        // On ne touche pas aux notes dans ce cas
      } else {
        target.value = input;
        target.notes = [];

        // Supprimer ce chiffre des notes de la même ligne, colonne et bloc
        for (let i = 0; i < 9; i++) {
          // Ligne
          if (
            !newGrid[row][i].readonly &&
            newGrid[row][i].notes.includes(input)
          ) {
            newGrid[row][i].notes = newGrid[row][i].notes.filter(
              (n) => n !== input
            );
          }
          // Colonne
          if (
            !newGrid[i][col].readonly &&
            newGrid[i][col].notes.includes(input)
          ) {
            newGrid[i][col].notes = newGrid[i][col].notes.filter(
              (n) => n !== input
            );
          }
        }

        // Bloc 3x3
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let r = startRow; r < startRow + 3; r++) {
          for (let c = startCol; c < startCol + 3; c++) {
            if (
              !newGrid[r][c].readonly &&
              newGrid[r][c].notes.includes(input)
            ) {
              newGrid[r][c].notes = newGrid[r][c].notes.filter(
                (n) => n !== input
              );
            }
          }
        }
      }
    }

    setGrid(markGridErrors(newGrid));

    hasUserStarted.current = true;
    if (isGridComplete(newGrid)) {
      setGameFinished(true);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }

      if (!selectedCell) return;
      const { row, col } = selectedCell;

      if (e.key >= "1" && e.key <= "9") {
        handleInputFromKeyboard(parseInt(e.key));
      } else if (["Delete", "Backspace"].includes(e.key)) {
        handleInputFromKeyboard(null);
      } else if (e.key === "ArrowUp" && row > 0) {
        setSelectedCell({ row: row - 1, col });
      } else if (e.key === "ArrowDown" && row < 8) {
        setSelectedCell({ row: row + 1, col });
      } else if (e.key === "ArrowLeft" && col > 0) {
        setSelectedCell({ row, col: col - 1 });
      } else if (e.key === "ArrowRight" && col < 8) {
        setSelectedCell({ row, col: col + 1 });
      }
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCell, noteMode, grid]);

  useEffect(() => {
    if (hasGenerated.current) return;

    const today = new Date().toISOString().slice(0, 10);

    if (level === "daily") {
      const saved = loadGame<StoredSudokuGame>("ninehub.sudoku.daily");
      if (saved && saved.date === today) {
        setGrid(saved.grid);
        setGameFinished(saved.gameFinished);
      } else {
        const result = generateDailyGrid(today);
        if (result) {
          setGrid(result.grid);
          saveGame("ninehub.sudoku.daily", {
            grid: result.grid,
            solution: result.solution,
            level: "daily",
            gameFinished: false,
            date: today,
          });
        }
      }
      hasGenerated.current = true;
    } else {
      const saved = loadGame<StoredSudokuGame>("ninehub.sudoku.current");
      if (saved && saved.level === level) {
        setGrid(saved.grid);
        setGameFinished(saved.gameFinished);
      } else {
        const fullGrid = generateCompleteGrid();
        if (fullGrid) {
          const playable = removeCells(fullGrid, level);
          setGrid(playable);
          saveGame("ninehub.sudoku.current", {
            grid: playable,
            solution: fullGrid,
            level,
            gameFinished: false,
          });
        }
      }

      hasGenerated.current = true;
    }
  }, [level]);

  useEffect(() => {
    if (!hasGenerated.current) return;
    const key =
      level === "daily" ? "ninehub.sudoku.daily" : "ninehub.sudoku.current";
    const saved = loadGame(key);
    if (!saved) return;

    saveGame(key, {
      ...saved,
      grid,
      gameFinished,
    });
  }, [grid, gameFinished]);

  function hasUserInput(grid: SudokuGrid): boolean {
    return grid.some((row) =>
      row.some((cell) => !cell.readonly && cell.value !== null)
    );
  }

  return (
    <div className="sudoku">
      <button className="commonButton commonMediumButton" onClick={onBack}>
        {t("common.changeLevel")}
      </button>
      <div className="sudoku-current-level">
        {t("common.level")} : {t(`common.${level}`)}
      </div>
      <div className="commonGameLayout">
        <div className="side hidden" />
        <div className="center">
          <div className="sudoku-table">
            {grid.map((row, rowIndex) => (
              <div className="sudoku-row" key={rowIndex}>
                {row.map((cell, colIndex) => {
                  const localRow = rowIndex % 3;
                  const localCol = colIndex % 3;
                  const blockPosition = localRow * 3 + localCol + 1;

                  const selected =
                    selectedCell?.row === rowIndex &&
                    selectedCell?.col === colIndex;
                  const sameRow = selectedCell?.row === rowIndex;
                  const sameCol = selectedCell?.col === colIndex;
                  const sameBlock =
                    Math.floor(rowIndex / 3) ===
                      Math.floor((selectedCell?.row ?? -1) / 3) &&
                    Math.floor(colIndex / 3) ===
                      Math.floor((selectedCell?.col ?? -1) / 3);
                  const userValue = cell.value !== null && !cell.readonly;
                  const selectedValue =
                    selectedCell &&
                    grid[selectedCell.row][selectedCell.col].value;
                  const sameValue =
                    selectedValue !== null &&
                    cell.value === selectedValue &&
                    !selected;

                  const classes = [
                    "sudoku-cell",
                    `cell-pos-${blockPosition}`,
                    selected ? "selected" : "",
                    sameRow ? "same-row" : "",
                    sameCol ? "same-col" : "",
                    sameBlock ? "same-block" : "",
                    sameValue ? "same-value" : "",
                    cell.readonly ? "readonly" : "",
                    userValue ? "user-value" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={classes}
                      onClick={() =>
                        setSelectedCell({ row: rowIndex, col: colIndex })
                      }
                    >
                      {cell.value !== null ? (
                        <>
                          {cell.value}
                          {cell.hasError && (
                            <span className="sudoku-error-icon">
                              <FaExclamation />
                            </span>
                          )}
                        </>
                      ) : cell.notes.length > 0 ? (
                        <div className="note-grid">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                            <span
                              key={n}
                              className={`note ${
                                cell.notes.includes(n) ? "active" : ""
                              }`}
                            >
                              {cell.notes.includes(n) ? n : ""}
                            </span>
                          ))}
                          {cell.hasError && (
                            <span className="sudoku-error-icon">
                              <FaExclamation />
                            </span>
                          )}
                        </div>
                      ) : (
                        cell.hasError && (
                          <span className="sudoku-error-icon">
                            <FaExclamation />
                          </span>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="side sudoku-right">
          <SudokuKeyboard
            onInput={handleInputFromKeyboard}
            onDelete={() => handleInputFromKeyboard(null)}
            onToggleNoteMode={() => setNoteMode((prev) => !prev)}
            noteMode={noteMode}
            numberCounts={numberCounts}
          />

          {gameFinished && (
            <div className="sudoku-end-banner">
              <div className="sudoku-end-title">{t("sudoku.completed")}</div>
            </div>
          )}
          {level !== "daily" && (
            <button
              className="commonButton commonMediumButton sudokuNewGridButton"
              onClick={() => {
                if (!gameFinished && hasUserInput(grid)) {
                  setNewGridRequested(true);
                  return;
                }

                const fullGrid = generateCompleteGrid();
                if (fullGrid) {
                  const playable = removeCells(
                    fullGrid,
                    level as "easy" | "medium" | "hard"
                  );
                  setGrid(playable);
                  setGameFinished(false);
                }
              }}
            >
              {t("sudoku.newGrid")}
            </button>
          )}

          {newGridRequested && (
            <div className="sudoku-confirm-popup">
              <div className="sudoku-confirm-popup-content">
                <p>{t("sudoku.popupWarning1")}</p>
                <p>{t("sudoku.popupWarning2")}</p>
                <p>{t("sudoku.popupWarning3")}</p>
                <div className="sudoku-confirm-buttons">
                  <button
                    className="commonButton"
                    onClick={() => setNewGridRequested(false)}
                  >
                    {t("sudoku.cancel")}
                  </button>
                  <button
                    className="commonButton"
                    onClick={() => {
                      const fullGrid = generateCompleteGrid();
                      if (fullGrid) {
                        const playable = removeCells(
                          fullGrid,
                          level as "easy" | "medium" | "hard"
                        );
                        setGrid(playable);
                        setGameFinished(false);
                      }
                      setNewGridRequested(false);
                    }}
                  >
                    {t("sudoku.continue")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function isGridComplete(grid: SudokuGrid): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const value = grid[row][col].value;
      if (!value || !isValid(grid, row, col, value)) {
        console.log("Grille pas finie ou fausse");
        return false;
      }
    }
  }
  console.log("Grille complete");
  return true;
}

function markGridErrors(grid: SudokuGrid): SudokuGrid {
  const newGrid = grid.map((row) =>
    row.map((cell) => ({ ...cell, hasError: false }))
  );

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const value = grid[row][col].value;
      if (value === null) continue;

      // Check row
      for (let c = 0; c < 9; c++) {
        if (c !== col && grid[row][c].value === value) {
          newGrid[row][col].hasError = true;
          newGrid[row][c].hasError = true;
        }
      }

      // Check column
      for (let r = 0; r < 9; r++) {
        if (r !== row && grid[r][col].value === value) {
          newGrid[row][col].hasError = true;
          newGrid[r][col].hasError = true;
        }
      }

      // Check block
      const startRow = Math.floor(row / 3) * 3;
      const startCol = Math.floor(col / 3) * 3;
      for (let r = startRow; r < startRow + 3; r++) {
        for (let c = startCol; c < startCol + 3; c++) {
          if ((r !== row || c !== col) && grid[r][c].value === value) {
            newGrid[row][col].hasError = true;
            newGrid[r][c].hasError = true;
          }
        }
      }
    }
  }

  return newGrid;
}
