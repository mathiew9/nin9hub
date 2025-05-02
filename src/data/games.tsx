import type { JSX } from "react";
import TicTacToeWrapper from "../games/tictactoe/TicTacToeWrapper";
import Chess from "../games/chess/Chess";
import Connect4Wrapper from "../games/connect4/Connect4Wrapper";
import MinesweeperWrapper from "../games/minesweeper/MinesweeperWrapper";
import Snake from "../games/snake/Snake";

export interface GameInfo {
  id: string;
  name: string;
  component: JSX.Element;
  available: boolean;
}

export const games: GameInfo[] = [
  {
    id: "tictactoe",
    name: "Tic-Tac-Toe",
    component: <TicTacToeWrapper />,
    available: true,
  },
  {
    id: "snake",
    name: "Snake",
    component: <Snake />,
    available: true,
  },
  {
    id: "connect4",
    name: "Connect 4",
    component: <Connect4Wrapper />,
    available: true,
  },
  {
    id: "chess",
    name: "Chess",
    component: <Chess />,
    available: false,
  },
  {
    id: "ultimatetictactoe",
    name: "Ultimate Tic-Tac-Toe",
    component: <div>Ultimate Tic-Tac-Toe</div>,
    available: false,
  },
  {
    id: "hangman",
    name: "Hangman",
    component: <div>Hangman</div>,
    available: false,
  },
  {
    id: "minesweeper",
    name: "Minesweeper",
    component: <MinesweeperWrapper />,
    available: false,
  },
  {
    id: "2048",
    name: "2048",
    component: <div>2048</div>,
    available: false,
  },
  {
    id: "solitaire",
    name: "Solitaire",
    component: <div>Solitaire</div>,
    available: false,
  },
  {
    id: "sudoku",
    name: "Sudoku",
    component: <div>Sudoku</div>,
    available: false,
  },
  {
    id: "pacxon",
    name: "Pac Xon",
    component: <div>Pac Xon</div>,
    available: false,
  },
];
