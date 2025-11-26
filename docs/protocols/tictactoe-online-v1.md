# TicTacToe Online — Protocole v1

## 0) Version & portée

- **Nom** : TicTacToe Online – Protocole v1
- **Portée** : parties en ligne 1v1 (rooms éphémères), rematch.
- **Transport** : Socket.IO (WebSocket fallback autorisé).
- **Préfixe d’événements applicatifs** : `online:*`
- **Compat** : toute rupture majeure créera `online.v2:*` ou ajoutera `protocolVersion` dans l’état.

---

## 1) Enveloppe d’ACK pour les commandes (client → serveur)

**Ce qu’on fait** : toutes les **commandes** reçoivent une réponse synchrone via ACK.  
**Pourquoi** : UX claire, logique client simple, erreurs normalisées.  
**À quoi ça sert** : le client branche sa logique sur `code` (stable) et affiche `message` (localisable).

**Succès**

```json
{
  "ok": true,
  "data": {
    /* données utiles */
  }
}
```

**Erreur**

```json
{ "ok": false, "code": "ROOM_NOT_FOUND", "message": "La room est invalide." }
```

---

## 2) Modèle d’état unique (serveur → clients)

**Événement** : `online:state` (toujours broadcast à la room après une action **validée**)

**Ce qu’on fait** : le serveur diffuse **l’état complet** de la partie.  
**Pourquoi** : éviter des dizaines de mini-événements, UI prévisible.  
**À quoi ça sert** : le client **rend** l’état ; pas de logique de jeu côté client.

**Payload exemple**

```json
{
  "roomId": "ABC12",
  "board": [null, "X", null, "O", "X", null, null, null, null],
  "turn": "O",
  "started": true,
  "winner": null, // "X" | "O" | "draw" | null
  "playersCount": 2, // 1 ou 2
  "stateVersion": 7 // +1 à chaque mutation validée
}
```

> Reco client : ignorer un `online:state` plus ancien que la dernière `stateVersion` reçue.

---

## 3) Commandes (client → serveur)

### 3.1 `online:createRoom` `{}`

**Ce qu’on fait** : créer une room et y joindre l’hôte en **X**.  
**Pourquoi** : initialiser un espace isolé partageable (par code).  
**À quoi ça sert** : afficher immédiatement le code, passer en `waiting(1)`.

**ACK succès**

```json
{ "ok": true, "data": { "roomId": "ABC12", "role": "X" } }
```

**Side-effect (serveur → room)**

```json
// online:waiting
{ "players": 1 }
```

---

### 3.2 `online:joinRoom` `{ "roomId": "ABC12" }`

**Ce qu’on fait** : rejoindre une room existante en **O**.  
**Pourquoi** : compléter la room pour démarrer.  
**À quoi ça sert** : valider le code, afficher `waiting(2)`.

**ACK succès**

```json
{ "ok": true, "data": { "role": "O", "players": 2 } }
```

**ACK erreurs** : `ROOM_NOT_FOUND`, `ROOM_FULL`, `ALREADY_HOST`.

**Side-effect**

```json
// online:waiting
{ "players": 2 }
```

---

### 3.3 `online:start` `{}` _(réservé à l’hôte)_

**Ce qu’on fait** : lancer la partie quand `players=2`.  
**Pourquoi** : contrôle par l’hôte, synchro propre du début.  
**À quoi ça sert** : réinitialiser board/turn et afficher le plateau.

**ACK succès**

```json
{ "ok": true, "data": {} }
```

**ACK erreurs** : `ONLY_HOST`, `NEED_2_PLAYERS`, `NOT_IN_ROOM`.

**Side-effect**

```json
// online:state
{
  "roomId": "ABC12",
  "board": [null, null, null, null, null, null, null, null, null],
  "turn": "X",
  "started": true,
  "winner": null,
  "playersCount": 2,
  "stateVersion": 1
}
```

---

