interface Props {
  errors: number; // 0 → 6
}

export default function HangmanDrawing({ errors }: Props) {
  return (
    <div className="hangmanDrawing">
      <svg height="250" width="200" className="hangmanSvg">
        {/* Socle + poteau + barre */}
        <line x1="10" y1="240" x2="190" y2="240" /> {/* base */}
        <line x1="50" y1="20" x2="50" y2="240" /> {/* poteau */}
        <line x1="50" y1="20" x2="170" y2="20" /> {/* barre horizontale */}
        <line x1="90" y1="20" x2="50" y2="60" />
        {errors > 0 && (
          <>
            <line x1="140" y1="20" x2="140" y2="50" /> {/* corde */}
            <circle cx="140" cy="70" r="20" />
            {/* tête */}
          </>
        )}
        {/* corps */}
        {errors > 1 && <line x1="140" y1="90" x2="140" y2="150" />}
        {/* bras gauche */}
        {errors > 2 && <line x1="140" y1="110" x2="120" y2="130" />}
        {/* bras droit */}
        {errors > 3 && <line x1="140" y1="110" x2="160" y2="130" />}
        {/* jambe gauche */}
        {errors > 4 && <line x1="140" y1="150" x2="120" y2="190" />}
        {/* jambe droite */}
        {errors > 5 && <line x1="140" y1="150" x2="160" y2="190" />}
      </svg>
    </div>
  );
}
