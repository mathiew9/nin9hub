import React, { useCallback, useMemo, useState } from "react";
import "./solitaire.css";

/**
 * Suit = famille (pique / coeur / carreau / trèfle)
 * On stocke ça en lettres pour simplifier, et on map ensuite vers les symboles.
 */
type Suit = "S" | "H" | "D" | "C"; // Spades, Hearts, Diamonds, Clubs

/**
 * Color = couleur logique (rouge / noir)
 * C’est utile car les règles du tableau demandent une alternance de couleur.
 */
type Color = "red" | "black";

/**
 * Représentation d’une carte.
 * - id: identifiant unique (utile pour React keys + distinguer deux cartes identiques dans le DOM)
 * - suit: la famille
 * - rank: 1..13 (As..Roi)
 * - faceUp: true si la carte est visible
 */
type Card = {
  id: string;
  suit: Suit;
  rank: number; // 1..13
  faceUp: boolean;
};

/**
 * DragPayload = “d’où vient la carte / le stack que je suis en train de déplacer”
 * - from: "waste" -> carte tirée (défausse)
 * - from: "tableau" -> pile du tableau + index de la carte de départ (peut être une stack)
 *
 * Note : ici on ne drag QUE depuis waste et tableau.
 * Pas depuis foundations (tu pourrais l’ajouter plus tard).
 */
type DragPayload =
  | { from: "waste" }
  | { from: "tableau"; pileIndex: number; cardIndex: number };

/**
 * Mapping Suit -> symbole affiché.
 * Au lieu d’avoir une logique d’affichage partout, on centralise ici.
 */
const SUIT_SYMBOL: Record<Suit, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

/**
 * Convertit rank numérique en label (A,2..10,J,Q,K)
 * Exemple :
 * - 1 => "A"
 * - 11 => "J"
 * - 12 => "Q"
 * - 13 => "K"
 */
function rankLabel(rank: number) {
  if (rank === 1) return "A";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  return String(rank);
}

/**
 * Donne la couleur logique d’une famille.
 * Coeur (H) et Carreau (D) => red
 * Pique (S) et Trèfle (C) => black
 */
function colorOfSuit(s: Suit): Color {
  return s === "H" || s === "D" ? "red" : "black";
}

/**
 * Construit un deck de 52 cartes, toutes faceDown au départ.
 * On génère un id unique par carte.
 *
 * Note : on utilise crypto.randomUUID() -> super pratique.
 * Sur vieux navigateurs ça pourrait ne pas exister, mais en 2026 c’est ok.
 */
function makeDeck(): Card[] {
  const suits: Suit[] = ["S", "H", "D", "C"];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({
        id: `${suit}-${rank}-${crypto.randomUUID()}`,
        suit,
        rank,
        faceUp: false,
      });
    }
  }
  return deck;
}

/**
 * Mélange un tableau (Fisher-Yates).
 * On retourne une copie mélangée pour éviter de muter l’original.
 *
 * C’est la fonction standard “shuffle” à utiliser partout dans tes jeux.
 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Règle fondation (Klondike):
 * - si la fondation est vide -> seulement un As (rank === 1)
 * - sinon -> même suit et rank = top.rank + 1
 */
function canPlaceOnFoundation(card: Card, foundationTop: Card | null) {
  if (!foundationTop) return card.rank === 1; // Ace starts
  return (
    card.suit === foundationTop.suit && card.rank === foundationTop.rank + 1
  );
}

/**
 * Règle tableau (Klondike):
 * - si la pile est vide -> seulement un Roi (rank === 13)
 * - sinon -> alternance de couleurs + rank = top.rank - 1
 *
 * movingTop = carte la plus haute du stack qu’on déplace (celle “en tête”)
 * tableauTop = carte visible tout en haut de la pile cible
 */
function canPlaceOnTableau(movingTop: Card, tableauTop: Card | null) {
  if (!tableauTop) return movingTop.rank === 13; // King on empty
  const c1 = colorOfSuit(movingTop.suit);
  const c2 = colorOfSuit(tableauTop.suit);
  return c1 !== c2 && movingTop.rank === tableauTop.rank - 1;
}

