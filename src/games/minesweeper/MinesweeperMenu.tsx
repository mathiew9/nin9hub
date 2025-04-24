import "./MinesweeperMenu.css";

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
  return (
    <div className="menuContainer">
      <h2>Paramètres du Démineur</h2>

      <div className="gridSettings">
        <label>
          Lignes :
          <input
            type="number"
            min={5}
            max={30}
            value={rows}
            onChange={(e) => setRows(parseInt(e.target.value))}
          />
        </label>

        <label>
          Colonnes :
          <input
            type="number"
            min={5}
            max={30}
            value={cols}
            onChange={(e) => setCols(parseInt(e.target.value))}
          />
        </label>

        <label>
          Mines :
          <input
            type="number"
            min={1}
            max={rows * cols - 1}
            value={mines}
            onChange={(e) => setMines(parseInt(e.target.value))}
          />
        </label>
      </div>

      <button className="startButton" onClick={onStart}>
        Démarrer la partie
      </button>
    </div>
  );
}
