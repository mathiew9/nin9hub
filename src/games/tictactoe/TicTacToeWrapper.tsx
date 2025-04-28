import { useState } from "react";

import "./TicTacToeWrapper.css";

import TicTacToeMenu from "./TicTacToeMenu";
import TicTacToe from "./TicTacToe";
export default function TicTacToeWrapper() {
  const [mode, setMode] = useState<"ai" | "friend" | null>(null);
  const [gridSize, setGridSize] = useState(3);

  return (
    <div className="tictactoeWrapper">
      <div>
        {mode === null ? (
          <TicTacToeMenu
            onSelectMode={setMode}
            onSelectGridSize={setGridSize}
            gridSize={gridSize}
          />
        ) : (
          <TicTacToe mode={mode} gridSize={gridSize} setMode={setMode} />
        )}
      </div>
    </div>
  );
}
