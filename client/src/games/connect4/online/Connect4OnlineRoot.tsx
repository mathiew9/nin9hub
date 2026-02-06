import { Connect4OnlineProvider } from "./Connect4OnlineProvider";
import Connect4OnlineContent from "./Connect4OnlineContent";

type Props = {
  onBack: () => void;
};

export default function Connect4OnlineRoot({ onBack }: Props) {
  return (
    <Connect4OnlineProvider>
      <Connect4OnlineContent onBack={onBack} />
    </Connect4OnlineProvider>
  );
}
