import { useState } from "react";
import { useTranslation } from "react-i18next";

import "./TicTacToeWrapper.css";

import TicTacToeMenu from "./TicTacToeMenu";
import TicTacToe from "./TicTacToe";
export default function TicTacToeWrapper() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"ai" | "friend" | null>(null);
  const [gridSize, setGridSize] = useState(3);

  return (
    <div className="tictactoeWrapper">
      {mode ? (
        <button className="back_button" onClick={() => setMode(null)}>
          {t("tictactoe.changeGameMode")}
        </button>
      ) : null}

      <div>
        {mode === null ? (
          <TicTacToeMenu
            onSelectMode={setMode}
            onSelectGridSize={setGridSize}
            gridSize={gridSize}
          />
        ) : (
          <TicTacToe mode={mode} gridSize={gridSize} />
        )}
      </div>
    </div>
  );
}
