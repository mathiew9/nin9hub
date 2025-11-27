import { useState } from "react";

import "./MinesweeperWrapper.css";
import { useTranslation } from "react-i18next";
import MinesweeperMenu from "./MinesweeperMenu";
import Minesweeper from "./Minesweeper";

export default function MinesweeperWrapper() {
  const { t } = useTranslation();
  const [hasStarted, setHasStarted] = useState(false);
  const [rows, setRows] = useState(9);
  const [cols, setCols] = useState(9);
  const [mines, setMines] = useState(10);

  return (
    <div className="minesweeperWrapper">
      {hasStarted ? (
        <button
          className="commonButton commonMediumButton"
          onClick={() => setHasStarted(false)}
        >
          {t("minesweeper.changeSize")}
        </button>
      ) : null}

      <div>
        {!hasStarted ? (
          <MinesweeperMenu
            onStart={() => setHasStarted(true)}
            rows={rows}
            cols={cols}
            mines={mines}
            setRows={setRows}
            setCols={setCols}
            setMines={setMines}
          />
        ) : (
          <Minesweeper rows={rows} cols={cols} mines={mines} />
        )}
      </div>
    </div>
  );
}
