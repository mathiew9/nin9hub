import { TicTacToeOnlineProvider } from "./TicTacToeOnlineProvider";
import TicTacToeOnlineContent from "./TicTacToeOnlineContent";

export default function TicTacToeOnlineRoot() {
  return (
    <TicTacToeOnlineProvider>
      <TicTacToeOnlineContent />
    </TicTacToeOnlineProvider>
  );
}
