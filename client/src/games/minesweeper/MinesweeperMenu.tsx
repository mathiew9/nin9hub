import "./MinesweeperMenu.css";
import { useTranslation } from "react-i18next";

interface Props {
  onStart: () => void;
  rows: number;
  cols: number;
  mines: number;
  setRows: (rows: number) => void;
  setCols: (cols: number) => void;
  setMines: (mines: number) => void;
}

export default function MinesweeperMenu({
  onStart,
  rows,
  cols,
  mines,
  setRows,
  setCols,
  setMines,
}: Props) {
  const { t } = useTranslation();
  const launchPreset = (rows: number, cols: number, mines: number) => {
    setRows(rows);
    setCols(cols);
    setMines(mines);
    setTimeout(onStart, 0);
  };

  return (
    <div className="menuContainer">
      <h2 className="commonMenuTitle">{t("common.selectDifficulty")}</h2>

      <div className="cardGrid">
        <div
          className="modeCard beginner"
          onClick={() => launchPreset(9, 9, 10)}
        >
          <h3>🟢 {t("minesweeper.beginner")}</h3>
          <div className="modeStats">
            <div className="infoBox">
              <span className="infoLabel">{t("minesweeper.grid")}</span>9 × 9
            </div>
            <div className="infoBox">
              <span className="infoLabel">{t("minesweeper.mines")}</span>10
            </div>
          </div>
        </div>

        <div
          className="modeCard intermediate"
          onClick={() => launchPreset(16, 16, 40)}
        >
          <h3>🟠 {t("minesweeper.intermediate")}</h3>
          <div className="modeStats">
            <div className="infoBox">
              <span className="infoLabel">{t("minesweeper.grid")}</span>16 × 16
            </div>
            <div className="infoBox">
              <span className="infoLabel">{t("minesweeper.mines")}</span>40
            </div>
          </div>
        </div>

        <div
          className="modeCard expert"
          onClick={() => launchPreset(16, 30, 99)}
        >
          <h3>🔴 {t("minesweeper.expert")}</h3>
          <div className="modeStats">
            <div className="infoBox">
              <span className="infoLabel">{t("minesweeper.grid")}</span>30 × 16
            </div>
            <div className="infoBox">
              <span className="infoLabel">{t("minesweeper.mines")}</span>99
            </div>
          </div>
        </div>

        <div className="modeCard custom">
          <h3>⚙️ {t("minesweeper.custom")}</h3>
          <label>
            {t("minesweeper.rows")} :
            <input
              type="number"
              min={5}
              max={30}
              value={rows}
              onChange={(e) => setRows(parseInt(e.target.value))}
            />
          </label>
          <label>
            {t("minesweeper.cols")} :
            <input
              type="number"
              min={5}
              max={30}
              value={cols}
              onChange={(e) => setCols(parseInt(e.target.value))}
            />
          </label>
          <label>
            {t("minesweeper.mines")} :
            <input
              type="number"
              min={1}
              max={rows * cols - 1}
              value={mines}
              onChange={(e) => setMines(parseInt(e.target.value))}
            />
          </label>
          <button onClick={onStart}>{t("minesweeper.start")}</button>
        </div>
      </div>
    </div>
  );
}
