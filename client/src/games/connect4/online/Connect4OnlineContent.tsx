import { useOnline } from "./Connect4OnlineProvider";
import Connect4OnlineSetup from "./Connect4OnlineSetup";
import Connect4WaitingRoom from "./Connect4WaitingRoom";
import Connect4BoardOnlineAdapter from "./Connect4BoardOnlineAdapter";
import "./Connect4Online.css";

type Props = { onBack: () => void };

export default function Connect4OnlineContent({ onBack }: Props) {
  const { roomId, started, status } = useOnline();

  // Pas dans une room -> setup
  if (!roomId || status === "setup")
    return <Connect4OnlineSetup onBack={onBack} />;

  // Dans une room mais pas démarré -> waiting room
  if (!started) return <Connect4WaitingRoom />;

  // Démarré -> jeu
  return <Connect4BoardOnlineAdapter />;
}
