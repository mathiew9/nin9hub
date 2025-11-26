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
    <div className="commonMenu">
      <h2 className="commonMenuTitle">TicTacToe — En ligne</h2>

      <div className="commonMenuButtons">
        <div className="gridSizeSelector">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ROOM CODE"
            className="multiInput"
            onFocus={clearError}
          />
          <button className="commonButton commonMenuButton" onClick={onJoin}>
            Rejoindre
          </button>
        </div>
        <button className="commonButton commonMenuButton" onClick={onCreate}>
          Héberger une partie
        </button>
      </div>

      {lastError && (
        <div className="text-red-600 text-sm">{lastError.message}</div>
      )}

      {roomId && status === "waiting" && (
        <div className="text-gray-600 text-sm">Room créée : {roomId}</div>
      )}
    </div>
  );
}
