import { FaInfinity, FaCalendarAlt } from "react-icons/fa";
interface Props {
  onSelectMode: (mode: "infinite" | "daily") => void;
}

export default function HangmanMenu({ onSelectMode }: Props) {
  return (
    <div className="hangmanMenu">
      <h2 className="hangmanMenuTitle">Choisis un mode de jeu</h2>
      <div className="hangmanMenuButtons">
        <button onClick={() => onSelectMode("daily")}>
          <FaCalendarAlt /> Mot du Jour
        </button>
        <button onClick={() => onSelectMode("infinite")}>
          <FaInfinity /> Mode Infini
        </button>
      </div>
    </div>
  );
}
