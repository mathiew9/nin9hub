import { useOnline } from "./TicTacToeOnlineProvider";
import TicTacToeOnlineSetup from "./TicTacToeOnlineSetup";
import TicTacToeWaitingRoom from "./TicTacToeWaitingRoom";
import TicTacToeBoardOnlineAdapter from "./TicTacToeBoardOnlineAdapter";
import "./TicTacToeOnline.css";

export default function TicTacToeOnlineContent() {
  const { status } = useOnline();
  if (status === "setup") return <TicTacToeOnlineSetup />;
  if (status === "waiting") return <TicTacToeWaitingRoom />;
  return <TicTacToeBoardOnlineAdapter />;
}