/**
 * Vérifie qu’à partir de cardIndex, on a une séquence valide de cartes tableau :
 * - toutes les cartes sont faceUp
 * - ranks décroissants de 1 en 1
 * - alternance de couleurs
 *
 * Exemple valide: 9♠, 8♥, 7♣, 6♦
 *
 * Pourquoi c’est utile ?
 * -> dans Klondike, tu peux déplacer une pile de cartes, mais seulement si elles
 *    sont déjà bien “rangées” entre elles.
 */
function isValidTableauRun(pile: Card[], cardIndex: number) {
  const run = pile.slice(cardIndex);
  if (run.length === 0) return false;
  if (!run.every((c) => c.faceUp)) return false;

  for (let i = 0; i < run.length - 1; i++) {
    const a = run[i];
    const b = run[i + 1];
    // a doit être exactement au-dessus de b dans une suite décroissante
    if (a.rank !== b.rank + 1) return false;
    // couleurs doivent alterner
    if (colorOfSuit(a.suit) === colorOfSuit(b.suit)) return false;
  }
  return true;
}

/**
 * Drag & Drop HTML5 :
 * On doit stocker un petit “payload” dans dataTransfer.
 * Ici on sérialise le payload en JSON.
 */
function serializeDrag(p: DragPayload) {
  return JSON.stringify(p);
}

/**
 * On parse le payload drag & drop.
 * On vérifie un minimum la structure, sinon on renvoie null.
 */
function parseDrag(raw: string | null): DragPayload | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);

    // cas waste
    if (obj?.from === "waste") return { from: "waste" };

    // cas tableau
    if (
      obj?.from === "tableau" &&
      typeof obj.pileIndex === "number" &&
      typeof obj.cardIndex === "number"
    ) {
      return {
        from: "tableau",
        pileIndex: obj.pileIndex,
        cardIndex: obj.cardIndex,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Foundations = 4 piles (S/H/D/C) contenant chacune une liste de cartes.
 * On utilise un Record pour que ce soit facile d’accéder par suit.
 */
type Foundations = Record<Suit, Card[]>;

/**
 * Crée un état complet de nouvelle partie.
 * Ce que ça fait :
 * 1) Crée un deck et le mélange
 * 2) Deal dans 7 piles tableau :
 *    - pile 0 : 1 carte (faceUp)
 *    - pile 1 : 2 cartes (1 faceDown, 1 faceUp)
 *    - ...
 *    - pile 6 : 7 cartes (6 faceDown, 1 faceUp)
 * 3) Tout le reste va dans stock (pioche)
 * 4) waste vide
 * 5) foundations vides
 *
 * IMPORTANT (petite limite dans ton code actuel) :
 * Tu appelles newGameState() 4 fois au montage (voir useState plus bas),
 * donc tu génères 4 parties différentes et tu en prends des morceaux.
 * Ça peut créer un état initial incohérent.
 * (Je te note une version corrigée en commentaire plus bas.)
 */
function newGameState() {
  let deck = shuffle(makeDeck());

  // 7 tableau piles
  const tableau: Card[][] = Array.from({ length: 7 }, () => []);

  // deal: pile i gets i+1 cards, only top faceUp
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j <= i; j++) {
      const card = deck.pop()!;
      tableau[i].push({
        ...card,
        faceUp: j === i, // top card faceUp
      });
    }
  }

  // Le reste du deck devient la pioche (stock), toutes faceDown
  const stock: Card[] = deck.map((c) => ({ ...c, faceUp: false }));

  // Défausse vide au départ
  const waste: Card[] = [];

  // Fondations vides au départ
  const foundations: Foundations = {
    S: [],
    H: [],
    D: [],
    C: [],
  };

  return { stock, waste, tableau, foundations };
}

