const COLS = 7;

export type Disc = "red" | "yellow" | null;
export type WinningCell = { row: number; col: number };

type Props = {
  board: Disc[][];
  currentPlayer: "red" | "yellow";
  winner: "red" | "yellow" | null;
  isDraw: boolean;

  // UI state (hover)
  hoverCol: number | null;
  setHoverCol: (col: number | null) => void;

  // Highlight win
  winningCells: WinningCell[];

  // Interaction policy (ex: friend always true, ai only true for red, online true only for my turn)
  canInteract: boolean;

  // Callbacks
  dropDisc: (col: number) => void;

  // Helpers (computed in parent to keep board dumb)
  isHoveredPlayable: (row: number, col: number) => boolean;
  isColumnFull: (col: number) => boolean;
};

export default function Connect4Board({
  board,
  currentPlayer,
  winner,
  isDraw,
  hoverCol,
  setHoverCol,
  winningCells,
  canInteract,
  dropDisc,
  isHoveredPlayable,
  isColumnFull,
}: Props) {
  const canPlayNow = canInteract && !winner && !isDraw;

  return (
    <div className="connect4-board">
      {/* Jeton fantôme au-dessus de la colonne survolée */}
      {hoverCol !== null && canPlayNow && !isColumnFull(hoverCol) && (
        <div
          key={`${currentPlayer}-${hoverCol}`}
          className={`ghost-token ${currentPlayer}`}
          style={{
            left: `${hoverCol * 68 + 13}px`,
            top: "-70px",
          }}
        />
      )}

      {/* Overlays cliquables par colonne */}
      <div className="column-overlays">
        {Array(COLS)
          .fill(null)
          .map((_, colIndex) => (
            <div
              key={colIndex}
              className={`column-overlay ${
                isColumnFull(colIndex) ? "col-full" : "col-playable"
              }`}
              onMouseEnter={() => setHoverCol(colIndex)}
              onMouseLeave={() => setHoverCol(null)}
              onClick={() => {
                if (canPlayNow && !isColumnFull(colIndex)) {
                  dropDisc(colIndex);
                }
              }}
            />
          ))}
      </div>

      {/* Grille */}
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="row">
          {row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={[
                "cell",
                cell ? cell : "",
                canPlayNow && isHoveredPlayable(rowIndex, colIndex)
                  ? `hoverable hoverable-${currentPlayer}`
                  : "",
                winningCells.some(
                  (c) => c.row === rowIndex && c.col === colIndex,
                )
                  ? "cell--win"
                  : "",
              ].join(" ")}
              onMouseEnter={() => setHoverCol(colIndex)}
              onMouseLeave={() => setHoverCol(null)}
              onClick={() => {
                if (canPlayNow) dropDisc(colIndex);
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
