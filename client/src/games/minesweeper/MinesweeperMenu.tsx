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
      <h2 className="commonMenuTitle">
        {t("common.difficulty.selectDifficulty")}
      </h2>

      <div className="cardGrid">
        <div
          className="modeCard beginner"
          onClick={() => launchPreset(9, 9, 10)}
        >
          <h3>🟢 {t("games.minesweeper.levels.beginner")}</h3>
          <div className="modeStats">
            <div className="infoBox">
              <span className="infoLabel">
                {t("games.minesweeper.labels.grid")}
              </span>
              9 × 9
            </div>
            <div className="infoBox">
              <span className="infoLabel">
                {t("games.minesweeper.labels.mines")}
              </span>
              10
            </div>
          </div>
        </div>

        <div
          className="modeCard intermediate"
          onClick={() => launchPreset(16, 16, 40)}
        >
          <h3>🟠 {t("games.minesweeper.levels.intermediate")}</h3>
          <div className="modeStats">
            <div className="infoBox">
              <span className="infoLabel">
                {t("games.minesweeper.labels.grid")}
              </span>
              16 × 16
            </div>
            <div className="infoBox">
              <span className="infoLabel">
                {t("games.minesweeper.labels.mines")}
              </span>
              40
            </div>
          </div>
        </div>

        <div
          className="modeCard expert"
          onClick={() => launchPreset(16, 30, 99)}
        >
          <h3>🔴 {t("games.minesweeper.levels.expert")}</h3>
          <div className="modeStats">
            <div className="infoBox">
              <span className="infoLabel">
                {t("games.minesweeper.labels.grid")}
              </span>
              30 × 16
            </div>
            <div className="infoBox">
              <span className="infoLabel">
                {t("games.minesweeper.labels.mines")}
              </span>
              99
            </div>
          </div>
        </div>

        <div className="modeCard custom">
          <h3>⚙️ {t("games.minesweeper.levels.custom")}</h3>
          <label>
            {t("games.minesweeper.labels.rows")} :
            <input
              type="number"
              min={5}
              max={30}
              value={rows}
              onChange={(e) => setRows(parseInt(e.target.value))}
            />
          </label>
          <label>
            {t("games.minesweeper.labels.cols")} :
            <input
              type="number"
              min={5}
              max={30}
              value={cols}
              onChange={(e) => setCols(parseInt(e.target.value))}
            />
          </label>
          <label>
            {t("games.minesweeper.labels.mines")} :
            <input
              type="number"
              min={1}
              max={rows * cols - 1}
              value={mines}
              onChange={(e) => setMines(parseInt(e.target.value))}
            />
          </label>
          <button onClick={onStart}>{t("common.actions.startGame")}</button>
        </div>
      </div>
    </div>
  );
}
