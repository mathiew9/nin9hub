import React, { useCallback, useMemo, useState } from "react";
import { GiClubs, GiDiamonds, GiHearts, GiSpades } from "react-icons/gi";
import { FaArrowRotateRight } from "react-icons/fa6";
import "./Solitaire.css";

/* =========================================================
   Types
   ========================================================= */

type Suit = "H" | "D" | "C" | "S";
type Color = "red" | "black";

type Card = {
  id: string;
  suit: Suit;
  rank: number; // 1..13
  faceUp: boolean;
};

type FundationPile = {
  suit: Suit | null;
  cards: Card[];
};

type Fundations = FundationPile[];

type GameState = {
  tableau: Card[][];
  stock: Card[];
  waste: Card[];
  fundations: Fundations;
};

type DragFrom =
  | { kind: "waste" }
  | { kind: "tableau"; pileIndex: number; cardIndex: number }
  | { kind: "foundation"; pileIndex: number };

type DropTarget =
  | { kind: "foundation"; index: number }
  | { kind: "tableau"; index: number };

type DragPhase = "dragging" | "snapping";

type DragState = {
  cards: Card[]; // packet (1 ou plusieurs)
  from: DragFrom;
  phase: DragPhase;

  originLeft: number;
  originTop: number;
  left: number;
  top: number;

  offsetX: number;
  offsetY: number;

  pointerId: number;
};

type AutoMoveState = {
  cards: Card[];
  from: DragFrom;
  phase: "snapping";

  originLeft: number;
  originTop: number;
  left: number;
  top: number;

  destLeft: number;
  destTop: number;

  commit: () => void;
};

/* =========================================================
   UI helpers
   ========================================================= */

function rankLabel(rank: number): string {
  if (rank === 1) return "A";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  return String(rank);
}

function colorOfSuit(suit: Suit): Color {
  return suit === "H" || suit === "D" ? "red" : "black";
}

const SUIT_SYMBOL: Record<Suit, React.ReactNode> = {
  H: <GiHearts />,
  D: <GiDiamonds />,
  C: <GiClubs />,
  S: <GiSpades />,
};

/* =========================================================
   Deck / setup
   ========================================================= */

function makeDeck(): Card[] {
  const suits: Suit[] = ["H", "D", "C", "S"];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ id: `${suit}-${rank}`, suit, rank, faceUp: false });
    }
  }
  return deck;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newGameState(): GameState {
  const deck = shuffle(makeDeck());

  const tableau: Card[][] = Array.from({ length: 7 }, () => []);
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j <= i; j++) {
      const card = deck.pop()!;
      tableau[i].push({ ...card, faceUp: j === i });
    }
  }

  const stock: Card[] = deck.map((c) => ({ ...c, faceUp: false }));
  const waste: Card[] = [];

  const fundations: Fundations = Array.from({ length: 4 }, () => ({
    suit: null,
    cards: [],
  }));

  return { tableau, stock, waste, fundations };
}

/* =========================================================
   CardView
   ========================================================= */

type CardViewProps = {
  card: Card;
  className?: string;
  style?: React.CSSProperties;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
  onPointerMove?: React.PointerEventHandler<HTMLDivElement>;
  onPointerUp?: React.PointerEventHandler<HTMLDivElement>;
  onPointerCancel?: React.PointerEventHandler<HTMLDivElement>;
  onDoubleClick?: React.MouseEventHandler<HTMLDivElement>;
};

function CardView({
  card,
  className = "",
  style,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onDoubleClick,
}: CardViewProps) {
  if (!card.faceUp) {
    return (
      <div
        className={`card back ${className}`}
        style={style}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onDoubleClick={onDoubleClick}
      />
    );
  }

  return (
    <div
      className={`card face ${colorOfSuit(card.suit)} ${className}`}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onDoubleClick={onDoubleClick}
    >
      <div className="card-corner card-corner--tl">
        <div className="card-rank">{rankLabel(card.rank)}</div>
      </div>
      <div className="card-corner card-corner--tr">
        <div className="card-suitSmall">{SUIT_SYMBOL[card.suit]}</div>
      </div>
      <div className="card-corner card-corner--bl">
        <div className="card-suitSmall">{SUIT_SYMBOL[card.suit]}</div>
      </div>
      <div className="card-corner card-corner--br">
        <div className="card-rank">{rankLabel(card.rank)}</div>
      </div>
      <div className="card-center">
        <div className="card-suitBig">{SUIT_SYMBOL[card.suit]}</div>
      </div>
    </div>
  );
}

/* =========================================================
   Main component
   ========================================================= */

