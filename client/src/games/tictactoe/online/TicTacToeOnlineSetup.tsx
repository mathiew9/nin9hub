import { useState } from "react";
import { useOnline } from "./TicTacToeOnlineProvider";

export default function TicTacToeOnlineSetup() {
  const { createRoom, joinRoom, lastError, clearError, roomId, status } =
    useOnline();
  const [code, setCode] = useState("");

  const onCreate = async () => {
    clearError();
    await createRoom();
  };

  const onJoin = async () => {
    clearError();
    const trimmed = code.trim().toUpperCase();
    if (trimmed) await joinRoom(trimmed);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <h2 className="text-xl font-semibold">TicTacToe — En ligne</h2>

      <div className="flex gap-3">
        <button
          className="px-4 py-2 rounded bg-blue-600 text-white"
          onClick={onCreate}
        >
          Héberger une partie
        </button>

        <div className="flex items-center gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code room (ex: ABC12)"
            className="border rounded px-3 py-2"
            onFocus={clearError}
          />
          <button
            className="px-4 py-2 rounded bg-green-600 text-white"
            onClick={onJoin}
          >
            Rejoindre
          </button>
        </div>
      </div>

      {lastError && (
        <div className="text-red-600 text-sm">{lastError.message}</div>
      )}

      {/* Petit hint si tu as déjà un roomId (après create) */}
      {roomId && status === "waiting" && (
        <div className="text-gray-600 text-sm">Room créée : {roomId}</div>
      )}
    </div>
  );
}
