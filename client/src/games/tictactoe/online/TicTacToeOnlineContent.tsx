import { useOnline } from "./TicTacToeOnlineProvider";
import TicTacToeOnlineSetup from "./TicTacToeOnlineSetup";
import TicTacToeWaitingRoom from "./TicTacToeWaitingRoom";
import TicTacToeBoardOnlineAdapter from "./TicTacToeBoardOnlineAdapter";
import "./TicTacToeOnline.css";

type Props = {
  onBack: () => void;
};

export default function TicTacToeOnlineContent({ onBack }: Props) {
  const { roomId, role, started } = useOnline();

  if (!roomId || !role) return <TicTacToeOnlineSetup onBack={onBack} />;
  if (!started) return <TicTacToeWaitingRoom />;

  return <TicTacToeBoardOnlineAdapter />;
}