### 3.4 `online:playTurn` `{ "index": 0 }`

**Ce qu’on fait** : proposer un coup au serveur.  
**Pourquoi** : serveur autoritaire = anti-triche.  
**À quoi ça sert** : refuser hors tour/case prise, calculer fin.

**ACK succès**

```json
{ "ok": true, "data": {} }
```

**ACK erreurs** : `GAME_NOT_STARTED`, `NOT_YOUR_TURN`, `CELL_TAKEN`, `OUT_OF_RANGE`, `NOT_IN_ROOM`.

**Side-effect** : broadcast `online:state` avec `board`, `turn` mis à jour et `winner` si fin.

---

### 3.5 `online:rematch:request` `{}`

**Ce qu’on fait** : voter pour rejouer (double consentement).  
**Pourquoi** : éviter qu’un joueur force l’autre.  
**À quoi ça sert** : UI “1/2 a demandé, en attente…”, reset quand 2/2.

**ACK succès**

```json
{ "ok": true, "data": { "votes": 1 } } // ou 2
```

**Side-effects**

```json
// online:rematch:status
{ "votes": 1 }

// Quand votes === 2 → reset interne puis online:state
{
  "roomId": "ABC12",
  "board": [null,null,null,null,null,null,null,null,null],
  "turn": "X",
  "started": true,
  "winner": null,
  "playersCount": 2,
  "stateVersion": 42
}
```

---

### 3.6 `online:leave` `{}` _(facultatif : sinon détection auto par disconnect)_

**Ce qu’on fait** : quitter proprement la room.  
**Pourquoi** : UX propre pour l’adversaire.  
**À quoi ça sert** : prévenir l’autre, repasser en attente.

**ACK succès**

```json
{ "ok": true, "data": {} }
```

**Side-effects**

```json
// online:opponent:left
{}

// online:waiting
{ "players": 1 }
```

---

## 4) Événements (serveur → clients)

### 4.1 `online:waiting` `{ "players": 1 | 2 }`

**Ce qu’on fait** : informer du nombre de joueurs connectés.  
**Pourquoi** : piloter l’affichage du bouton “Commencer”.  
**À quoi ça sert** : `players=1` → attente ; `players=2` → prêt.

---

### 4.2 `online:state` `{ ... }`

**Ce qu’on fait** : pousser l’état **source de vérité**.  
**Pourquoi** : synchroniser tous les clients.  
**À quoi ça sert** : rendre le plateau, activer/désactiver le clic (`canPlay = started && !winner && role===turn`).

---

### 4.3 `online:opponent:left` `{}`

**Ce qu’on fait** : notifier que l’adversaire est parti.  
**Pourquoi** : éviter une UI bloquée.  
**À quoi ça sert** : afficher un message clair, repasser en `waiting(1)`, masquer “Commencer”.

---

### 4.4 `online:rematch:status` `{ "votes": 1 | 2 }`

**Ce qu’on fait** : informer du nombre de votes rematch.  
**Pourquoi** : transparence et feedback.  
**À quoi ça sert** : “En attente de l’autre joueur…”, puis reset quand `2`.

---

### 4.5 _(Optionnel)_ `online:error` `{ "code": string, "message": string }`

**Ce qu’on fait** : signaler une erreur **asynchrone** non liée à une commande.  
**Pourquoi** : couvrir les cas rares (ex. room invalidée par un timeout).  
**À quoi ça sert** : afficher un toast générique.

---

## 5) Dictionnaire d’erreurs (codes **stables**)

> Le `message` peut varier par langue. **Ne pas** changer les `code` en v1.

```
ROOM_NOT_FOUND, ROOM_FULL, ALREADY_HOST,
NOT_IN_ROOM, ONLY_HOST, NEED_2_PLAYERS,
GAME_NOT_STARTED, NOT_YOUR_TURN, CELL_TAKEN, OUT_OF_RANGE
```

**Exemples de messages UX (FR)**

