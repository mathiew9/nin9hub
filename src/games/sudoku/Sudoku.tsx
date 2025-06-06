import { useState, useEffect } from "react";
import { Difficulty, SudokuGrid, Cell } from "./types";
import { generateCompleteGrid, removeCells } from "./sudokuUtils";
import SudokuKeyboard from "./SudokuKeyboard";

type Props = {
  level: Difficulty;
  onBack: () => void;
};

export default function Sudoku({ level, onBack }: Props) {
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

  const [noteMode, setNoteMode] = useState(false);

  const handleInputFromKeyboard = (input: number | null) => {
    if (!selectedCell) return;

    const { row, col } = selectedCell;
    const cell = grid[row][col];
    if (cell.readonly) return;

    const newGrid = [...grid];
    const target = { ...newGrid[row][col] };

    if (input === null) {
      target.value = null;
      target.notes = [];
    } else if (noteMode) {
      target.notes = target.notes.includes(input)
        ? target.notes.filter((n) => n !== input)
        : [...target.notes, input].sort();
    } else {
      if (target.value === input) {
        target.value = null;
      } else {
        target.value = input;
      }
      target.notes = [];
    }

    newGrid[row][col] = target;
    setGrid(newGrid);
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
    const fullGrid = generateCompleteGrid();
    if (fullGrid) {
      const playable = removeCells(fullGrid, level);
      setGrid(playable);
    }
  }, [level]);

  return (
    <div className="sudoku">
      <div className="sudoku-container">
        <button className="commonButton commonMediumButton" onClick={onBack}>
          Retour au menu
        </button>

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
                      cell.value
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
                      </div>
                    ) : (
                      ""
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <SudokuKeyboard
          onInput={handleInputFromKeyboard}
          onDelete={() => handleInputFromKeyboard(null)}
          onToggleNoteMode={() => setNoteMode((prev) => !prev)}
          noteMode={noteMode}
        />
      </div>

      <button
        className="commonButton commonMediumButton"
        onClick={() => {
          const fullGrid = generateCompleteGrid();
          if (fullGrid) {
            const playable = removeCells(fullGrid, level);
            setGrid(playable);
          }
        }}
      >
        Rejouer
      </button>
    </div>
  );
}
