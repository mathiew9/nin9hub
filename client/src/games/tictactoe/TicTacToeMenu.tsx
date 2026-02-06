import "./TicTacToeMenu.css";
import { useTranslation } from "react-i18next";

interface Props {
  onSelectMode: (mode: "ai" | "friend" | "online") => void;
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
    <div className="commonMenu">
      <h2 className="commonMenuTitle">{t("common.modes.selectGameMode")}</h2>

      <div className="gridSizeSelector">
        <label>{t("common.labels.gridSize")} : </label>
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

      <div className="commonMenuButtons">
        <button
          className="commonButton commonMenuButton"
          onClick={() => onSelectMode("friend")}
        >
          {t("common.modes.playWithFriend")}
        </button>
        <button
          className="commonButton commonMenuButton"
          onClick={() => onSelectMode("ai")}
        >
          {t("common.modes.playWithAi")}
        </button>
        <button
          className="commonButton commonMenuButton"
          onClick={() => onSelectMode("online")}
        >
          {t("common.modes.playOnline")}
        </button>
      </div>
    </div>
  );
}
