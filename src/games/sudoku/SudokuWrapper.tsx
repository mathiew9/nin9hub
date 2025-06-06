import { useState } from "react";
import SudokuMenu from "./SudokuMenu";
import Sudoku from "./Sudoku";
import "./Sudoku.css";
import { Difficulty } from "./types"; // ajuste le chemin si besoin

export default function SudokuWrapper() {
  const [level, setLevel] = useState<Difficulty | null>(null);

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
