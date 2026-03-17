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
    <div className="commonMenu minesweeperMenu">
      <h2 className="commonMenuTitle">
        {t("common.difficulty.selectDifficulty")}
      </h2>

      <div className="commonMenuButtons minesweeperMenuList">
        <button
          className="commonButton commonMenuButton msw-menuButton msw-presetButton"
          onClick={() => launchPreset(9, 9, 10)}
        >
          <h3>{t("games.minesweeper.levels.beginner")}</h3>
          <div className="msw-modeStats">
            <div className="msw-infoBox">
              <span className="msw-infoLabel">
                {t("games.minesweeper.labels.grid")}
              </span>
              <span className="msw-infoValue">9 × 9</span>
            </div>
            <div className="msw-infoBox">
              <span className="msw-infoLabel">
                {t("games.minesweeper.labels.mines")}
              </span>
              <span className="msw-infoValue">10</span>
            </div>
          </div>
        </button>

        <button
          className="commonButton commonMenuButton msw-menuButton msw-presetButton"
          onClick={() => launchPreset(16, 16, 40)}
        >
          <h3>{t("games.minesweeper.levels.intermediate")}</h3>
          <div className="msw-modeStats">
            <div className="msw-infoBox">
              <span className="msw-infoLabel">
                {t("games.minesweeper.labels.grid")}
              </span>
              <span className="msw-infoValue">16 × 16</span>
            </div>
            <div className="msw-infoBox">
              <span className="msw-infoLabel">
                {t("games.minesweeper.labels.mines")}
              </span>
              <span className="msw-infoValue">40</span>
            </div>
          </div>
        </button>

        <button
          className="commonButton commonMenuButton msw-menuButton msw-presetButton"
          onClick={() => launchPreset(16, 30, 99)}
        >
          <h3>{t("games.minesweeper.levels.expert")}</h3>
          <div className="msw-modeStats">
            <div className="msw-infoBox">
              <span className="msw-infoLabel">
                {t("games.minesweeper.labels.grid")}
              </span>
              <span className="msw-infoValue">30 × 16</span>
            </div>
            <div className="msw-infoBox">
              <span className="msw-infoLabel">
                {t("games.minesweeper.labels.mines")}
              </span>
              <span className="msw-infoValue">99</span>
            </div>
          </div>
        </button>

        <div className="commonButton commonMenuButton msw-menuButton msw-customCard">
          <h3>{t("games.minesweeper.levels.custom")}</h3>

          <div className="msw-modeStats msw-modeStats--triple">
            <div className="msw-infoBox">
              <span className="msw-infoLabel">
                {t("games.minesweeper.labels.rows")}
              </span>
              <input
                className="msw-customInput"
                type="number"
                min={5}
                max={30}
                value={rows}
                onChange={(e) => setRows(parseInt(e.target.value) || 5)}
              />
            </div>

            <div className="msw-infoBox">
              <span className="msw-infoLabel">
                {t("games.minesweeper.labels.cols")}
              </span>
              <input
                className="msw-customInput"
                type="number"
                min={5}
                max={30}
                value={cols}
                onChange={(e) => setCols(parseInt(e.target.value) || 5)}
              />
            </div>

            <div className="msw-infoBox">
              <span className="msw-infoLabel">
                {t("games.minesweeper.labels.mines")}
              </span>
              <input
                className="msw-customInput"
                type="number"
                min={1}
                max={rows * cols - 1}
                value={mines}
                onChange={(e) =>
                  setMines(
                    Math.max(
                      1,
                      Math.min(rows * cols - 1, parseInt(e.target.value) || 1),
                    ),
                  )
                }
              />
            </div>
          </div>

          <button className=" msw-startButton" onClick={onStart} type="button">
            {t("common.actions.startGame")}
          </button>
        </div>
      </div>
    </div>
  );
}
