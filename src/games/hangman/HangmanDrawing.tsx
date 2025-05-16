interface Props {
  errors: number; // 0 → 6
}

export default function HangmanDrawing({ errors }: Props) {
  return (
    <div className="hangmanDrawing">
      {/* À compléter avec div ou SVG */}
      <p>Dessin étape {errors} / 6</p>
    </div>
  );
}
