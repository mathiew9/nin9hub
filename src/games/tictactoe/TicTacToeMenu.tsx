import "./TicTacToeMenu.css";
import { useTranslation } from "react-i18next";

interface Props {
  onSelectMode: (mode: "ai" | "friend") => void;
  onSelectGridSize: (size: number) => void;
  gridSize: number;
}

export default function TicTacToeMenu({
  onSelectMode,
  onSelectGridSize,
  gridSize,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="menuContainer">
      <h2>{t("tictactoe.selectgamemode")}</h2>

      <div className="gridSizeSelector">
        <label htmlFor="gridSize">{t("tictactoe.gridsize")} : </label>
        <select
          id="gridSize"
          value={gridSize}
          onChange={(e) => onSelectGridSize(parseInt(e.target.value))}
        >
          {[3, 4, 5].map((size) => (
            <option key={size} value={size}>
              {size} x {size}
            </option>
          ))}
        </select>
      </div>

      <div className="selectModeButtonContainer">
        <button
          className="selectModeButton"
          onClick={() => onSelectMode("friend")}
        >
          {t("tictactoe.playwithfriend")}
        </button>
        <button className="selectModeButton" onClick={() => onSelectMode("ai")}>
          {t("tictactoe.playwithai")}
        </button>
      </div>
    </div>
  );
}
