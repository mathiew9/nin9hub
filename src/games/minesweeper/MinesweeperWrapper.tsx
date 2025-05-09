import { useState } from "react";

import "./MinesweeperWrapper.css";

import MinesweeperMenu from "./MinesweeperMenu";
import Minesweeper from "./Minesweeper";

export default function MinesweeperWrapper() {
  const [hasStarted, setHasStarted] = useState(false);
  const [rows, setRows] = useState(9);
  const [cols, setCols] = useState(9);
  const [mines, setMines] = useState(10);

  return (
    <div className="minesweeperWrapper">
      {hasStarted ? (
        <button className="back_button" onClick={() => setHasStarted(false)}>
          Changer de taille
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
