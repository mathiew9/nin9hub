import { useState } from "react";
import { generateRoomId } from "../../utils/generateRoomId";

interface Props {
  onCreate: (roomId: string) => void;
  onJoin: (roomId: string) => void;
  goBack: () => void;
}

export default function TicTacToeOnlineSetup({
  onCreate,
  onJoin,
  goBack,
}: Props) {
  const [roomIdInput, setRoomIdInput] = useState("");

  const create = () => {
    const id = generateRoomId();
    onCreate(id); // le parent appellera hook.joinRoom(id)
  };

  const join = () => {
    const code = roomIdInput.trim().toUpperCase();
    if (!code) return;
    onJoin(code); // le parent appellera hook.joinRoom(code)
  };

  return (
    <div className="tictactoe">
      <h2>Créer ou rejoindre une partie en ligne</h2>

      <button onClick={create}>Héberger une partie</button>

      <div>
        <input
          type="text"
          placeholder="Code de la room"
          value={roomIdInput}
          onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
        />
        <button onClick={join}>Rejoindre</button>
      </div>

      <button onClick={goBack} className="commonButton">
        Retour
      </button>
    </div>
  );
}
