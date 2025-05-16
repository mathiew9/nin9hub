interface Props {
  onSelectMode: (mode: "infinite" | "daily") => void;
}

export default function HangmanMenu({ onSelectMode }: Props) {
  return (
    <div className="hangmanMenu">
      <h2>Choisis un mode de jeu</h2>
      <button onClick={() => onSelectMode("infinite")}>Mode Infini</button>
      <button onClick={() => onSelectMode("daily")}>Mot du Jour</button>
    </div>
  );
}
