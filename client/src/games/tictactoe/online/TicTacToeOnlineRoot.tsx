import { TicTacToeOnlineProvider } from "./TicTacToeOnlineProvider";
import TicTacToeOnlineContent from "./TicTacToeOnlineContent";

type Props = {
  onBack: () => void;
};

export default function TicTacToeOnlineRoot({ onBack }: Props) {
  return (
    <TicTacToeOnlineProvider>
      <TicTacToeOnlineContent onBack={onBack} />
    </TicTacToeOnlineProvider>
  );
}