export default function Solitaire() {
  /**
   * STATE PRINCIPAL DU JEU
   *
   * - stock : pioche faceDown
   * - waste : défausse faceUp (on ne montre que la dernière carte en UI)
   * - tableau : 7 piles
   * - foundations : 4 piles (une par suit)
   * - moves : compteur de mouvements (pure UI)
   *
   * ⚠️ Remarque importante :
   * Ici tu appelles newGameState() 4 fois (une par useState).
   * Ça veut dire :
   *   stock vient d’une partie A,
   *   waste vient d’une partie B (vide donc ok),
   *   tableau vient d’une partie C,
   *   foundations vient d’une partie D.
   * -> C’est le gros point à corriger quand tu referas ton fichier.
   *
   * Bonne approche :
   * const [state, setState] = useState(() => newGameState());
   * puis tu dérives stock/waste/tableau/foundations depuis state.
   */
  const [stock, setStock] = useState<Card[]>(() => newGameState().stock);
  const [waste, setWaste] = useState<Card[]>(() => newGameState().waste);
  const [tableau, setTableau] = useState<Card[][]>(
    () => newGameState().tableau,
  );
  const [foundations, setFoundations] = useState<Foundations>(
    () => newGameState().foundations,
  );
  const [moves, setMoves] = useState(0);

  /**
   * Reset complet du jeu : on recrée un state propre
   * (Ici c’est cohérent car tu fais un seul newGameState() dans resetGame.)
   */
  const resetGame = useCallback(() => {
    const s = newGameState();
    setStock(s.stock);
    setWaste(s.waste);
    setTableau(s.tableau);
    setFoundations(s.foundations);
    setMoves(0);
  }, []);

  /**
   * Détermine si le joueur a gagné.
   * Condition simple : 52 cartes sont dans les foundations.
   *
   * useMemo : recalcul seulement quand foundations change.
   */
  const isWon = useMemo(() => {
    const total =
      foundations.S.length +
      foundations.H.length +
      foundations.D.length +
      foundations.C.length;
    return total === 52;
  }, [foundations]);

  /**
   * Incrémente le compteur de mouvements.
   * useCallback : évite de recréer la fonction à chaque render.
   */
  const incMoves = useCallback(() => setMoves((m) => m + 1), []);

  /**
   * Pioche 1 carte (version “draw one”):
   * - si stock non vide : on prend la dernière carte du stock et on la met dans waste faceUp
   * - si stock vide : on recycle la waste vers stock
   *
   * Détail du recycle :
   * waste est faceUp dans l’ordre où tu as pioché.
   * On reverse pour remettre la plus ancienne au “dessus” du nouveau stock, comme dans le Klondike classique.
   */
  const drawOne = useCallback(() => {
    if (stock.length > 0) {
      const top = stock[stock.length - 1];
      const newStock = stock.slice(0, -1);
      const newWaste = [...waste, { ...top, faceUp: true }];
      setStock(newStock);
      setWaste(newWaste);
      incMoves();
      return;
    }

    // recycle waste -> stock (faceDown), keeping order typical:
    // waste top becomes last of stock after reversal
    if (waste.length > 0) {
      const recycled = [...waste]
        .reverse()
        .map((c) => ({ ...c, faceUp: false }));
      setStock(recycled);
      setWaste([]);
      incMoves();
    }
  }, [stock, waste, incMoves]);

  /**
   * Helpers : récupérer la carte du dessus d’une fondation (ou null si vide)
   */
  const getFoundationTop = useCallback(
    (suit: Suit): Card | null => {
      const pile = foundations[suit];
      return pile.length ? pile[pile.length - 1] : null;
    },
    [foundations],
  );

  /**
   * Helpers : récupérer la carte du dessus d’une pile tableau (ou null si vide)
   */
  const getTableauTop = useCallback(
    (pileIndex: number): Card | null => {
      const pile = tableau[pileIndex];
      return pile.length ? pile[pile.length - 1] : null;
    },
    [tableau],
  );

  /**
   * takeFromSource(payload)
   *
   * C’est une fonction “read-only” : elle ne modifie rien.
   * Elle te renvoie les cartes que tu es en train de tenter de déplacer.
   *
   * - depuis waste : une seule carte (la top)
   * - depuis tableau : un stack à partir de cardIndex, MAIS seulement si c’est une séquence valide
   *
   * Si impossible, renvoie null.
   */
  const takeFromSource = useCallback(
    (payload: DragPayload): Card[] | null => {
      if (payload.from === "waste") {
        if (waste.length === 0) return null;
        const top = waste[waste.length - 1];
        return [top];
      }

      const pile = tableau[payload.pileIndex];
      if (!pile || payload.cardIndex < 0 || payload.cardIndex >= pile.length)
        return null;
      if (!isValidTableauRun(pile, payload.cardIndex)) return null;

      return pile.slice(payload.cardIndex);
    },
    [waste, tableau],
  );

  /**
   * commitRemoveFromSource(payload)
   *
   * Là on “commit” : on retire vraiment la carte/stack de la source.
   * Important : c’est appelé seulement quand le drop est jugé valide.
   *
   * - waste : pop (on retire la dernière carte)
   * - tableau : on coupe la pile à cardIndex
   *   puis on flip la nouvelle carte top si elle était faceDown
   */
  const commitRemoveFromSource = useCallback((payload: DragPayload) => {
    if (payload.from === "waste") {
      setWaste((w) => w.slice(0, -1));
      return;
    }

    setTableau((prev) => {
      const next = prev.map((p) => [...p]);
      const pile = next[payload.pileIndex];
      const remaining = pile.slice(0, payload.cardIndex);
      next[payload.pileIndex] = remaining;

      // flip new top if faceDown
      const newTopIdx = remaining.length - 1;
      if (newTopIdx >= 0 && !remaining[newTopIdx].faceUp) {
        remaining[newTopIdx] = { ...remaining[newTopIdx], faceUp: true };
      }
      return next;
    });
  }, []);

  /**
   * cancelRemoveFromSource()
   * Ici c’est un no-op car tu n’enlèves rien pendant le drag.
   * Tu ne fais la suppression QUE quand tu sais que le drop est valide.
   *
   * Dans un autre design (optimiste), tu pourrais retirer au dragStart,
   * et remettre si drop invalide. Là tu n’en as pas besoin.
   */
  const cancelRemoveFromSource = useCallback(() => {
    // no-op: with our approach, we only remove on successful drop
  }, []);

  /**
   * onDragStartWaste
   * Déclenché au dragStart HTML5 sur la carte waste.
   * On pose dans dataTransfer l’origine = waste.
   */
  const onDragStartWaste = useCallback((e: React.DragEvent) => {
    const payload: DragPayload = { from: "waste" };
    e.dataTransfer.setData("application/json", serializeDrag(payload));
    e.dataTransfer.effectAllowed = "move";
  }, []);

  /**
   * onDragStartTableauCard(pileIndex, cardIndex)
   * Handler factory : renvoie une fonction qui sera utilisée par la carte.
   *
   * 1) refuse si carte faceDown
   * 2) refuse si la séquence à partir de cette carte est invalide
   * 3) sinon, stocke un payload tableau dans dataTransfer
   */
  const onDragStartTableauCard = useCallback(
    (pileIndex: number, cardIndex: number) => (e: React.DragEvent) => {
      const pile = tableau[pileIndex];
      if (!pile?.[cardIndex]?.faceUp) {
        e.preventDefault();
        return;
      }
      if (!isValidTableauRun(pile, cardIndex)) {
        e.preventDefault();
        return;
      }
      const payload: DragPayload = { from: "tableau", pileIndex, cardIndex };
      e.dataTransfer.setData("application/json", serializeDrag(payload));
      e.dataTransfer.effectAllowed = "move";
    },
    [tableau],
  );

  /**
   * allowDrop
   * Par défaut, un élément HTML refuse les drops.
   * Donc on doit faire e.preventDefault() sur dragOver pour dire “ok drop autorisé ici”.
   */
  const allowDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  /**
   * onDropTableau(targetPileIndex)
   * Drop handler sur une pile tableau.
   *
   * Étapes :
   * 1) parse payload (source)
   * 2) calcule moving stack (takeFromSource)
   * 3) valide règle tableau (canPlaceOnTableau)
   * 4) commit : retire de la source
   * 5) ajoute le stack dans la pile cible
   * 6) incrémente moves
   */
  const onDropTableau = useCallback(
    (targetPileIndex: number) => (e: React.DragEvent) => {
      e.preventDefault();
      const payload = parseDrag(e.dataTransfer.getData("application/json"));
      if (!payload) return;

      const moving = takeFromSource(payload);
      if (!moving) return;

      const movingTop = moving[0];
      const targetTop = getTableauTop(targetPileIndex);

      // Validation de la règle tableau
      if (!canPlaceOnTableau(movingTop, targetTop)) {
        cancelRemoveFromSource();
        return;
      }

      // commit move
      commitRemoveFromSource(payload);

      // Ajout dans la pile cible
      setTableau((prev) => {
        const next = prev.map((p) => [...p]);
        next[targetPileIndex] = [...next[targetPileIndex], ...moving];
        return next;
      });

      incMoves();
    },
    [
      takeFromSource,
      getTableauTop,
      commitRemoveFromSource,
      cancelRemoveFromSource,
      incMoves,
    ],
  );

  /**
   * onDropFoundation(suit)
   * Drop handler sur une fondation (S/H/D/C)
   *
   * Étapes :
   * 1) parse payload
   * 2) takeFromSource
   * 3) refuse si moving stack > 1 (fondation accepte 1 seule carte)
   * 4) refuse si suit différent
   * 5) valide règle fondation (A puis +1)
   * 6) commit: retire de la source
   * 7) push dans la fondation
   */
  const onDropFoundation = useCallback(
    (suit: Suit) => (e: React.DragEvent) => {
      e.preventDefault();
      const payload = parseDrag(e.dataTransfer.getData("application/json"));
      if (!payload) return;

      const moving = takeFromSource(payload);
      if (!moving || moving.length !== 1) return; // only single card

      const card = moving[0];

      // Une fondation ne prend que la suit correspondante
      if (card.suit !== suit) return;

      const top = getFoundationTop(suit);
      if (!canPlaceOnFoundation(card, top)) return;

      // commit move
      commitRemoveFromSource(payload);

      // push dans la fondation
      setFoundations((prev) => ({
        ...prev,
        [suit]: [...prev[suit], { ...card, faceUp: true }],
      }));

      incMoves();
    },
    [takeFromSource, getFoundationTop, commitRemoveFromSource, incMoves],
  );

  /**
   * wasteTop : la carte visible de la défausse (la dernière)
   * En UI tu n’affiches que celle-là.
   */
  const wasteTop = waste.length ? waste[waste.length - 1] : null;

  return (
    <div className="solitaire">
      {/* Barre du haut : titre + bouton reset + stats */}
      <div className="solitaire-topbar">
        <div className="solitaire-title">Solitaire</div>
        <div className="solitaire-actions">
          <button className="solitaire-btn" onClick={resetGame}>
            Nouvelle partie
          </button>
          <div className="solitaire-stats">
            <span>Mouvements: {moves}</span>
            {isWon && <span className="solitaire-win">🎉 Gagné !</span>}
          </div>
        </div>
      </div>

      {/* TOP ROW: Stock / Waste / Foundations */}
      <div className="solitaire-toprow">
        {/* Zone Pioche */}
        <div className="solitaire-zone">
          <div className="solitaire-zoneTitle">Pioche</div>
          <div className="solitaire-row">
            {/* Stock (pioche) : click -> drawOne */}
            <div
              className={`sol-slot ${stock.length ? "is-clickable" : ""}`}
              onClick={drawOne}
              role="button"
              aria-label="Pioche"
              title={stock.length ? "Piocher 1 carte" : "Recycler la défausse"}
            >
              {stock.length ? (
                <div className="card back" />
              ) : (
                <div className="slot-label">Vide</div>
              )}
              <div className="slot-count">{stock.length}</div>
            </div>

            {/* Waste : affiche la top carte, draggable */}
            <div className="sol-slot">
              {wasteTop ? (
                <div
                  className={`card face ${colorOfSuit(wasteTop.suit)}`}
                  draggable
                  onDragStart={onDragStartWaste}
                  title="Glisser la carte"
                >
                  <div className="card-rank">{rankLabel(wasteTop.rank)}</div>
                  <div className="card-suit">{SUIT_SYMBOL[wasteTop.suit]}</div>
                </div>
              ) : (
                <div className="slot-empty" />
              )}
            </div>
          </div>
        </div>

        {/* Zone Fondations */}
        <div className="solitaire-zone">
          <div className="solitaire-zoneTitle">Fondations</div>
          <div className="solitaire-foundations">
            {(["S", "H", "D", "C"] as Suit[]).map((suit) => {
              const top = getFoundationTop(suit);

              // Ici tu pourrais mettre un vrai “hint” : par ex highlight si la carte draggée peut aller ici.
              const canDropHint = true;

              return (
                <div
                  key={suit}
                  className={`sol-slot foundation ${canDropHint ? "" : ""}`}
                  onDragOver={allowDrop}
                  onDrop={onDropFoundation(suit)}
                  title="Déposer ici"
                >
                  {top ? (
                    <div className={`card face ${colorOfSuit(top.suit)}`}>
                      <div className="card-rank">{rankLabel(top.rank)}</div>
                      <div className="card-suit">{SUIT_SYMBOL[top.suit]}</div>
                    </div>
                  ) : (
                    <div className="slot-label">{SUIT_SYMBOL[suit]}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* TABLEAU */}
      <div className="solitaire-zone">
        <div className="solitaire-zoneTitle">Tableau</div>

        {/* Grille de 7 piles */}
        <div className="solitaire-tableau">
          {tableau.map((pile, pileIndex) => {
            const isEmpty = pile.length === 0;

            return (
              <div
                key={pileIndex}
                className={`tableau-pile ${isEmpty ? "is-empty" : ""}`}
                onDragOver={allowDrop}
                onDrop={onDropTableau(pileIndex)}
              >
                {/* slot vide visible si pile vide */}
                {isEmpty && <div className="slot-empty tableau-empty" />}

                {/* Rendu des cartes empilées */}
                {pile.map((card, cardIndex) => {
                  const isTop = cardIndex === pile.length - 1;

                  // Une carte est draggable si :
                  // - elle est faceUp
                  // - et la séquence de la pile à partir de cette carte est valide
                  const isDraggable =
                    card.faceUp && isValidTableauRun(pile, cardIndex);

                  // Décalage vertical pour simuler l’empilement
                  const offsetY = cardIndex * 22;

                  // Si faceDown : rendu du dos de carte, non draggable
                  if (!card.faceUp) {
                    return (
                      <div
                        key={card.id}
                        className="card back tableau-card"
                        style={{ top: `${8 + offsetY}px` }}
                        aria-label="Carte face cachée"
                      />
                    );
                  }

                  // Sinon faceUp : rendu face, potentiellement draggable
                  return (
                    <div
                      key={card.id}
                      className={`card face ${colorOfSuit(card.suit)} tableau-card ${
                        isTop ? "is-top" : ""
                      }`}
                      style={{ top: `${8 + offsetY}px` }}
                      draggable={isDraggable}
                      onDragStart={onDragStartTableauCard(pileIndex, cardIndex)}
                      title={isDraggable ? "Glisser" : "Séquence invalide"}
                    >
                      <div className="card-rank">{rankLabel(card.rank)}</div>
                      <div className="card-suit">{SUIT_SYMBOL[card.suit]}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Texte d’aide */}
      <div className="solitaire-footerHint">
        <span>
          Règles: alternance de couleurs sur le tableau, suite décroissante.
          Fondation: même couleur, suite croissante depuis As. Pioche: 1 carte.
        </span>
      </div>
    </div>
  );
}

/**
 * ✅ NOTE IMPORTANTE POUR TON “REFEELING” DU JEU
 *
 * 1) Le gros bug/oddity que tu vas vouloir corriger en refaisant :
 *    -> l'initialisation : newGameState() est appelé 4 fois au montage.
 *    Solution simple :
 *
 *    const [game, setGame] = useState(() => newGameState());
 *    puis tu fais :
 *    const { stock, waste, tableau, foundations } = game;
 *
 *    Et tu update setGame(...) en immutable.
 *
 * 2) Drag HTML5 : pratique, mais pas “main réelle”.
 *    Pour ton effet “je prends la carte”, passe à pointer events + overlay (drag custom).
 *
 * 3) Pas de double-clic auto-move :
 *    Beaucoup de solitaires permettent double-click pour envoyer en fondation.
 *    Tu peux ajouter ça plus tard (c’est très simple).
 */