- `ROOM_NOT_FOUND` → “Code invalide. Vérifie le code et réessaie.”
- `ROOM_FULL` → “La room est déjà pleine.”
- `ALREADY_HOST` → “Tu es déjà l’hôte de cette room.”
- `NOT_IN_ROOM` → “Action impossible : tu n’es pas dans une room.”
- `ONLY_HOST` → “Seul l’hôte peut démarrer la partie.”
- `NEED_2_PLAYERS` → “Il faut deux joueurs pour démarrer.”
- `GAME_NOT_STARTED` → “La partie n’a pas encore commencé.”
- `NOT_YOUR_TURN` → “Ce n’est pas ton tour.”
- `CELL_TAKEN` → “Cette case est déjà prise.”
- `OUT_OF_RANGE` → “Index de case invalide.”

---

## 6) Règles serveur (autoritaire)

- **X commence toujours**.
- Index de coup **0..8**, **case libre** uniquement.
- Rejeter `playTurn` si `started=false`.
- À la déconnexion d’un joueur :
  - émettre `online:opponent:left`,
  - repasser `playersCount=1`,
  - bloquer `start` tant que `players<2`.
- Rematch : reset complet (`board`, `turn="X"`, `winner=null`, `started=true`) quand **2/2** joueurs ont demandé.
- Incrémenter `stateVersion` à **chaque** mutation validée.

---

## 7) Séquences typiques

**Créer → Rejoindre → Start**

1. A : `online:createRoom` → ACK ok `{ roomId, role:"X" }` → `online:waiting{1}`
2. B : `online:joinRoom{roomId}` → ACK ok `{ role:"O", players:2 }` → `online:waiting{2}`
3. A (hôte) : `online:start` → ACK ok → `online:state{ started:true, turn:"X" }`

**Tour de jeu**

- X : `online:playTurn{index}` → ACK ok → `online:state` (tour O)
- O : idem → `online:state` … jusqu’à victoire ou égalité.

**Rematch**

- X : `online:rematch:request` → ACK `{votes:1}` → `online:rematch:status{1}`
- O : `online:rematch:request` → ACK `{votes:2}` → `online:state` (nouvelle partie)

**Déconnexion**

- Un joueur se déconnecte → l’autre reçoit `online:opponent:left` + `online:waiting{1}`.

---

## 8) Tests manuels (check-list)

- O essaie de jouer le 1er coup → **ACK** `NOT_YOUR_TURN`.
- Jouer 2 fois de suite → **ACK** `NOT_YOUR_TURN`.
- Jouer sur case occupée → **ACK** `CELL_TAKEN`.
- `joinRoom` avec mauvais code → **ACK** `ROOM_NOT_FOUND`.
- `start` sans invité → **ACK** `NEED_2_PLAYERS`.
- Déconnexion invité → hôte reçoit `online:opponent:left` + `online:waiting{1}`.
- Rematch : 1 vote → `rematch:status(1)` ; 2 votes → `online:state(reset)`.

---

## 9) Conventions & glossaire

- **Namespacing** : `domaine:action` (ici `online:*`). Lisible et extensible (ex. `connect4:*` plus tard).
- **Room** : groupe logique dans Socket.IO (broadcast ciblé).
- **Namespace Socket.IO** (optionnel) : canal technique (ex. `/tictactoe`).
- **Serveur autoritaire** : le serveur décide (tour, board, fin), le client **affiche**.

---

## 10) Notes d’implémentation (serveur)

- Stockage en mémoire par room :
  ```txt
  { id, hostId, guestId?, players{X,O}, board[9], turn, started, winner, rematchVotes:Set, createdAt }
  ```
- Toujours **ACK** une commande (même en erreur).
- Valider les payloads (index 0..8) ; protéger contre le spam (rate-limit par socket).
- Nettoyer les rooms inactives (timeout) pour éviter les leaks.

---

_Fin v1_