export default function Solitaire() {
  const [gameState, setGameState] = useState<GameState>(() => newGameState());
  const [moves, setMoves] = useState(0);

  const { tableau, stock, waste, fundations } = gameState;
  const wasteTop = waste.length ? waste[waste.length - 1] : null;
  const wasteSecond = waste.length > 1 ? waste[waste.length - 2] : null;

  /* ---------- Moves / game controls ---------- */
  const resetGame = useCallback(() => {
    setGameState(newGameState());
    setMoves(0);
  }, []);

  const incrementMoves = useCallback(() => {
    setMoves((m) => m + 1);
  }, []);

  const isWon = useMemo(
    () => fundations.every((p) => p.cards.length === 13),
    [fundations],
  );

  // stock -> waste, or recycle waste -> stock
  const drawCardFromStock = useCallback(() => {
    if (stock.length > 0) {
      const cardDrawn = stock[stock.length - 1];
      const newStock = stock.slice(0, -1);
      const newWaste = [...waste, { ...cardDrawn, faceUp: true }];

      setGameState((prev) => ({
        ...prev,
        stock: newStock,
        waste: newWaste,
      }));
      incrementMoves();
      return;
    }

    if (waste.length > 0) {
      const recycledStock = [...waste]
        .reverse()
        .map((c) => ({ ...c, faceUp: false }));

      setGameState((prev) => ({
        ...prev,
        stock: recycledStock,
        waste: [],
      }));
      incrementMoves();
    }
  }, [stock, waste, incrementMoves]);

  /* =========================================================
     Drag
     - supports tableau stack dragging (packet)
     ========================================================= */

  const [drag, setDrag] = useState<DragState | null>(null);

  const startDrag = useCallback(
    (e: React.PointerEvent, cards: Card[], from: DragFrom) => {
      if (!cards.length) return;
      if (!cards[0].faceUp) return;

      const el = e.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();

      el.setPointerCapture(e.pointerId);

      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      setDrag({
        cards,
        from,
        phase: "dragging",
        originLeft: rect.left,
        originTop: rect.top,
        left: rect.left, // start exactly on the card (no jump)
        top: rect.top,
        offsetX,
        offsetY,
        pointerId: e.pointerId,
      });
    },
    [],
  );

  const onDragMove = useCallback((e: React.PointerEvent) => {
    setDrag((d) => {
      if (!d || d.phase !== "dragging") return d;
      return {
        ...d,
        left: e.clientX - d.offsetX,
        top: e.clientY - d.offsetY,
      };
    });
  }, []);

  const endDragSnapBack = useCallback(() => {
    setDrag((d) => {
      if (!d) return d;

      const dx = Math.abs(d.left - d.originLeft);
      const dy = Math.abs(d.top - d.originTop);

      // Si aucun mouvement (ou quasi), on stoppe tout tout de suite
      if (dx < 1 && dy < 1) return null;

      // Sinon: snap-back animé
      return {
        ...d,
        phase: "snapping",
        left: d.originLeft,
        top: d.originTop,
      };
    });
  }, []);

  /* =========================================================
     Auto-move animation (double click)
     ========================================================= */

  const [autoMove, setAutoMove] = useState<AutoMoveState | null>(null);

  const activeGhost = drag ?? autoMove;

  function getFoundationSlotRect(i: number) {
    const el = document.querySelector<HTMLElement>(
      `[data-drop="foundation"][data-foundation-index="${i}"]`,
    );
    return el?.getBoundingClientRect() ?? null;
  }

  function getTableauPileRect(i: number) {
    const el = document.querySelector<HTMLElement>(
      `[data-drop="tableau"][data-tableau-index="${i}"]`,
    );
    return el?.getBoundingClientRect() ?? null;
  }

  function computeTableauInsertOffsetY(pile: Card[]) {
    let offsetY = 0;
    for (const c of pile) offsetY += c.faceUp ? 28 : 12;
    return 8 + offsetY; // same base as render: top: `${8 + offsetY}px`
  }

  function getTableauCardDestPos(pileIndex: number, t: Card[][]) {
    const pileRect = getTableauPileRect(pileIndex);
    if (!pileRect) return null;
    const offsetY = computeTableauInsertOffsetY(t[pileIndex] ?? []);
    return { left: pileRect.left, top: pileRect.top + offsetY };
  }

  function getFoundationDestPos(i: number) {
    const r = getFoundationSlotRect(i);
    if (!r) return null;
    return { left: r.left, top: r.top };
  }

  const startAutoMoveAnimation = useCallback(
    (args: {
      cards: Card[];
      from: DragFrom;
      originRect: DOMRect;
      destLeft: number;
      destTop: number;
      commit: () => void;
    }) => {
      const { cards, from, originRect, destLeft, destTop, commit } = args;

      // Put ghost at origin first
      setAutoMove({
        cards,
        from,
        phase: "snapping",
        originLeft: originRect.left,
        originTop: originRect.top,
        left: originRect.left,
        top: originRect.top,
        destLeft,
        destTop,
        commit,
      });

      // Next frame -> move to destination (triggers CSS transition)
      requestAnimationFrame(() => {
        setAutoMove((s) => {
          if (!s) return s;
          return { ...s, left: destLeft, top: destTop };
        });
      });
    },
    [],
  );

  const isDraggingWasteTop =
    !!activeGhost &&
    activeGhost.from.kind === "waste" &&
    !!wasteTop &&
    activeGhost.cards[0]?.id === wasteTop.id;

  // Cache toutes les cartes du packet dans la pile source du tableau
  const isDraggingTableauCard = (pileIndex: number, cardIndex: number) => {
    if (!activeGhost) return false;
    if (activeGhost.from.kind !== "tableau") return false;
    if (activeGhost.from.pileIndex !== pileIndex) return false;
    return cardIndex >= activeGhost.from.cardIndex;
  };

  const isDraggingFoundationTop = (foundationIndex: number, cardId: string) =>
    !!activeGhost &&
    activeGhost.from.kind === "foundation" &&
    activeGhost.from.pileIndex === foundationIndex &&
    activeGhost.cards.length === 1 &&
    activeGhost.cards[0].id === cardId;

  /* =========================================================
     Moves
     ========================================================= */

  const tryMoveWasteToFoundation = useCallback(
    (toFoundationIndex: number): boolean => {
      // Doit correspondre au drag actuel
      if (!drag || drag.from.kind !== "waste") return false;
      if (drag.cards.length !== 1) return false;

      if (!waste.length) return false;

      const card = waste[waste.length - 1];

      // sécurité : la carte “en main” doit être la top de waste
      if (drag.cards[0].id !== card.id) return false;

      const foundation = fundations[toFoundationIndex];
      const top = foundation.cards[foundation.cards.length - 1];

      // Validate
      if (foundation.cards.length === 0) {
        if (card.rank !== 1) return false; // only Ace
      } else {
        if (card.suit !== foundation.suit) return false; // same suit
        if (!top || card.rank !== top.rank + 1) return false; // +1 rank
      }

      // Apply
      setGameState((prev) => {
        const prevWasteTop = prev.waste[prev.waste.length - 1];
        if (!prevWasteTop || prevWasteTop.id !== card.id) return prev;

        const newWaste = prev.waste.slice(0, -1);

        const newFoundations = prev.fundations.map((p, i) => {
          if (i !== toFoundationIndex) return p;
          return {
            suit: p.suit ?? prevWasteTop.suit,
            cards: [...p.cards, prevWasteTop],
          };
        });

        return { ...prev, waste: newWaste, fundations: newFoundations };
      });

      return true;
    },
    [drag, waste, fundations],
  );

  const tryMoveWasteToTableau = useCallback(
    (toPileIndex: number): boolean => {
      if (!drag || drag.from.kind !== "waste") return false;
      if (drag.cards.length !== 1) return false;

      if (!waste.length) return false;

      const card = waste[waste.length - 1];
      if (drag.cards[0].id !== card.id) return false;

      const pile = tableau[toPileIndex];
      const top = pile[pile.length - 1];

      // Validate
      if (pile.length === 0) {
        if (card.rank !== 13) return false; // only King
      } else {
        if (colorOfSuit(card.suit) === colorOfSuit(top.suit)) return false; // opposite color
        if (card.rank !== top.rank - 1) return false; // -1 rank
      }

      // Apply
      setGameState((prev) => {
        const prevWasteTop = prev.waste[prev.waste.length - 1];
        if (!prevWasteTop || prevWasteTop.id !== card.id) return prev;

        const newWaste = prev.waste.slice(0, -1);

        const newTableau = prev.tableau.map((p, i) =>
          i === toPileIndex ? [...p, prevWasteTop] : p,
        );

        return { ...prev, waste: newWaste, tableau: newTableau };
      });

      return true;
    },
    [drag, waste, tableau],
  );

  const tryMoveTableauToFoundation = useCallback(
    (fromPileIndex: number, toFoundationIndex: number): boolean => {
      // Doit correspondre au drag actuel
      if (!drag || drag.from.kind !== "tableau") return false;
      if (drag.from.pileIndex !== fromPileIndex) return false;

      // Fondation: uniquement 1 carte
      if (drag.cards.length !== 1) return false;

      const fromPile = tableau[fromPileIndex];
      if (!fromPile || fromPile.length === 0) return false;

      // On ne permet que la top carte vers fondation
      const card = fromPile[fromPile.length - 1];
      if (!card.faceUp) return false;

      // sécurité : la carte en main doit être cette top carte
      if (drag.cards[0].id !== card.id) return false;

      const foundation = fundations[toFoundationIndex];
      if (!foundation) return false;

      const top = foundation.cards[foundation.cards.length - 1];

      // Validate
      if (foundation.cards.length === 0) {
        if (card.rank !== 1) return false;
      } else {
        if (foundation.suit !== card.suit) return false;
        if (!top || card.rank !== top.rank + 1) return false;
      }

      // Apply
      setGameState((prev) => {
        const prevFromPile = prev.tableau[fromPileIndex];
        if (!prevFromPile || prevFromPile.length === 0) return prev;

        const prevCard = prevFromPile[prevFromPile.length - 1];
        if (prevCard.id !== card.id) return prev;

        const newTableau = prev.tableau.map((p, i) => {
          if (i !== fromPileIndex) return p;

          const cut = p.slice(0, -1);

          // flip new top if needed
          if (cut.length > 0) {
            const last = cut[cut.length - 1];
            if (!last.faceUp) {
              cut[cut.length - 1] = { ...last, faceUp: true };
            }
          }
          return cut;
        });

        const newFoundations = prev.fundations.map((p, i) => {
          if (i !== toFoundationIndex) return p;
          return {
            suit: p.suit ?? prevCard.suit,
            cards: [...p.cards, prevCard],
          };
        });

        return { ...prev, tableau: newTableau, fundations: newFoundations };
      });

      return true;
    },
    [drag, tableau, fundations],
  );

  // (règles pas encore implémentées ici) — mais le drag stack est prêt
  const tryMoveTableauToTableau = useCallback(
    (fromPileIndex: number, toPileIndex: number): boolean => {
      if (fromPileIndex === toPileIndex) return false;

      if (!drag || drag.from.kind !== "tableau") return false;
      if (drag.from.pileIndex !== fromPileIndex) return false;

      const fromPile = tableau[fromPileIndex];
      if (!fromPile || fromPile.length === 0) return false;

      const fromCardIndex = drag.from.cardIndex;
      if (fromCardIndex < 0 || fromCardIndex >= fromPile.length) return false;

      const packet = fromPile.slice(fromCardIndex);
      if (!packet.length) return false;

      // Tout le packet doit être faceUp
      if (!packet.every((c) => c.faceUp)) return false;

      // Sécurité : le packet visible doit correspondre à ce que tu drags
      if (
        packet.length !== drag.cards.length ||
        packet.some((c, i) => c.id !== drag.cards[i]?.id)
      )
        return false;

      const lead = packet[0];

      const toPile = tableau[toPileIndex];
      const toTop = toPile.length ? toPile[toPile.length - 1] : null;

      // Validate destination rules
      if (!toTop) {
        if (lead.rank !== 13) return false; // only King on empty
      } else {
        if (colorOfSuit(lead.suit) === colorOfSuit(toTop.suit)) return false;
        if (lead.rank !== toTop.rank - 1) return false;
      }

      // Apply
      setGameState((prev) => {
        const prevFromPile = prev.tableau[fromPileIndex];
        const prevToPile = prev.tableau[toPileIndex];
        if (!prevFromPile || !prevToPile) return prev;

        if (fromCardIndex < 0 || fromCardIndex >= prevFromPile.length)
          return prev;

        const prevPacket = prevFromPile.slice(fromCardIndex);
        if (!prevPacket.length) return prev;

        // (optionnel) vérifie que le packet est toujours le même
        if (
          prevPacket.length !== drag.cards.length ||
          prevPacket.some((c, i) => c.id !== drag.cards[i]?.id)
        )
          return prev;

        const newTableau = prev.tableau.map((p, i) => {
          if (i === fromPileIndex) {
            const cut = p.slice(0, fromCardIndex);

            // flip new top if needed
            if (cut.length > 0) {
              const last = cut[cut.length - 1];
              if (!last.faceUp) {
                cut[cut.length - 1] = { ...last, faceUp: true };
              }
            }
            return cut;
          }

          if (i === toPileIndex) {
            return [...p, ...prevPacket];
          }

          return p;
        });

        return { ...prev, tableau: newTableau };
      });

      return true;
    },
    [drag, tableau],
  );

  const tryMoveFoundationToFoundation = useCallback(
    (fromFoundationIndex: number, toFoundationIndex: number): boolean => {
      if (fromFoundationIndex === toFoundationIndex) return false;

      // doit correspondre au drag courant
      if (!drag || drag.from.kind !== "foundation") return false;
      if (drag.from.pileIndex !== fromFoundationIndex) return false;

      // fondation => 1 seule carte max
      if (drag.cards.length !== 1) return false;

      const fromFoundation = fundations[fromFoundationIndex];
      if (!fromFoundation || fromFoundation.cards.length === 0) return false;

      const card = fromFoundation.cards[fromFoundation.cards.length - 1];
      if (drag.cards[0].id !== card.id) return false;

      const toFoundation = fundations[toFoundationIndex];
      if (!toFoundation) return false;

      // Validate (règle "custom" : seulement As vers fondation vide)
      if (toFoundation.cards.length !== 0) return false;
      if (card.rank !== 1) return false;

      // Apply
      setGameState((prev) => {
        const prevFrom = prev.fundations[fromFoundationIndex];
        const prevTo = prev.fundations[toFoundationIndex];
        if (!prevFrom || !prevTo) return prev;
        if (prevFrom.cards.length === 0) return prev;

        const prevCard = prevFrom.cards[prevFrom.cards.length - 1];
        if (prevCard.id !== card.id) return prev;

        const newFromCards = prevFrom.cards.slice(0, -1);
        const newToCards = [...prevTo.cards, prevCard];

        const newFundations = prev.fundations.map((p, i) => {
          if (i === fromFoundationIndex) {
            return {
              suit: newFromCards.length ? p.suit : null, // si vide -> null
              cards: newFromCards,
            };
          }
          if (i === toFoundationIndex) {
            return {
              suit: p.suit ?? prevCard.suit, // si vide -> set suit
              cards: newToCards,
            };
          }
          return p;
        });

        return { ...prev, fundations: newFundations };
      });

      return true;
    },
    [drag, fundations],
  );

  const tryMoveFoundationToTableau = useCallback(
    (fromFoundationIndex: number, toPileIndex: number): boolean => {
      // 0) No-op / invalid
      if (fromFoundationIndex < 0 || fromFoundationIndex >= fundations.length)
        return false;
      if (toPileIndex < 0 || toPileIndex >= tableau.length) return false;

      // 1) Must match current drag
      if (!drag || drag.from.kind !== "foundation") return false;
      if (drag.from.pileIndex !== fromFoundationIndex) return false;

      // From foundation => only 1 card at a time
      if (drag.cards.length !== 1) return false;

      const fromFoundation = fundations[fromFoundationIndex];
      if (!fromFoundation || fromFoundation.cards.length === 0) return false;

      const card = fromFoundation.cards[fromFoundation.cards.length - 1];

      // safety: dragged card must be this top card
      if (drag.cards[0].id !== card.id) return false;

      const toPile = tableau[toPileIndex];
      const toTop = toPile.length ? toPile[toPile.length - 1] : null;

      // 2) Validate tableau rules
      if (!toTop) {
        // empty tableau => only King
        if (card.rank !== 13) return false;
      } else {
        // opposite color + rank -1
        if (colorOfSuit(card.suit) === colorOfSuit(toTop.suit)) return false;
        if (card.rank !== toTop.rank - 1) return false;
      }

      // 3) Apply
      setGameState((prev) => {
        const prevFrom = prev.fundations[fromFoundationIndex];
        const prevToPile = prev.tableau[toPileIndex];
        if (!prevFrom || !prevToPile) return prev;

        if (prevFrom.cards.length === 0) return prev;

        const prevCard = prevFrom.cards[prevFrom.cards.length - 1];
        if (prevCard.id !== card.id) return prev;

        const newFromCards = prevFrom.cards.slice(0, -1);

        const newFundations = prev.fundations.map((p, i) => {
          if (i !== fromFoundationIndex) return p;
          return {
            suit: newFromCards.length ? p.suit : null, // if emptied, reset suit
            cards: newFromCards,
          };
        });

        const newTableau = prev.tableau.map((p, i) => {
          if (i !== toPileIndex) return p;
          return [...p, prevCard];
        });

        return { ...prev, fundations: newFundations, tableau: newTableau };
      });

      return true;
    },
    [drag, fundations, tableau],
  );

  /* =========================================================
     Double-click auto moves (logic + animated wrappers)
     ========================================================= */

  const canMoveToFoundation = useCallback(
    (card: Card, foundationIndex: number) => {
      const f = fundations[foundationIndex];
      if (!f) return false;

      const top = f.cards.length ? f.cards[f.cards.length - 1] : null;

      if (f.cards.length === 0) return card.rank === 1; // only Ace
      return f.suit === card.suit && !!top && card.rank === top.rank + 1;
    },
    [fundations],
  );

  const findFoundationTarget = useCallback(
    (card: Card): number | null => {
      // 1) prefer existing foundation of same suit
      for (let i = 0; i < fundations.length; i++) {
        const f = fundations[i];
        if (f.cards.length > 0 && f.suit === card.suit) {
          if (canMoveToFoundation(card, i)) return i;
        }
      }
      // 2) else any empty foundation (for Aces)
      for (let i = 0; i < fundations.length; i++) {
        const f = fundations[i];
        if (f.cards.length === 0) {
          if (canMoveToFoundation(card, i)) return i;
        }
      }
      return null;
    },
    [fundations, canMoveToFoundation],
  );

  const canMoveToTableau = useCallback(
    (card: Card, pileIndex: number) => {
      const pile = tableau[pileIndex];
      if (!pile) return false;

      const top = pile.length ? pile[pile.length - 1] : null;

      if (!top) return card.rank === 13; // only King on empty
      return (
        colorOfSuit(card.suit) !== colorOfSuit(top.suit) &&
        card.rank === top.rank - 1
      );
    },
    [tableau],
  );

  const findTableauTarget = useCallback(
    (card: Card, excludePileIndex?: number): number | null => {
      for (let i = 0; i < tableau.length; i++) {
        if (excludePileIndex != null && i === excludePileIndex) continue;
        if (canMoveToTableau(card, i)) return i;
      }
      return null;
    },
    [tableau, canMoveToTableau],
  );

  const canMovePacketToTableau = useCallback(
    (lead: Card, toPileIndex: number) => {
      const toPile = tableau[toPileIndex];
      if (!toPile) return false;

      const toTop = toPile.length ? toPile[toPile.length - 1] : null;

      if (!toTop) return lead.rank === 13; // King on empty
      return (
        colorOfSuit(lead.suit) !== colorOfSuit(toTop.suit) &&
        lead.rank === toTop.rank - 1
      );
    },
    [tableau],
  );

  const findTableauTargetForPacket = useCallback(
    (lead: Card, excludePileIndex: number) => {
      for (let i = 0; i < tableau.length; i++) {
        if (i === excludePileIndex) continue;
        if (canMovePacketToTableau(lead, i)) return i;
      }
      return null;
    },
    [tableau, canMovePacketToTableau],
  );

  // Animated: waste
  const animateAutoMoveFromWaste = useCallback(
    (originRect: DOMRect) => {
      if (drag || autoMove) return;
      if (!wasteTop) return;

      // 1) waste -> foundation
      const fTarget = findFoundationTarget(wasteTop);
      if (fTarget != null) {
        const dest = getFoundationDestPos(fTarget);
        if (!dest) return;

        startAutoMoveAnimation({
          cards: [wasteTop],
          from: { kind: "waste" },
          originRect,
          destLeft: dest.left,
          destTop: dest.top,
          commit: () => {
            setGameState((prev) => {
              const top = prev.waste[prev.waste.length - 1];
              if (!top || top.id !== wasteTop.id) return prev;

              const newWaste = prev.waste.slice(0, -1);
              const newFoundations = prev.fundations.map((p, i) => {
                if (i !== fTarget) return p;
                return { suit: p.suit ?? top.suit, cards: [...p.cards, top] };
              });

              return { ...prev, waste: newWaste, fundations: newFoundations };
            });
          },
        });

        return;
      }

      // 2) waste -> tableau
      const tTarget = findTableauTarget(wasteTop);
      if (tTarget != null) {
        const dest = getTableauCardDestPos(tTarget, tableau);
        if (!dest) return;

        startAutoMoveAnimation({
          cards: [wasteTop],
          from: { kind: "waste" },
          originRect,
          destLeft: dest.left,
          destTop: dest.top,
          commit: () => {
            setGameState((prev) => {
              const top = prev.waste[prev.waste.length - 1];
              if (!top || top.id !== wasteTop.id) return prev;

              const newWaste = prev.waste.slice(0, -1);
              const newTableau = prev.tableau.map((p, i) =>
                i === tTarget ? [...p, top] : p,
              );

              return { ...prev, waste: newWaste, tableau: newTableau };
            });
          },
        });
      }
    },
    [
      drag,
      autoMove,
      wasteTop,
      tableau,
      findFoundationTarget,
      findTableauTarget,
      startAutoMoveAnimation,
    ],
  );

  // Animated: tableau (top card only, like your existing autoMoveFromTableau)
  const animateAutoMoveFromTableau = useCallback(
    (fromPileIndex: number, originRect: DOMRect) => {
      if (drag || autoMove) return;
      const fromPile = tableau[fromPileIndex];
      if (!fromPile || fromPile.length === 0) return;

      const card = fromPile[fromPile.length - 1];
      if (!card.faceUp) return;

      // 1) tableau -> foundation
      const fTarget = findFoundationTarget(card);
      if (fTarget != null) {
        const dest = getFoundationDestPos(fTarget);
        if (!dest) return;

        startAutoMoveAnimation({
          cards: [card],
          from: {
            kind: "tableau",
            pileIndex: fromPileIndex,
            cardIndex: fromPile.length - 1,
          },
          originRect,
          destLeft: dest.left,
          destTop: dest.top,
          commit: () => {
            setGameState((prev) => {
              const prevFromPile = prev.tableau[fromPileIndex];
              if (!prevFromPile || prevFromPile.length === 0) return prev;

              const prevCard = prevFromPile[prevFromPile.length - 1];
              if (prevCard.id !== card.id) return prev;

              const cut = prevFromPile.slice(0, -1);
              if (cut.length > 0) {
                const last = cut[cut.length - 1];
                if (!last.faceUp)
                  cut[cut.length - 1] = { ...last, faceUp: true };
              }

              const newTableau = prev.tableau.map((p, i) =>
                i === fromPileIndex ? cut : p,
              );

              const newFoundations = prev.fundations.map((p, i) => {
                if (i !== fTarget) return p;
                return {
                  suit: p.suit ?? prevCard.suit,
                  cards: [...p.cards, prevCard],
                };
              });

              return {
                ...prev,
                tableau: newTableau,
                fundations: newFoundations,
              };
            });
          },
        });

        return;
      }

      // 2) tableau -> tableau
      const tTarget = findTableauTarget(card, fromPileIndex);
      if (tTarget != null) {
        const dest = getTableauCardDestPos(tTarget, tableau);
        if (!dest) return;

        startAutoMoveAnimation({
          cards: [card],
          from: {
            kind: "tableau",
            pileIndex: fromPileIndex,
            cardIndex: fromPile.length - 1,
          },
          originRect,
          destLeft: dest.left,
          destTop: dest.top,
          commit: () => {
            setGameState((prev) => {
              const prevFromPile = prev.tableau[fromPileIndex];
              if (!prevFromPile || prevFromPile.length === 0) return prev;

              const prevCard = prevFromPile[prevFromPile.length - 1];
              if (prevCard.id !== card.id) return prev;

              const cut = prevFromPile.slice(0, -1);
              if (cut.length > 0) {
                const last = cut[cut.length - 1];
                if (!last.faceUp)
                  cut[cut.length - 1] = { ...last, faceUp: true };
              }

              const newTableau = prev.tableau.map((p, i) => {
                if (i === fromPileIndex) return cut;
                if (i === tTarget) return [...p, prevCard];
                return p;
              });

              return { ...prev, tableau: newTableau };
            });
          },
        });
      }
    },
    [
      drag,
      autoMove,
      tableau,
      findFoundationTarget,
      findTableauTarget,
      startAutoMoveAnimation,
    ],
  );

  const animateAutoMovePacketFromTableau = useCallback(
    (fromPileIndex: number, fromCardIndex: number, originRect: DOMRect) => {
      if (drag || autoMove) return;

      const fromPile = tableau[fromPileIndex];
      if (!fromPile) return;
      if (fromCardIndex < 0 || fromCardIndex >= fromPile.length) return;

      const packet = fromPile.slice(fromCardIndex);
      if (!packet.length) return;

      // packet must be all faceUp
      if (!packet.every((c) => c.faceUp)) return;

      const lead = packet[0];

      const tTarget = findTableauTargetForPacket(lead, fromPileIndex);
      if (tTarget == null) return;

      const dest = getTableauCardDestPos(tTarget, tableau);
      if (!dest) return;

      startAutoMoveAnimation({
        cards: packet,
        from: {
          kind: "tableau",
          pileIndex: fromPileIndex,
          cardIndex: fromCardIndex,
        },
        originRect,
        destLeft: dest.left,
        destTop: dest.top,
        commit: () => {
          setGameState((prev) => {
            const prevFrom = prev.tableau[fromPileIndex];
            const prevTo = prev.tableau[tTarget];
            if (!prevFrom || !prevTo) return prev;
            if (fromCardIndex < 0 || fromCardIndex >= prevFrom.length)
              return prev;

            const prevPacket = prevFrom.slice(fromCardIndex);
            if (!prevPacket.length) return prev;

            // safety: ensure it's still the same packet
            if (
              prevPacket.length !== packet.length ||
              prevPacket.some((c, i) => c.id !== packet[i]?.id)
            ) {
              return prev;
            }

            const newTableau = prev.tableau.map((p, i) => {
              if (i === fromPileIndex) {
                const cut = p.slice(0, fromCardIndex);

                // flip new top if needed
                if (cut.length > 0) {
                  const last = cut[cut.length - 1];
                  if (!last.faceUp)
                    cut[cut.length - 1] = { ...last, faceUp: true };
                }
                return cut;
              }

              if (i === tTarget) {
                return [...p, ...prevPacket];
              }

              return p;
            });

            return { ...prev, tableau: newTableau };
          });
        },
      });
    },
    [
      drag,
      autoMove,
      tableau,
      findTableauTargetForPacket,
      startAutoMoveAnimation,
    ],
  );

  // Animated: foundation (to tableau only, like your existing autoMoveFromFoundation)
  const animateAutoMoveFromFoundation = useCallback(
    (fromFoundationIndex: number, originRect: DOMRect) => {
      if (drag || autoMove) return;
      const f = fundations[fromFoundationIndex];
      if (!f || f.cards.length === 0) return;

      const card = f.cards[f.cards.length - 1];

      const tTarget = findTableauTarget(card);
      if (tTarget == null) return;

      const dest = getTableauCardDestPos(tTarget, tableau);
      if (!dest) return;

      startAutoMoveAnimation({
        cards: [card],
        from: { kind: "foundation", pileIndex: fromFoundationIndex },
        originRect,
        destLeft: dest.left,
        destTop: dest.top,
        commit: () => {
          setGameState((prev) => {
            const prevFrom = prev.fundations[fromFoundationIndex];
            if (!prevFrom || prevFrom.cards.length === 0) return prev;

            const prevCard = prevFrom.cards[prevFrom.cards.length - 1];
            if (prevCard.id !== card.id) return prev;

            const newFromCards = prevFrom.cards.slice(0, -1);

            const newFundations = prev.fundations.map((p, i) => {
              if (i !== fromFoundationIndex) return p;
              return {
                suit: newFromCards.length ? p.suit : null,
                cards: newFromCards,
              };
            });

            const newTableau = prev.tableau.map((p, i) =>
              i === tTarget ? [...p, prevCard] : p,
            );

            return { ...prev, fundations: newFundations, tableau: newTableau };
          });
        },
      });
    },
    [
      drag,
      autoMove,
      fundations,
      tableau,
      findTableauTarget,
      startAutoMoveAnimation,
    ],
  );

  // Transforme le DOM target -> DropTarget (strict)
  function getDropTargetFromEvent(e: React.PointerEvent): DropTarget | null {
    const elUnderPointer = document.elementFromPoint(e.clientX, e.clientY);
    const dropEl = elUnderPointer?.closest<HTMLElement>("[data-drop]") ?? null;
    if (!dropEl) return null;

    const kind = dropEl.dataset.drop;

    if (kind === "foundation") {
      const index = Number(dropEl.dataset.foundationIndex);
      return Number.isFinite(index) ? { kind: "foundation", index } : null;
    }

    if (kind === "tableau") {
      const index = Number(dropEl.dataset.tableauIndex);
      return Number.isFinite(index) ? { kind: "tableau", index } : null;
    }

    return null;
  }

  const handleDrop = useCallback(
    (e: React.PointerEvent) => {
      if (!drag) return;

      const to = getDropTargetFromEvent(e);
      if (!to) {
        endDragSnapBack();
        return;
      }

      const dispatch = {
        waste: {
          foundation: (
            _from: Extract<DragFrom, { kind: "waste" }>,
            t: Extract<DropTarget, { kind: "foundation" }>,
          ) => tryMoveWasteToFoundation(t.index),
          tableau: (
            _from: Extract<DragFrom, { kind: "waste" }>,
            t: Extract<DropTarget, { kind: "tableau" }>,
          ) => tryMoveWasteToTableau(t.index),
        },
        tableau: {
          foundation: (
            from: Extract<DragFrom, { kind: "tableau" }>,
            t: Extract<DropTarget, { kind: "foundation" }>,
          ) => tryMoveTableauToFoundation(from.pileIndex, t.index),

          tableau: (
            from: Extract<DragFrom, { kind: "tableau" }>,
            t: Extract<DropTarget, { kind: "tableau" }>,
          ) => tryMoveTableauToTableau(from.pileIndex, t.index),
        },
        foundation: {
          foundation: (
            from: Extract<DragFrom, { kind: "foundation" }>,
            t: Extract<DropTarget, { kind: "foundation" }>,
          ) => tryMoveFoundationToFoundation(from.pileIndex, t.index),

          tableau: (
            from: Extract<DragFrom, { kind: "foundation" }>,
            t: Extract<DropTarget, { kind: "tableau" }>,
          ) => tryMoveFoundationToTableau(from.pileIndex, t.index),
        },
      } as const;

      // Narrowing simple
      if (drag.from.kind === "waste") {
        if (to.kind === "foundation") {
          const success = dispatch.waste.foundation(drag.from, to);
          if (success) {
            setDrag(null);
            incrementMoves();
            return;
          }
        } else {
          const success = dispatch.waste.tableau(drag.from, to);
          if (success) {
            setDrag(null);
            incrementMoves();
            return;
          }
        }
      } else if (drag.from.kind === "tableau") {
        if (to.kind === "foundation") {
          const success = dispatch.tableau.foundation(drag.from, to);
          if (success) {
            setDrag(null);
            incrementMoves();
            return;
          }
        } else {
          const success = dispatch.tableau.tableau(drag.from, to);
          if (success) {
            setDrag(null);
            incrementMoves();
            return;
          }
        }
      } else {
        // drag.from.kind === "foundation"
        if (to.kind === "foundation") {
          const success = dispatch.foundation.foundation(drag.from, to);
          if (success) {
            setDrag(null);
            incrementMoves();
            return;
          }
        } else {
          // to.kind === "tableau"
          const success = dispatch.foundation.tableau(drag.from, to);
          if (success) {
            setDrag(null);
            incrementMoves();
            return;
          }
        }
      }

      endDragSnapBack();
    },
    [
      drag,
      endDragSnapBack,
      incrementMoves,
      tryMoveWasteToFoundation,
      tryMoveWasteToTableau,
      tryMoveTableauToFoundation,
      tryMoveTableauToTableau,
      tryMoveFoundationToFoundation,
      tryMoveFoundationToTableau,
    ],
  );

  const wasteCardToRender =
    isDraggingWasteTop && wasteSecond ? wasteSecond : wasteTop;

  /* =========================================================
     Render
     ========================================================= */

  return (
    <div className="solitaire-container">
      {/* TOPBAR */}
      <div className="solitaire-topbar">
        <div className="solitaire-stats">
          <span>Mouvements: {moves}</span>
          {isWon && <span className="solitaire-win">Victoire</span>}
        </div>

        <button
          className="solitaire-btn commonButton commonMediumButton"
          onClick={resetGame}
        >
          Nouvelle partie
        </button>
      </div>

      {/* TOP ROW aligned with tableau (7 columns) */}
      <div className="solitaire-topgrid">
        {/* col 1: Stock */}
        <div
          className={`sol-slot top-slot stock ${stock.length ? "is-clickable" : ""}`}
          role="button"
          aria-label="Pioche"
          title={stock.length ? "Piocher 1 carte" : "Recycler la défausse"}
          onClick={drawCardFromStock}
          data-drop="stock"
        >
          {stock.length ? (
            <div className="card back" />
          ) : (
            <div className="slot-label">
              <FaArrowRotateRight />
            </div>
          )}
          <div className="slot-count">{stock.length}</div>
        </div>

        {/* col 2: Waste */}
        <div className="sol-slot top-slot waste" data-drop="waste">
          {wasteCardToRender ? (
            <CardView
              card={{ ...wasteCardToRender, faceUp: true }}
              className={
                wasteCardToRender.id === wasteTop?.id && isDraggingWasteTop
                  ? "is-hidden"
                  : ""
              }
              onPointerDown={(e) =>
                wasteCardToRender.id === wasteTop?.id && !autoMove
                  ? startDrag(e, [wasteTop!], { kind: "waste" })
                  : undefined
              }
              onPointerMove={onDragMove}
              onPointerUp={handleDrop}
              onPointerCancel={endDragSnapBack}
              onDoubleClick={(e) => {
                if (wasteCardToRender.id !== wasteTop?.id) return;
                if (drag || autoMove) return;
                const originRect = (
                  e.currentTarget as HTMLElement
                ).getBoundingClientRect();
                animateAutoMoveFromWaste(originRect);
              }}
            />
          ) : (
            <div className="slot-empty" />
          )}
        </div>

        {/* col 3: gap (empty) */}
        <div className="top-gap" aria-hidden="true" data-drop="gap" />

        {/* col 4-7: Foundations */}
        {fundations.map((pile, i) => {
          const realTop = pile.cards.length
            ? pile.cards[pile.cards.length - 1]
            : null;

          const draggingThisTop =
            !!activeGhost &&
            activeGhost.from.kind === "foundation" &&
            activeGhost.from.pileIndex === i &&
            activeGhost.cards.length === 1 &&
            !!realTop &&
            activeGhost.cards[0].id === realTop.id;

          const cardToShow =
            draggingThisTop && pile.cards.length >= 2
              ? pile.cards[pile.cards.length - 2]
              : realTop;

          const showEmptyNoSvgPlaceholder =
            draggingThisTop && pile.cards.length === 1;

          return (
            <div
              key={i}
              className="sol-slot top-slot foundation"
              title="Fondation"
              data-drop="foundation"
              data-foundation-index={i}
            >
              {cardToShow ? (
                <CardView
                  card={{ ...cardToShow, faceUp: true }}
                  className={
                    realTop &&
                    cardToShow.id === realTop.id &&
                    isDraggingFoundationTop(i, realTop.id)
                      ? "is-hidden"
                      : ""
                  }
                  onPointerDown={(e) => {
                    if (!realTop) return;
                    if (cardToShow.id !== realTop.id) return;
                    if (autoMove) return;

                    startDrag(e, [realTop], {
                      kind: "foundation",
                      pileIndex: i,
                    });
                  }}
                  onPointerMove={onDragMove}
                  onPointerUp={handleDrop}
                  onPointerCancel={endDragSnapBack}
                  onDoubleClick={(e) => {
                    if (!realTop) return;
                    if (cardToShow.id !== realTop.id) return;
                    if (drag || autoMove) return;
                    const originRect = (
                      e.currentTarget as HTMLElement
                    ).getBoundingClientRect();
                    animateAutoMoveFromFoundation(i, originRect);
                  }}
                />
              ) : showEmptyNoSvgPlaceholder ? (
                <div className="foundation-empty" aria-hidden="true" />
              ) : (
                <div className="slot-label">
                  {pile.suit ? (
                    SUIT_SYMBOL[pile.suit]
                  ) : (
                    <div className="fundation-icons">
                      <GiClubs /> <GiDiamonds /> <GiHearts /> <GiSpades />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* TABLEAU */}
      <div className="solitaire-zone solitaire-zone--tableau">
        <div className="solitaire-tableau">
          {tableau.map((pile, pileIndex) => {
            const isEmpty = pile.length === 0;

            return (
              <div
                key={pileIndex}
                className={`tableau-pile ${isEmpty ? "is-empty" : ""}`}
                data-drop="tableau"
                data-tableau-index={pileIndex}
              >
                {isEmpty && <div className="slot-empty tableau-empty" />}

                {pile.map((card, cardIndex) => {
                  let offsetY = 0;
                  for (let i = 0; i < cardIndex; i++) {
                    offsetY += pile[i].faceUp ? 28 : 12;
                  }

                  const canStartStackDrag =
                    card.faceUp && pile.slice(cardIndex).every((c) => c.faceUp);

                  const hidden = isDraggingTableauCard(pileIndex, cardIndex);

                  const isTop = cardIndex === pile.length - 1;

                  return (
                    <CardView
                      key={card.id}
                      card={card}
                      className={`tableau-card ${hidden ? "is-hidden" : ""}`}
                      style={{ top: `${8 + offsetY}px` }}
                      onPointerDown={
                        canStartStackDrag && !autoMove
                          ? (e) =>
                              startDrag(e, pile.slice(cardIndex), {
                                kind: "tableau",
                                pileIndex,
                                cardIndex,
                              })
                          : undefined
                      }
                      onPointerMove={onDragMove}
                      onPointerUp={handleDrop}
                      onPointerCancel={endDragSnapBack}
                      onDoubleClick={(e) => {
                        if (!card.faceUp) return;
                        if (drag || autoMove) return;

                        const originRect = (
                          e.currentTarget as HTMLElement
                        ).getBoundingClientRect();

                        if (isTop) {
                          animateAutoMoveFromTableau(pileIndex, originRect);
                          return;
                        }

                        if (canStartStackDrag) {
                          animateAutoMovePacketFromTableau(
                            pileIndex,
                            cardIndex,
                            originRect,
                          );
                        }
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* GHOST (drag OR auto-move) */}
      {activeGhost && (
        <div
          className={`drag-layer ${activeGhost.phase === "snapping" ? "snapping" : ""}`}
          style={{
            transform: `translate3d(${activeGhost.left}px, ${activeGhost.top}px, 0)`,
          }}
          onTransitionEnd={() => {
            if (drag && drag.phase === "snapping") setDrag(null);

            if (autoMove) {
              autoMove.commit();
              setAutoMove(null);
              incrementMoves();
            }
          }}
        >
          <div className="drag-stack">
            {activeGhost.cards.map((c, i) => (
              <CardView
                key={c.id}
                card={{ ...c, faceUp: true }}
                className="drag-ghost"
                style={{
                  position: "absolute",
                  top: `${i * 28}px`,
                  left: 0,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
