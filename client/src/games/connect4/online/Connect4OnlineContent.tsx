import { useOnline } from "./Connect4OnlineProvider";
import Connect4OnlineSetup from "./Connect4OnlineSetup";
import Connect4WaitingRoom from "./Connect4WaitingRoom";
import Connect4BoardOnlineAdapter from "./Connect4BoardOnlineAdapter";
import "./Connect4Online.css";

type Props = {
  onBack: () => void;
};

export default function Connect4OnlineContent({ onBack }: Props) {
  const { roomId, role, started } = useOnline();

  if (!roomId || !role) return <Connect4OnlineSetup onBack={onBack} />;
  if (!started) return <Connect4WaitingRoom />;

  return <Connect4BoardOnlineAdapter />;
}
