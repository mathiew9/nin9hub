import { useOnline } from "./TicTacToeOnlineProvider";

export default function TicTacToeBoardOnline() {
  const {
    board,
    turn,
    winner,
    role,
    canPlay,
    playTurn,
    requestRematch,
    leave,
    rematchVotes,
  } = useOnline();

  const onCell = (i: number) => {
    if (winner) return;
    if (!canPlay) return;
    playTurn(i);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="text-gray-700">
        Rôle : <b>{role ?? "-"}</b> —{" "}
        {winner ? (
          <span>
            Résultat :{" "}
            <b>{winner === "draw" ? "Égalité" : `${winner} gagne`}</b>
          </span>
        ) : (
          <span>
            Tour de : <b>{turn}</b>
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => onCell(i)}
            disabled={!!winner || !!cell || !canPlay}
            className={`w-16 h-16 text-2xl font-bold border rounded flex items-center justify-center
              ${cell ? "bg-gray-100" : "bg-white"} ${
              !canPlay ? "opacity-60" : ""
            }`}
          >
            {cell ?? ""}
          </button>
        ))}
      </div>

      {!winner ? (
        <div className="text-sm text-gray-600">
          {canPlay ? "À toi de jouer." : "En attente de l’adversaire…"}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 rounded bg-green-600 text-white"
            onClick={() => requestRematch()}
          >
            Rejouer
          </button>
          <span className="text-gray-700 text-sm">
            Votes rematch : {rematchVotes}/2
          </span>
          <button className="px-4 py-2 rounded border" onClick={() => leave()}>
            Quitter
          </button>
        </div>
      )}
    </div>
  );
}
