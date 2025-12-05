import { useState, useMemo } from "react";
import { useOnline } from "./TicTacToeOnlineProvider";

type Player = "X" | "O";

function otherRole(r: Player): Player {
  return r === "X" ? "O" : "X";
}

export default function TicTacToeWaitingRoom() {
  const {
    roomId,
    role, // "X" | "O" | null (ton rôle à toi)
    playersCount, // 1 | 2
    opponentLeft,
    lastError,
    clearError,
    startGame,
    leave,
    isHost, // ✅ exposé par le hook (myId === hostId)
  } = useOnline();

  const canStart = isHost && playersCount === 2;

  // Déduire le rôle de l’hôte et de l’invité, même après promotion.
  // - Si je suis hôte et j’ai un rôle -> hostRole = role
  // - Si je ne suis pas hôte et j’ai un rôle -> hostRole = autre(role)
  // - Sinon (pas encore assigné) -> fallback "X"
  const hostRole: Player = useMemo(() => {
    if (role) return isHost ? role : otherRole(role);
    return "X";
  }, [role, isHost]);

  const guestRole: Player = useMemo(() => {
    return hostRole === "X" ? "O" : "X";
  }, [hostRole]);

  const hostConnected = true; // hôte = forcément présent (toi ou l’autre)
  const guestConnected = playersCount === 2;

  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!roomId) return;
    await navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="commonMenu waitingRoom waitingRoom--dark">
      <h3 className="commonMenuTitle">Salle d’attente</h3>

      {/* Code room (copiable uniquement par l’hôte) */}
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

      {/* Tableau joueurs + rôles (l’hôte peut être X ou O) */}
      <div className="wr-table">
        <div className="wr-tableHead">
          <div className="wr-th wr-th--player">Joueurs</div>
          <div className="wr-th wr-th--role">Rôle</div>
        </div>

        {/* Ligne Hôte */}
        <div className="wr-row commonBox">
          <div className="wr-cell wr-cell--player">
            <span
              className={`wr-dot ${hostConnected ? "online" : "offline"}`}
            />
            <span className="wr-playerName">Hôte {isHost ? "(toi)" : ""}</span>
          </div>
          <div className="wr-cell wr-cell--role">
            <span
              className={`wr-role ${
                hostRole === "X" ? "wr-role--x" : "wr-role--o"
              }`}
            >
              {hostRole}
            </span>
          </div>
        </div>

        {/* Ligne Invité */}
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
                guestConnected
                  ? guestRole === "X"
                    ? "wr-role--x"
                    : "wr-role--o"
                  : "wr-role--ghost"
              }`}
            >
              {guestRole}
            </span>
          </div>
        </div>
      </div>

      {/* Badges d’info */}
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

      {/* Actions : bouton principal dépend d'isHost */}
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
