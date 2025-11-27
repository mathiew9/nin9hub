import { useState } from "react";
import { useOnline } from "./TicTacToeOnlineProvider";

export default function TicTacToeWaitingRoom() {
  const {
    roomId,
    role,
    playersCount,
    opponentLeft,
    lastError,
    clearError,
    startGame,
    leave,
  } = useOnline();

  const isHost = role === "X";
  const canStart = isHost && playersCount === 2;

  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!roomId) return;
    await navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const hostConnected = true;
  const guestConnected = playersCount === 2;

  return (
    <div className="commonMenu waitingRoom waitingRoom--dark">
      <h3 className="commonMenuTitle">Salle d’attente</h3>

      <div className="wr-room">
        <div className="wr-roomLabel">Code de la room</div>

        <div
          className={`wr-roomBox wr-roomBox--grid ${
            isHost ? "" : "wr-roomBox--readonly"
          }`}
        >
          <span className="wr-roomCode">{roomId}</span>

          {isHost ? (
            <button
              className="commonButton commonMenuButton wr-btn"
              onClick={copy}
            >
              {copied ? "Copié ✓" : "Copier"}
            </button>
          ) : null}
        </div>

        <div className="wr-hint">
          {isHost ? "Partage ce code à ton ami." : "Code de la room."}
        </div>
      </div>

      <div className="wr-table">
        <div className="wr-tableHead">
          <div className="wr-th wr-th--player">Joueurs</div>
          <div className="wr-th wr-th--role">Rôle</div>
        </div>

        <div className="wr-row commonBox">
          <div className="wr-cell wr-cell--player">
            <span
              className={`wr-dot ${hostConnected ? "online" : "offline"}`}
            />
            <span className="wr-playerName">Hôte {isHost ? "(toi)" : ""}</span>
          </div>
          <div className="wr-cell wr-cell--role">
            <span className="wr-role wr-role--x">X</span>
          </div>
        </div>

        <div className="wr-row commonBox">
          <div className="wr-cell wr-cell--player">
            <span
              className={`wr-dot ${guestConnected ? "online" : "offline"}`}
            />
            <span className="wr-playerName">
              {guestConnected
                ? isHost
                  ? "Invité"
                  : "Invité (toi)"
                : "En attente…"}
            </span>
          </div>
          <div className="wr-cell wr-cell--role">
            <span
              className={`wr-role ${
                guestConnected ? "wr-role--o" : "wr-role--ghost"
              }`}
            >
              O
            </span>
          </div>
        </div>
      </div>

      <div className="wr-badgesRow">
        {opponentLeft && (
          <span className="wr-alert warn">
            L’adversaire a quitté la partie.
          </span>
        )}
        {lastError && (
          <span className="wr-alert error" onClick={clearError}>
            {lastError.message}
          </span>
        )}
      </div>

      <div className="wr-actions">
        <button
          className={`commonButton commonMenuButton wr-btn ${
            isHost ? (canStart ? "" : "is-disabled") : "is-disabled"
          }`}
          onClick={() => {
            if (isHost && canStart) {
              clearError();
              startGame();
            }
          }}
          disabled={!isHost || !canStart}
        >
          {isHost ? "Commencer la partie" : "En attente que l’hôte démarre…"}
        </button>

        <button
          className="commonButton commonMenuButton wr-btn"
          onClick={() => leave()}
        >
          Quitter
        </button>
      </div>
    </div>
  );
}
