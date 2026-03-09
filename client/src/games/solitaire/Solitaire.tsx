import React, { useCallback, useEffect, useMemo, useState } from "react";
import { GiClubs, GiDiamonds, GiHearts, GiSpades } from "react-icons/gi";
import { FaArrowRotateRight, FaStopwatch } from "react-icons/fa6";
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
  cards: Card[];
  from: DragFrom;
  phase: DragPhase;

  originLeft: number;
  originTop: number;
  left: number;
  top: number;

  offsetX: number;
  offsetY: number;

  pointerId: number;
  commit?: () => void;
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
  countMove?: boolean;
};

type AutoFinishMove =
  | {
      source: "waste";
      card: Card;
      foundationIndex: number;
    }
  | {
      source: "tableau";
      pileIndex: number;
      card: Card;
      foundationIndex: number;
    }
  | {
      source: "draw-stock";
    }
  | {
      source: "recycle-stock";
    };

type MoveRecord =
  | {
      type: "waste-to-foundation";
      cardIds: [string];
      toFoundationIndex: number;
    }
  | {
      type: "waste-to-tableau";
      cardIds: [string];
      toPileIndex: number;
    }
  | {
      type: "tableau-to-foundation";
      cardIds: [string];
      fromPileIndex: number;
      toFoundationIndex: number;
      revealedCardId?: string;
    }
  | {
      type: "tableau-to-tableau";
      cardIds: string[];
      fromPileIndex: number;
      fromCardIndex: number;
      toPileIndex: number;
      revealedCardId?: string;
    }
  | {
      type: "foundation-to-foundation";
      cardIds: [string];
      fromFoundationIndex: number;
      toFoundationIndex: number;
    }
  | {
      type: "foundation-to-tableau";
      cardIds: [string];
      fromFoundationIndex: number;
      toPileIndex: number;
    }
  | {
      type: "draw-stock";
      cardIds: [string];
    }
  | {
      type: "recycle-stock";
    };

