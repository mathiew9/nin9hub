import { useState, useEffect } from "react";
import { loadGame } from "../../utils/storage";
import SudokuMenu from "./SudokuMenu";
import Sudoku from "./Sudoku";
import "./Sudoku.css";
import { Difficulty } from "./types";

type SavedSudoku = {
  grid: any;
  solution: any;
  level: Difficulty;
  gameFinished: boolean;
};

export default function SudokuWrapper() {
  const [level, setLevel] = useState<Difficulty | null>(null);

  useEffect(() => {
    const saved = loadGame<SavedSudoku>("sudoku.current");
    if (saved && !saved.gameFinished) {
      setLevel(saved.level);
    }
  }, []);

  const handleStart = (chosenLevel: Difficulty) => {
    setLevel(chosenLevel);
  };

  const handleBackToMenu = () => {
    setLevel(null);
  };

  return (
    <div className="sudoku-wrapper">
      {level ? (
        <Sudoku level={level} onBack={handleBackToMenu} />
      ) : (
        <SudokuMenu onStart={handleStart} />
      )}
    </div>
  );
}
