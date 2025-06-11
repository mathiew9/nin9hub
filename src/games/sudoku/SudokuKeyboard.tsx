import { FaEraser } from "react-icons/fa";
import { FaRegPenToSquare } from "react-icons/fa6";
type Props = {
  onInput: (value: number) => void;
  onDelete: () => void;
  onToggleNoteMode: () => void;
  noteMode: boolean;
  numberCounts: number[]; // index 1 à 9
};

export default function SudokuKeyboard({
  onInput,
  onDelete,
  onToggleNoteMode,
  noteMode,
  numberCounts,
}: Props) {
  return (
    <div className="sudoku-keyboard">
      <div className="keyboard-controls">
        <button className="keyboard-button control" onClick={onDelete}>
          <FaEraser />
        </button>
        <button
          className={`keyboard-button control ${noteMode ? "active" : ""}`}
          onClick={onToggleNoteMode}
        >
          <FaRegPenToSquare />
        </button>
      </div>

      <div className="keyboard-numbers">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
          const count = numberCounts[num];
          const remaining = 9 - count;
          const disabled = remaining <= 0;

          return (
            <button
              key={num}
              className="keyboard-button"
              onClick={() => onInput(num)}
              disabled={disabled}
            >
              {num}
              <span className="number-counter">{remaining}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
