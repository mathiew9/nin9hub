# 🕹️ Ninehub — v1.0.1

**Ninehub** est une application web de mini-jeux en ligne développée avec React, TypeScript et Vite.  
Elle a pour objectif d'aider son créateur à **garder un bon niveau en développement frontend**, tout en continuant à progresser en compétence.

Le projet propose une sélection de **jeux simples, amusants et accessibles**, jouables directement depuis un navigateur.

> 🔗 Accès en ligne : [https://nin9hub.vercel.app](https://nin9hub.vercel.app)

---

## Fonctionnalités

- 7 jeux disponibles directement dans le navigateur (et d'autres à venir)
- Mode **daily** pour certains jeux (grille unique chaque jour)
- Interface multilingue (FR / EN) avec `react-i18next`
- Déploiement du frontend via [Vercel](https://vercel.com/)
- **Mode multijoueur (Socket.IO)** en cours d’implémentation :
  - Déjà disponible pour le jeu du **morpion (Tic Tac Toe)**
  - Sera étendu progressivement à d’autres jeux compatibles
- Architecture client / serveur séparée, avec backend déployé sur [Render](https://render.com/)

---

## Stack technique

### Frontend

- [React 19](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [react-router-dom](https://reactrouter.com/)
- [react-i18next](https://react.i18next.com/)
- Hébergement : [Vercel](https://vercel.com/)

### Backend (multijoueur)

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Socket.IO](https://socket.io/)
- Hébergement : [Render](https://render.com/)

---

## Statut

Ce projet est en cours de développement actif.  
Il est conçu comme un **bac à sable évolutif**, pour tester des mécaniques de jeu (solo ou multijoueur), des interfaces et des patterns de code frontend/backend.

Le système multijoueur a été mis en place avec succès sur un premier jeu (le morpion), et sera progressivement adapté à d'autres jeux du hub.

---

## Objectif personnel

Ninehub est avant tout un **projet personnel d'entraînement**.  
Chaque jeu ou fonctionnalité est l’occasion :

- d'explorer des techniques frontend modernes
- de renforcer mes compétences en TypeScript
- d’implémenter des logiques réseau temps réel via Socket.IO
- de manipuler des algorithmes simples de manière interactive

---

## Licence

Projet personnel — usage libre non commercial autorisé.
