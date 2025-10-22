import { TicTacToeOnlineProvider, useOnline } from "./TicTacToeOnlineProvider";
import TicTacToeOnlineSetup from "./TicTacToeOnlineSetup";
import TicTacToeWaitingRoom from "./TicTacToeWaitingRoom";
import TicTacToeBoardOnlineAdapter from "./TicTacToeBoardOnlineAdapter";

function Inner() {
  const { status } = useOnline();
  if (status === "setup") return <TicTacToeOnlineSetup />;
  if (status === "waiting") return <TicTacToeWaitingRoom />;
  return <TicTacToeBoardOnlineAdapter />; // <-- ici
}

export default function TicTacToeOnlineRoot() {
  return (
    <TicTacToeOnlineProvider>
      <Inner />
    </TicTacToeOnlineProvider>
  );
}
