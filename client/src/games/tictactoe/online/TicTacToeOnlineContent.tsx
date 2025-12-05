import { useOnline } from "./TicTacToeOnlineProvider";
import TicTacToeOnlineSetup from "./TicTacToeOnlineSetup";
import TicTacToeWaitingRoom from "./TicTacToeWaitingRoom";
import TicTacToeBoardOnlineAdapter from "./TicTacToeBoardOnlineAdapter";
import "./TicTacToeOnline.css";

export default function TicTacToeOnlineContent() {
  const { roomId, role, started } = useOnline();

  if (!roomId || !role) return <TicTacToeOnlineSetup />;
  if (!started) return <TicTacToeWaitingRoom />;

  return <TicTacToeBoardOnlineAdapter />;
}