type HistoryEntry = {
  before: GameState;
  countedMove: boolean;
  move: MoveRecord;
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

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function cloneGameState(state: GameState): GameState {
  return structuredClone(state);
}

function makePointRect(left: number, top: number): DOMRect {
  return {
    x: left,
    y: top,
    width: 0,
    height: 0,
    top,
    right: left,
    bottom: top,
    left,
    toJSON() {
      return { left, top };
    },
  } as DOMRect;
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [autoMove, setAutoMove] = useState<AutoMoveState | null>(null);
  const [isAutoFinishing, setIsAutoFinishing] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const { tableau, stock, waste, fundations } = gameState;
  const wasteTop = waste.length ? waste[waste.length - 1] : null;
  const wasteSecond = waste.length > 1 ? waste[waste.length - 2] : null;

  const isWon = useMemo(
    () => fundations.every((p) => p.cards.length === 13),
    [fundations],
  );

  const allTableauCardsFaceUp = useMemo(() => {
    return tableau.every((pile) => pile.every((card) => card.faceUp));
  }, [tableau]);

  const activeGhost = drag ?? autoMove;

  /* ---------- Moves / game controls ---------- */

  const pushHistoryEntry = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => [...prev, entry].slice(-300));
  }, []);

  const resetGame = useCallback(() => {
    setGameState(newGameState());
    setMoves(0);
    setElapsedSeconds(0);
    setTimerStarted(false);
    setDrag(null);
    setAutoMove(null);
    setIsAutoFinishing(false);
    setHistory([]);
  }, []);

  const incrementMoves = useCallback(() => {
    setMoves((m) => {
      if (m === 0) setTimerStarted(true);
      return m + 1;
    });
  }, []);

  useEffect(() => {
    if (!timerStarted || isWon) return;

    const interval = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerStarted, isWon]);

  /* =========================================================
     Drag
     ========================================================= */

  const startDrag = useCallback(
    (e: React.PointerEvent, cards: Card[], from: DragFrom) => {
      if (autoMove || isAutoFinishing) return;
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
        left: rect.left,
        top: rect.top,
        offsetX,
        offsetY,
        pointerId: e.pointerId,
      });
    },
    [autoMove, isAutoFinishing],
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

      if (dx < 1 && dy < 1) return null;

      return {
        ...d,
        phase: "snapping",
        left: d.originLeft,
        top: d.originTop,
        commit: undefined,
      };
    });
  }, []);

  const snapDragToTarget = useCallback(
    (destLeft: number, destTop: number, commit: () => void) => {
      setDrag((d) => {
        if (!d) return d;
        return {
          ...d,
          phase: "snapping",
          left: destLeft,
          top: destTop,
          commit,
        };
      });
    },
    [],
  );

  /* =========================================================
     Position helpers
     ========================================================= */

  function getFoundationSlotRect(i: number) {
    const el = document.querySelector<HTMLElement>(
      `[data-drop="foundation"][data-foundation-index="${i}"]`,
    );
    return el?.getBoundingClientRect() ?? null;
  }

  function getFoundationCardRect(i: number) {
    const slot = document.querySelector<HTMLElement>(
      `[data-drop="foundation"][data-foundation-index="${i}"]`,
    );
    if (!slot) return null;
    const cardEl =
      slot.querySelector<HTMLElement>(".card:not(.is-hidden)") ?? slot;
    return cardEl.getBoundingClientRect();
  }

  function getTableauPileRect(i: number) {
    const el = document.querySelector<HTMLElement>(
      `[data-drop="tableau"][data-tableau-index="${i}"]`,
    );
    return el?.getBoundingClientRect() ?? null;
  }

  function getWasteCardRect() {
    const el = document.querySelector<HTMLElement>(".top-slot.waste .card");
    return el?.getBoundingClientRect() ?? null;
  }

  function getWasteSlotRect() {
    const el = document.querySelector<HTMLElement>(".top-slot.waste");
    return el?.getBoundingClientRect() ?? null;
  }

  function getStockSlotRect() {
    const el = document.querySelector<HTMLElement>(".top-slot.stock");
    return el?.getBoundingClientRect() ?? null;
  }

  function computeTableauInsertOffsetY(pile: Card[]) {
    let offsetY = 0;
    for (const c of pile) offsetY += c.faceUp ? 28 : 12;
    return 8 + offsetY;
  }

  function getTableauCardDestPos(pileIndex: number, t: Card[][]) {
    const pileRect = getTableauPileRect(pileIndex);
    if (!pileRect) return null;
    const offsetY = computeTableauInsertOffsetY(t[pileIndex] ?? []);
    return { left: pileRect.left, top: pileRect.top + offsetY };
  }

  function getTableauCardPos(
    pileIndex: number,
    cardIndex: number,
    t: Card[][],
  ) {
    const pileRect = getTableauPileRect(pileIndex);
    const pile = t[pileIndex];
    if (!pileRect || !pile || cardIndex < 0 || cardIndex >= pile.length) {
      return null;
    }

    let offsetY = 8;
    for (let i = 0; i < cardIndex; i++) {
      offsetY += pile[i].faceUp ? 28 : 12;
    }

    return { left: pileRect.left, top: pileRect.top + offsetY };
  }

  function getFoundationDestPos(i: number) {
    const r = getFoundationSlotRect(i);
    if (!r) return null;
    return { left: r.left, top: r.top };
  }

  function findCardById(state: GameState, id: string): Card | null {
    for (const c of state.stock) if (c.id === id) return c;
    for (const c of state.waste) if (c.id === id) return c;
    for (const pile of state.tableau) {
      for (const c of pile) if (c.id === id) return c;
    }
    for (const f of state.fundations) {
      for (const c of f.cards) if (c.id === id) return c;
    }
    return null;
  }

  /* =========================================================
     Auto-move animation
     ========================================================= */

  const startAutoMoveAnimation = useCallback(
    (args: {
      cards: Card[];
      from: DragFrom;
      originRect: DOMRect;
      destLeft: number;
      destTop: number;
      commit: () => void;
      countMove?: boolean;
    }) => {
      const { cards, from, originRect, destLeft, destTop, commit, countMove } =
        args;

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
        countMove,
      });

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
     Shared rule helpers
     ========================================================= */

  const canMoveToFoundation = useCallback(
    (card: Card, foundationIndex: number) => {
      const f = fundations[foundationIndex];
      if (!f) return false;

      const top = f.cards.length ? f.cards[f.cards.length - 1] : null;

      if (f.cards.length === 0) return card.rank === 1;
      return f.suit === card.suit && !!top && card.rank === top.rank + 1;
    },
    [fundations],
  );

  const findFoundationTarget = useCallback(
    (card: Card): number | null => {
      for (let i = 0; i < fundations.length; i++) {
        const f = fundations[i];
        if (f.cards.length > 0 && f.suit === card.suit) {
          if (canMoveToFoundation(card, i)) return i;
        }
      }

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

      if (!top) return card.rank === 13;
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

      if (!toTop) return lead.rank === 13;
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

  /* =========================================================
     Direct move functions
     ========================================================= */

  const commitWasteToFoundation = useCallback(
    (
      cardId: string,
      toFoundationIndex: number,
      options?: { record?: boolean; countedMove?: boolean },
    ) => {
      const before = gameState;
      const prevWasteTop = before.waste[before.waste.length - 1];
      if (!prevWasteTop || prevWasteTop.id !== cardId) return false;

      const foundation = before.fundations[toFoundationIndex];
      const top = foundation.cards[foundation.cards.length - 1];

      if (foundation.cards.length === 0) {
        if (prevWasteTop.rank !== 1) return false;
      } else {
        if (prevWasteTop.suit !== foundation.suit) return false;
        if (!top || prevWasteTop.rank !== top.rank + 1) return false;
      }

      const newWaste = before.waste.slice(0, -1);
      const newFoundations = before.fundations.map((p, i) => {
        if (i !== toFoundationIndex) return p;
        return {
          suit: p.suit ?? prevWasteTop.suit,
          cards: [...p.cards, prevWasteTop],
        };
      });

      if (options?.record !== false) {
        pushHistoryEntry({
          before: cloneGameState(before),
          countedMove: options?.countedMove !== false,
          move: {
            type: "waste-to-foundation",
            cardIds: [cardId],
            toFoundationIndex,
          },
        });
      }

      setGameState({ ...before, waste: newWaste, fundations: newFoundations });
      return true;
    },
    [gameState, moves, elapsedSeconds, timerStarted, pushHistoryEntry],
  );

  const commitWasteToTableau = useCallback(
    (
      cardId: string,
      toPileIndex: number,
      options?: { record?: boolean; countedMove?: boolean },
    ) => {
      const before = gameState;
      const prevWasteTop = before.waste[before.waste.length - 1];
      if (!prevWasteTop || prevWasteTop.id !== cardId) return false;

      const pile = before.tableau[toPileIndex];
      const top = pile[pile.length - 1];

      if (pile.length === 0) {
        if (prevWasteTop.rank !== 13) return false;
      } else {
        if (colorOfSuit(prevWasteTop.suit) === colorOfSuit(top.suit))
          return false;
        if (prevWasteTop.rank !== top.rank - 1) return false;
      }

      const newWaste = before.waste.slice(0, -1);
      const newTableau = before.tableau.map((p, i) =>
        i === toPileIndex ? [...p, prevWasteTop] : p,
      );

      if (options?.record !== false) {
        pushHistoryEntry({
          before: cloneGameState(before),

          countedMove: options?.countedMove !== false,
          move: {
            type: "waste-to-tableau",
            cardIds: [cardId],
            toPileIndex,
          },
        });
      }

      setGameState({ ...before, waste: newWaste, tableau: newTableau });
      return true;
    },
    [gameState, moves, elapsedSeconds, timerStarted, pushHistoryEntry],
  );

  const commitTableauToFoundation = useCallback(
    (
      fromPileIndex: number,
      cardId: string,
      toFoundationIndex: number,
      options?: { record?: boolean; countedMove?: boolean },
    ) => {
      const before = gameState;
      const prevFromPile = before.tableau[fromPileIndex];
      if (!prevFromPile || prevFromPile.length === 0) return false;

      const prevCard = prevFromPile[prevFromPile.length - 1];
      if (prevCard.id !== cardId) return false;
      if (!prevCard.faceUp) return false;

      const foundation = before.fundations[toFoundationIndex];
      const top = foundation.cards[foundation.cards.length - 1];

      if (foundation.cards.length === 0) {
        if (prevCard.rank !== 1) return false;
      } else {
        if (foundation.suit !== prevCard.suit) return false;
        if (!top || prevCard.rank !== top.rank + 1) return false;
      }

      const cut = prevFromPile.slice(0, -1);
      let revealedCardId: string | undefined;
      if (cut.length > 0) {
        const last = cut[cut.length - 1];
        if (!last.faceUp) {
          cut[cut.length - 1] = { ...last, faceUp: true };
          revealedCardId = last.id;
        }
      }

      const newTableau = before.tableau.map((p, i) =>
        i === fromPileIndex ? cut : p,
      );

      const newFoundations = before.fundations.map((p, i) => {
        if (i !== toFoundationIndex) return p;
        return {
          suit: p.suit ?? prevCard.suit,
          cards: [...p.cards, prevCard],
        };
      });

      if (options?.record !== false) {
        pushHistoryEntry({
          before: cloneGameState(before),

          countedMove: options?.countedMove !== false,
          move: {
            type: "tableau-to-foundation",
            cardIds: [cardId],
            fromPileIndex,
            toFoundationIndex,
            revealedCardId,
          },
        });
      }

      setGameState({
        ...before,
        tableau: newTableau,
        fundations: newFoundations,
      });
      return true;
    },
    [gameState, moves, elapsedSeconds, timerStarted, pushHistoryEntry],
  );

  const commitTableauToTableau = useCallback(
    (
      fromPileIndex: number,
      fromCardIndex: number,
      packetIds: string[],
      toPileIndex: number,
      options?: { record?: boolean; countedMove?: boolean },
    ) => {
      const before = gameState;
      const prevFromPile = before.tableau[fromPileIndex];
      const prevToPile = before.tableau[toPileIndex];
      if (!prevFromPile || !prevToPile) return false;

      if (fromCardIndex < 0 || fromCardIndex >= prevFromPile.length)
        return false;

      const prevPacket = prevFromPile.slice(fromCardIndex);
      if (!prevPacket.length) return false;

      if (
        prevPacket.length !== packetIds.length ||
        prevPacket.some((c, i) => c.id !== packetIds[i])
      ) {
        return false;
      }

      if (!prevPacket.every((c) => c.faceUp)) return false;

      const lead = prevPacket[0];
      const toTop = prevToPile.length
        ? prevToPile[prevToPile.length - 1]
        : null;

      if (!toTop) {
        if (lead.rank !== 13) return false;
      } else {
        if (colorOfSuit(lead.suit) === colorOfSuit(toTop.suit)) return false;
        if (lead.rank !== toTop.rank - 1) return false;
      }

      let revealedCardId: string | undefined;

      const newTableau = before.tableau.map((p, i) => {
        if (i === fromPileIndex) {
          const cut = p.slice(0, fromCardIndex);
          if (cut.length > 0) {
            const last = cut[cut.length - 1];
            if (!last.faceUp) {
              cut[cut.length - 1] = { ...last, faceUp: true };
              revealedCardId = last.id;
            }
          }
          return cut;
        }

        if (i === toPileIndex) {
          return [...p, ...prevPacket];
        }

        return p;
      });

      if (options?.record !== false) {
        pushHistoryEntry({
          before: cloneGameState(before),

          countedMove: options?.countedMove !== false,
          move: {
            type: "tableau-to-tableau",
            cardIds: packetIds,
            fromPileIndex,
            fromCardIndex,
            toPileIndex,
            revealedCardId,
          },
        });
      }

      setGameState({ ...before, tableau: newTableau });
      return true;
    },
    [gameState, moves, elapsedSeconds, timerStarted, pushHistoryEntry],
  );

  const commitFoundationToFoundation = useCallback(
    (
      fromFoundationIndex: number,
      cardId: string,
      toFoundationIndex: number,
      options?: { record?: boolean; countedMove?: boolean },
    ) => {
      const before = gameState;
      const prevFrom = before.fundations[fromFoundationIndex];
      const prevTo = before.fundations[toFoundationIndex];
      if (!prevFrom || !prevTo) return false;
      if (prevFrom.cards.length === 0) return false;

      const prevCard = prevFrom.cards[prevFrom.cards.length - 1];
      if (prevCard.id !== cardId) return false;
      if (prevTo.cards.length !== 0) return false;
      if (prevCard.rank !== 1) return false;

      const newFromCards = prevFrom.cards.slice(0, -1);
      const newToCards = [...prevTo.cards, prevCard];

      const newFundations = before.fundations.map((p, i) => {
        if (i === fromFoundationIndex) {
          return {
            suit: newFromCards.length ? p.suit : null,
            cards: newFromCards,
          };
        }
        if (i === toFoundationIndex) {
          return {
            suit: p.suit ?? prevCard.suit,
            cards: newToCards,
          };
        }
        return p;
      });

      if (options?.record !== false) {
        pushHistoryEntry({
          before: cloneGameState(before),

          countedMove: options?.countedMove !== false,
          move: {
            type: "foundation-to-foundation",
            cardIds: [cardId],
            fromFoundationIndex,
            toFoundationIndex,
          },
        });
      }

      setGameState({ ...before, fundations: newFundations });
      return true;
    },
    [gameState, moves, elapsedSeconds, timerStarted, pushHistoryEntry],
  );

  const commitFoundationToTableau = useCallback(
    (
      fromFoundationIndex: number,
      cardId: string,
      toPileIndex: number,
      options?: { record?: boolean; countedMove?: boolean },
    ) => {
      const before = gameState;
      const prevFrom = before.fundations[fromFoundationIndex];
      const prevToPile = before.tableau[toPileIndex];
      if (!prevFrom || !prevToPile) return false;
      if (prevFrom.cards.length === 0) return false;

      const prevCard = prevFrom.cards[prevFrom.cards.length - 1];
      if (prevCard.id !== cardId) return false;

      const toTop = prevToPile.length
        ? prevToPile[prevToPile.length - 1]
        : null;

      if (!toTop) {
        if (prevCard.rank !== 13) return false;
      } else {
        if (colorOfSuit(prevCard.suit) === colorOfSuit(toTop.suit))
          return false;
        if (prevCard.rank !== toTop.rank - 1) return false;
      }

      const newFromCards = prevFrom.cards.slice(0, -1);

      const newFundations = before.fundations.map((p, i) => {
        if (i !== fromFoundationIndex) return p;
        return {
          suit: newFromCards.length ? p.suit : null,
          cards: newFromCards,
        };
      });

      const newTableau = before.tableau.map((p, i) =>
        i === toPileIndex ? [...p, prevCard] : p,
      );

      if (options?.record !== false) {
        pushHistoryEntry({
          before: cloneGameState(before),

          countedMove: options?.countedMove !== false,
          move: {
            type: "foundation-to-tableau",
            cardIds: [cardId],
            fromFoundationIndex,
            toPileIndex,
          },
        });
      }

      setGameState({
        ...before,
        fundations: newFundations,
        tableau: newTableau,
      });
      return true;
    },
    [gameState, moves, elapsedSeconds, timerStarted, pushHistoryEntry],
  );

  const drawCardFromStock = useCallback(
    (options?: { record?: boolean; countedMove?: boolean }) => {
      if (drag || autoMove || isAutoFinishing) return false;

      const before = gameState;

      if (before.stock.length > 0) {
        const cardDrawn = before.stock[before.stock.length - 1];
        const newStock = before.stock.slice(0, -1);
        const newWaste = [...before.waste, { ...cardDrawn, faceUp: true }];

        if (options?.record !== false) {
          pushHistoryEntry({
            before: cloneGameState(before),

            countedMove: options?.countedMove !== false,
            move: {
              type: "draw-stock",
              cardIds: [cardDrawn.id],
            },
          });
        }

        setGameState({
          ...before,
          stock: newStock,
          waste: newWaste,
        });
        if (options?.countedMove !== false) incrementMoves();
        return true;
      }

      if (before.waste.length > 0) {
        const recycledStock = [...before.waste]
          .reverse()
          .map((c) => ({ ...c, faceUp: false }));

        if (options?.record !== false) {
          pushHistoryEntry({
            before: cloneGameState(before),

            countedMove: options?.countedMove !== false,
            move: {
              type: "recycle-stock",
            },
          });
        }

        setGameState({
          ...before,
          stock: recycledStock,
          waste: [],
        });
        if (options?.countedMove !== false) incrementMoves();
        return true;
      }

      return false;
    },
    [
      drag,
      autoMove,
      isAutoFinishing,
      gameState,
      moves,
      elapsedSeconds,
      timerStarted,
      pushHistoryEntry,
      incrementMoves,
    ],
  );

  /* =========================================================
     Animated double-click moves
     ========================================================= */

  const animateAutoMoveFromWaste = useCallback(
    (originRect: DOMRect) => {
      if (drag || autoMove || isAutoFinishing) return;
      if (!wasteTop) return;

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
          commit: () =>
            commitWasteToFoundation(wasteTop.id, fTarget, {
              record: true,
              countedMove: true,
            }),
          countMove: true,
        });
        return;
      }

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
          commit: () =>
            commitWasteToTableau(wasteTop.id, tTarget, {
              record: true,
              countedMove: true,
            }),
          countMove: true,
        });
      }
    },
    [
      drag,
      autoMove,
      isAutoFinishing,
      wasteTop,
      tableau,
      findFoundationTarget,
      findTableauTarget,
      startAutoMoveAnimation,
      commitWasteToFoundation,
      commitWasteToTableau,
    ],
  );

  const animateAutoMoveFromTableau = useCallback(
    (fromPileIndex: number, originRect: DOMRect) => {
      if (drag || autoMove || isAutoFinishing) return;
      const fromPile = tableau[fromPileIndex];
      if (!fromPile || fromPile.length === 0) return;

      const card = fromPile[fromPile.length - 1];
      if (!card.faceUp) return;

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
          commit: () =>
            commitTableauToFoundation(fromPileIndex, card.id, fTarget, {
              record: true,
              countedMove: true,
            }),
          countMove: true,
        });
        return;
      }

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
          commit: () =>
            commitTableauToTableau(
              fromPileIndex,
              fromPile.length - 1,
              [card.id],
              tTarget,
              {
                record: true,
                countedMove: true,
              },
            ),
          countMove: true,
        });
      }
    },
    [
      drag,
      autoMove,
      isAutoFinishing,
      tableau,
      findFoundationTarget,
      findTableauTarget,
      startAutoMoveAnimation,
      commitTableauToFoundation,
      commitTableauToTableau,
    ],
  );

  const animateAutoMovePacketFromTableau = useCallback(
    (fromPileIndex: number, fromCardIndex: number, originRect: DOMRect) => {
      if (drag || autoMove || isAutoFinishing) return;

      const fromPile = tableau[fromPileIndex];
      if (!fromPile) return;
      if (fromCardIndex < 0 || fromCardIndex >= fromPile.length) return;

      const packet = fromPile.slice(fromCardIndex);
      if (!packet.length) return;
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
        commit: () =>
          commitTableauToTableau(
            fromPileIndex,
            fromCardIndex,
            packet.map((c) => c.id),
            tTarget,
            {
              record: true,
              countedMove: true,
            },
          ),
        countMove: true,
      });
    },
    [
      drag,
      autoMove,
      isAutoFinishing,
      tableau,
      findTableauTargetForPacket,
      startAutoMoveAnimation,
      commitTableauToTableau,
    ],
  );

  const animateAutoMoveFromFoundation = useCallback(
    (fromFoundationIndex: number, originRect: DOMRect) => {
      if (drag || autoMove || isAutoFinishing) return;
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
        commit: () =>
          commitFoundationToTableau(fromFoundationIndex, card.id, tTarget, {
            record: true,
            countedMove: true,
          }),
        countMove: true,
      });
    },
    [
      drag,
      autoMove,
      isAutoFinishing,
      fundations,
      tableau,
      findTableauTarget,
      startAutoMoveAnimation,
      commitFoundationToTableau,
    ],
  );

  /* =========================================================
     Auto-finish
     ========================================================= */

  const findNextAutoFinishMove = useCallback((): AutoFinishMove | null => {
    if (wasteTop) {
      const fTarget = findFoundationTarget(wasteTop);
      if (fTarget != null) {
        return {
          source: "waste",
          card: wasteTop,
          foundationIndex: fTarget,
        };
      }
    }

    for (let pileIndex = 0; pileIndex < tableau.length; pileIndex++) {
      const pile = tableau[pileIndex];
      if (!pile.length) continue;

      const card = pile[pile.length - 1];
      if (!card.faceUp) continue;

      const fTarget = findFoundationTarget(card);
      if (fTarget != null) {
        return {
          source: "tableau",
          pileIndex,
          card,
          foundationIndex: fTarget,
        };
      }
    }

    if (stock.length > 0) return { source: "draw-stock" };
    if (waste.length > 0) return { source: "recycle-stock" };

    return null;
  }, [wasteTop, waste, stock, tableau, findFoundationTarget]);

  const animateAutoFinishFromWaste = useCallback(
    (card: Card, foundationIndex: number) => {
      const originRect = getWasteCardRect();
      const dest = getFoundationDestPos(foundationIndex);
      if (!originRect || !dest) return false;

      startAutoMoveAnimation({
        cards: [card],
        from: { kind: "waste" },
        originRect,
        destLeft: dest.left,
        destTop: dest.top,
        commit: () =>
          commitWasteToFoundation(card.id, foundationIndex, {
            record: true,
            countedMove: false,
          }),
        countMove: false,
      });

      return true;
    },
    [startAutoMoveAnimation, commitWasteToFoundation],
  );

  const animateAutoFinishFromTableau = useCallback(
    (pileIndex: number, card: Card, foundationIndex: number) => {
      const originPos = getTableauCardPos(
        pileIndex,
        tableau[pileIndex].length - 1,
        tableau,
      );
      const dest = getFoundationDestPos(foundationIndex);
      if (!originPos || !dest) return false;

      startAutoMoveAnimation({
        cards: [card],
        from: {
          kind: "tableau",
          pileIndex,
          cardIndex: tableau[pileIndex].length - 1,
        },
        originRect: makePointRect(originPos.left, originPos.top),
        destLeft: dest.left,
        destTop: dest.top,
        commit: () =>
          commitTableauToFoundation(pileIndex, card.id, foundationIndex, {
            record: true,
            countedMove: false,
          }),
        countMove: false,
      });

      return true;
    },
    [startAutoMoveAnimation, tableau, commitTableauToFoundation],
  );

  const runOneAutoFinishStep = useCallback(() => {
    if (!allTableauCardsFaceUp) return false;
    if (drag || autoMove) return false;

    const nextMove = findNextAutoFinishMove();
    if (!nextMove) return false;

    if (nextMove.source === "waste") {
      return animateAutoFinishFromWaste(
        nextMove.card,
        nextMove.foundationIndex,
      );
    }

    if (nextMove.source === "tableau") {
      return animateAutoFinishFromTableau(
        nextMove.pileIndex,
        nextMove.card,
        nextMove.foundationIndex,
      );
    }

    if (nextMove.source === "draw-stock") {
      return drawCardFromStock({ record: true, countedMove: false });
    }

    if (nextMove.source === "recycle-stock") {
      return drawCardFromStock({ record: true, countedMove: false });
    }

    return false;
  }, [
    allTableauCardsFaceUp,
    drag,
    autoMove,
    findNextAutoFinishMove,
    animateAutoFinishFromWaste,
    animateAutoFinishFromTableau,
    drawCardFromStock,
  ]);

  useEffect(() => {
    if (isWon) return;
    if (!allTableauCardsFaceUp) {
      if (isAutoFinishing) setIsAutoFinishing(false);
      return;
    }

    if (!drag && !autoMove && !isAutoFinishing) {
      setIsAutoFinishing(true);
    }
  }, [allTableauCardsFaceUp, drag, autoMove, isAutoFinishing, isWon]);

  useEffect(() => {
    if (!isAutoFinishing) return;
    if (drag || autoMove) return;

    if (isWon) {
      setIsAutoFinishing(false);
      return;
    }

    const started = runOneAutoFinishStep();
    if (!started) {
      setIsAutoFinishing(false);
    }
  }, [isAutoFinishing, drag, autoMove, isWon, runOneAutoFinishStep]);

  /* =========================================================
     Drop target helpers
     ========================================================= */

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

  /* =========================================================
     Prepared animated drops
     ========================================================= */

  const prepareWasteToFoundationDrop = useCallback(
    (toFoundationIndex: number) => {
      if (!drag || drag.from.kind !== "waste") return null;
      if (drag.cards.length !== 1) return null;
      if (!wasteTop) return null;
      if (drag.cards[0].id !== wasteTop.id) return null;

      const foundation = fundations[toFoundationIndex];
      const top = foundation.cards[foundation.cards.length - 1];

      if (foundation.cards.length === 0) {
        if (wasteTop.rank !== 1) return null;
      } else {
        if (wasteTop.suit !== foundation.suit) return null;
        if (!top || wasteTop.rank !== top.rank + 1) return null;
      }

      const dest = getFoundationDestPos(toFoundationIndex);
      if (!dest) return null;

      return {
        destLeft: dest.left,
        destTop: dest.top,
        commit: () =>
          commitWasteToFoundation(wasteTop.id, toFoundationIndex, {
            record: true,
            countedMove: true,
          }),
      };
    },
    [drag, wasteTop, fundations, commitWasteToFoundation],
  );

  const prepareWasteToTableauDrop = useCallback(
    (toPileIndex: number) => {
      if (!drag || drag.from.kind !== "waste") return null;
      if (drag.cards.length !== 1) return null;
      if (!wasteTop) return null;
      if (drag.cards[0].id !== wasteTop.id) return null;

      const pile = tableau[toPileIndex];
      const top = pile[pile.length - 1];

      if (pile.length === 0) {
        if (wasteTop.rank !== 13) return null;
      } else {
        if (colorOfSuit(wasteTop.suit) === colorOfSuit(top.suit)) return null;
        if (wasteTop.rank !== top.rank - 1) return null;
      }

      const dest = getTableauCardDestPos(toPileIndex, tableau);
      if (!dest) return null;

      return {
        destLeft: dest.left,
        destTop: dest.top,
        commit: () =>
          commitWasteToTableau(wasteTop.id, toPileIndex, {
            record: true,
            countedMove: true,
          }),
      };
    },
    [drag, wasteTop, tableau, commitWasteToTableau],
  );

  const prepareTableauToFoundationDrop = useCallback(
    (fromPileIndex: number, toFoundationIndex: number) => {
      if (!drag || drag.from.kind !== "tableau") return null;
      if (drag.from.pileIndex !== fromPileIndex) return null;
      if (drag.cards.length !== 1) return null;

      const fromPile = tableau[fromPileIndex];
      if (!fromPile || fromPile.length === 0) return null;

      const card = fromPile[fromPile.length - 1];
      if (!card.faceUp) return null;
      if (drag.cards[0].id !== card.id) return null;

      const foundation = fundations[toFoundationIndex];
      const top = foundation.cards[foundation.cards.length - 1];

      if (foundation.cards.length === 0) {
        if (card.rank !== 1) return null;
      } else {
        if (foundation.suit !== card.suit) return null;
        if (!top || card.rank !== top.rank + 1) return null;
      }

      const dest = getFoundationDestPos(toFoundationIndex);
      if (!dest) return null;

      return {
        destLeft: dest.left,
        destTop: dest.top,
        commit: () =>
          commitTableauToFoundation(fromPileIndex, card.id, toFoundationIndex, {
            record: true,
            countedMove: true,
          }),
      };
    },
    [drag, tableau, fundations, commitTableauToFoundation],
  );

  const prepareTableauToTableauDrop = useCallback(
    (fromPileIndex: number, toPileIndex: number) => {
      if (!drag || drag.from.kind !== "tableau") return null;
      if (drag.from.pileIndex !== fromPileIndex) return null;
      if (fromPileIndex === toPileIndex) return null;

      const fromPile = tableau[fromPileIndex];
      if (!fromPile || fromPile.length === 0) return null;

      const fromCardIndex = drag.from.cardIndex;
      if (fromCardIndex < 0 || fromCardIndex >= fromPile.length) return null;

      const packet = fromPile.slice(fromCardIndex);
      if (!packet.length) return null;
      if (!packet.every((c) => c.faceUp)) return null;

      if (
        packet.length !== drag.cards.length ||
        packet.some((c, i) => c.id !== drag.cards[i]?.id)
      ) {
        return null;
      }

      const lead = packet[0];
      const toPile = tableau[toPileIndex];
      const toTop = toPile.length ? toPile[toPile.length - 1] : null;

      if (!toTop) {
        if (lead.rank !== 13) return null;
      } else {
        if (colorOfSuit(lead.suit) === colorOfSuit(toTop.suit)) return null;
        if (lead.rank !== toTop.rank - 1) return null;
      }

      const dest = getTableauCardDestPos(toPileIndex, tableau);
      if (!dest) return null;

      return {
        destLeft: dest.left,
        destTop: dest.top,
        commit: () =>
          commitTableauToTableau(
            fromPileIndex,
            fromCardIndex,
            packet.map((c) => c.id),
            toPileIndex,
            {
              record: true,
              countedMove: true,
            },
          ),
      };
    },
    [drag, tableau, commitTableauToTableau],
  );

  const prepareFoundationToFoundationDrop = useCallback(
    (fromFoundationIndex: number, toFoundationIndex: number) => {
      if (!drag || drag.from.kind !== "foundation") return null;
      if (drag.from.pileIndex !== fromFoundationIndex) return null;
      if (fromFoundationIndex === toFoundationIndex) return null;
      if (drag.cards.length !== 1) return null;

      const fromFoundation = fundations[fromFoundationIndex];
      if (!fromFoundation || fromFoundation.cards.length === 0) return null;

      const card = fromFoundation.cards[fromFoundation.cards.length - 1];
      if (drag.cards[0].id !== card.id) return null;

      const toFoundation = fundations[toFoundationIndex];
      if (!toFoundation) return null;
      if (toFoundation.cards.length !== 0) return null;
      if (card.rank !== 1) return null;

      const dest = getFoundationDestPos(toFoundationIndex);
      if (!dest) return null;

      return {
        destLeft: dest.left,
        destTop: dest.top,
        commit: () =>
          commitFoundationToFoundation(
            fromFoundationIndex,
            card.id,
            toFoundationIndex,
            {
              record: true,
              countedMove: true,
            },
          ),
      };
    },
    [drag, fundations, commitFoundationToFoundation],
  );

  const prepareFoundationToTableauDrop = useCallback(
    (fromFoundationIndex: number, toPileIndex: number) => {
      if (!drag || drag.from.kind !== "foundation") return null;
      if (drag.from.pileIndex !== fromFoundationIndex) return null;
      if (drag.cards.length !== 1) return null;

      const fromFoundation = fundations[fromFoundationIndex];
      if (!fromFoundation || fromFoundation.cards.length === 0) return null;

      const card = fromFoundation.cards[fromFoundation.cards.length - 1];
      if (drag.cards[0].id !== card.id) return null;

      const toPile = tableau[toPileIndex];
      const toTop = toPile.length ? toPile[toPile.length - 1] : null;

      if (!toTop) {
        if (card.rank !== 13) return null;
      } else {
        if (colorOfSuit(card.suit) === colorOfSuit(toTop.suit)) return null;
        if (card.rank !== toTop.rank - 1) return null;
      }

      const dest = getTableauCardDestPos(toPileIndex, tableau);
      if (!dest) return null;

      return {
        destLeft: dest.left,
        destTop: dest.top,
        commit: () =>
          commitFoundationToTableau(fromFoundationIndex, card.id, toPileIndex, {
            record: true,
            countedMove: true,
          }),
      };
    },
    [drag, fundations, tableau, commitFoundationToTableau],
  );

  const handleDrop = useCallback(
    (e: React.PointerEvent) => {
      if (!drag) return;

      const to = getDropTargetFromEvent(e);
      if (!to) {
        endDragSnapBack();
        return;
      }

      let prepared: {
        destLeft: number;
        destTop: number;
        commit: () => void;
      } | null = null;

      if (drag.from.kind === "waste") {
        prepared =
          to.kind === "foundation"
            ? prepareWasteToFoundationDrop(to.index)
            : prepareWasteToTableauDrop(to.index);
      } else if (drag.from.kind === "tableau") {
        prepared =
          to.kind === "foundation"
            ? prepareTableauToFoundationDrop(drag.from.pileIndex, to.index)
            : prepareTableauToTableauDrop(drag.from.pileIndex, to.index);
      } else {
        prepared =
          to.kind === "foundation"
            ? prepareFoundationToFoundationDrop(drag.from.pileIndex, to.index)
            : prepareFoundationToTableauDrop(drag.from.pileIndex, to.index);
      }

      if (prepared) {
        snapDragToTarget(prepared.destLeft, prepared.destTop, prepared.commit);
        return;
      }

      endDragSnapBack();
    },
    [
      drag,
      endDragSnapBack,
      snapDragToTarget,
      prepareWasteToFoundationDrop,
      prepareWasteToTableauDrop,
      prepareTableauToFoundationDrop,
      prepareTableauToTableauDrop,
      prepareFoundationToFoundationDrop,
      prepareFoundationToTableauDrop,
    ],
  );

  /* =========================================================
     Undo
     ========================================================= */

  const restoreHistoryEntry = useCallback(
    (entry: HistoryEntry) => {
      setGameState(cloneGameState(entry.before));
      incrementMoves();
      setHistory((prev) => prev.slice(0, -1));
      setIsAutoFinishing(false);
      setDrag(null);
      setAutoMove(null);
    },
    [incrementMoves],
  );

  const undoLastMove = useCallback(() => {
    if (drag || autoMove || isAutoFinishing) return;
    if (!history.length) return;

    const entry = history[history.length - 1];
    const current = gameState;

    const cards =
      "cardIds" in entry.move
        ? entry.move.cardIds
            .map(
              (id) =>
                findCardById(current, id) ?? findCardById(entry.before, id),
            )
            .filter((c): c is Card => !!c)
        : [];

    const startUndo = (
      origin: { left: number; top: number } | DOMRect | null,
      dest: { left: number; top: number } | null,
      from: DragFrom,
      cardsToUse: Card[],
    ) => {
      if (!origin || !dest || !cardsToUse.length) {
        restoreHistoryEntry(entry);
        return;
      }

      const originRect =
        "left" in origin && "top" in origin
          ? makePointRect(origin.left, origin.top)
          : origin;

      startAutoMoveAnimation({
        cards: cardsToUse,
        from,
        originRect,
        destLeft: dest.left,
        destTop: dest.top,
        commit: () => restoreHistoryEntry(entry),
        countMove: false,
      });
    };

    switch (entry.move.type) {
      case "waste-to-foundation": {
        startUndo(
          getFoundationCardRect(entry.move.toFoundationIndex),
          getWasteSlotRect(),
          { kind: "foundation", pileIndex: entry.move.toFoundationIndex },
          cards,
        );
        return;
      }

      case "waste-to-tableau": {
        const currentPile = current.tableau[entry.move.toPileIndex];
        const sourcePos = getTableauCardPos(
          entry.move.toPileIndex,
          currentPile.length - 1,
          current.tableau,
        );
        startUndo(
          sourcePos ? makePointRect(sourcePos.left, sourcePos.top) : null,
          getWasteSlotRect(),
          {
            kind: "tableau",
            pileIndex: entry.move.toPileIndex,
            cardIndex: currentPile.length - 1,
          },
          cards,
        );
        return;
      }

      case "tableau-to-foundation": {
        const targetPos = getTableauCardPos(
          entry.move.fromPileIndex,
          entry.before.tableau[entry.move.fromPileIndex].length - 1,
          entry.before.tableau,
        );
        startUndo(
          getFoundationCardRect(entry.move.toFoundationIndex),
          targetPos,
          { kind: "foundation", pileIndex: entry.move.toFoundationIndex },
          cards,
        );
        return;
      }

      case "tableau-to-tableau": {
        const currentPile = current.tableau[entry.move.toPileIndex];
        const currentStartIndex =
          currentPile.length - entry.move.cardIds.length;
        const sourcePos = getTableauCardPos(
          entry.move.toPileIndex,
          currentStartIndex,
          current.tableau,
        );
        const targetPos = getTableauCardPos(
          entry.move.fromPileIndex,
          entry.move.fromCardIndex,
          entry.before.tableau,
        );
        startUndo(
          sourcePos,
          targetPos,
          {
            kind: "tableau",
            pileIndex: entry.move.toPileIndex,
            cardIndex: currentStartIndex,
          },
          cards,
        );
        return;
      }

      case "foundation-to-foundation": {
        startUndo(
          getFoundationCardRect(entry.move.toFoundationIndex),
          getFoundationDestPos(entry.move.fromFoundationIndex),
          { kind: "foundation", pileIndex: entry.move.toFoundationIndex },
          cards,
        );
        return;
      }

      case "foundation-to-tableau": {
        const currentPile = current.tableau[entry.move.toPileIndex];
        const sourcePos = getTableauCardPos(
          entry.move.toPileIndex,
          currentPile.length - 1,
          current.tableau,
        );
        startUndo(
          sourcePos,
          getFoundationDestPos(entry.move.fromFoundationIndex),
          {
            kind: "tableau",
            pileIndex: entry.move.toPileIndex,
            cardIndex: currentPile.length - 1,
          },
          cards,
        );
        return;
      }

      case "draw-stock": {
        const wasteRect = getWasteCardRect() ?? getWasteSlotRect();
        const stockRect = getStockSlotRect();
        startUndo(
          wasteRect,
          stockRect ? { left: stockRect.left, top: stockRect.top } : null,
          { kind: "waste" },
          cards,
        );
        return;
      }

      case "recycle-stock": {
        restoreHistoryEntry(entry);
        return;
      }
    }
  }, [
    drag,
    autoMove,
    isAutoFinishing,
    history,
    gameState,
    restoreHistoryEntry,
    startAutoMoveAnimation,
  ]);

  const wasteCardToRender =
    isDraggingWasteTop && wasteSecond ? wasteSecond : wasteTop;

  /* =========================================================
     Render
     ========================================================= */

  return (
    <div className="solitaire-container">
      <div className="solitaire-topbar">
        <span>Mouvements: {moves}</span>
        {isWon && (
          <span className="solitaire-win">Félicitations! Vous avez gagné</span>
        )}
        <span className="statusBar__timer statusBar__timer--infinite solitaire_timer">
          <FaStopwatch className="timerIcon" /> {formatTime(elapsedSeconds)}
        </span>
      </div>

      <div className="solitaire-topgrid">
        <div
          className={`sol-slot top-slot stock ${stock.length ? "is-clickable" : ""}`}
          role="button"
          aria-label="Pioche"
          title={stock.length ? "Piocher 1 carte" : "Recycler la défausse"}
          onClick={() => drawCardFromStock({ record: true, countedMove: true })}
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
                if (drag || autoMove || isAutoFinishing) return;
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

        <div className="top-gap" aria-hidden="true" data-drop="gap" />

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
                    if (autoMove || isAutoFinishing) return;

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
                    if (drag || autoMove || isAutoFinishing) return;

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
                        canStartStackDrag && !autoMove && !isAutoFinishing
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
                        if (drag || autoMove || isAutoFinishing) return;

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

      {activeGhost && (
        <div
          className={`drag-layer ${activeGhost.phase === "snapping" ? "snapping" : ""}`}
          style={{
            transform: `translate3d(${activeGhost.left}px, ${activeGhost.top}px, 0)`,
          }}
          onTransitionEnd={() => {
            if (drag && drag.phase === "snapping") {
              if (drag.commit) {
                drag.commit();
                incrementMoves();
              }
              setDrag(null);
              return;
            }

            if (autoMove) {
              autoMove.commit();
              if (autoMove.countMove !== false) {
                incrementMoves();
              }
              setAutoMove(null);
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

      <div className="solitaire-bottombar">
        <button
          className="solitaire-btn commonButton commonMediumButton"
          onClick={undoLastMove}
        >
          Annuler
        </button>
        <button
          className="solitaire-btn commonButton commonMediumButton"
          onClick={resetGame}
        >
          Nouvelle partie
        </button>
      </div>
    </div>
  );
}
