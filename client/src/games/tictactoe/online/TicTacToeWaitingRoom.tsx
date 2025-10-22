import { useOnline } from "./TicTacToeOnlineProvider";

export default function TicTacToeWaitingRoom() {
  const {
    roomId,
    role,
    playersCount,
    opponentLeft,
    startGame,
    leave,
    lastError,
    clearError,
  } = useOnline();

  const isHost = role === "X";
  const canStart = isHost && playersCount === 2;

  const copy = async () => {
    if (!roomId) return;
    await navigator.clipboard.writeText(roomId);
  };

  return (
    <div className="flex flex-col items-center gap-3 p-6">
      <h3 className="text-lg font-semibold">Salle d’attente</h3>

      <div className="flex items-center gap-2">
        <div className="font-mono text-2xl">{roomId}</div>
        <button className="px-3 py-1 rounded border" onClick={copy}>
          Copier
        </button>
      </div>

      <div className="text-gray-700">
        Ton rôle : <b>{role}</b> — Joueurs connectés : <b>{playersCount}/2</b>
      </div>

      {opponentLeft && (
        <div className="text-amber-600">Ton adversaire a quitté la partie.</div>
      )}

      {lastError && <div className="text-red-600">{lastError.message}</div>}

      <div className="flex gap-2 mt-2">
        <button
          className={`px-4 py-2 rounded ${
            canStart
              ? "bg-blue-600 text-white"
              : "bg-gray-300 text-gray-600 cursor-not-allowed"
          }`}
          onClick={() => {
            clearError();
            startGame();
          }}
          disabled={!canStart}
        >
          Commencer la partie
        </button>

        <button className="px-4 py-2 rounded border" onClick={() => leave()}>
          Quitter
        </button>
      </div>

      {!isHost && playersCount === 2 && (
        <div className="text-gray-600 text-sm">
          En attente que l’hôte démarre…
        </div>
      )}
    </div>
  );
}
