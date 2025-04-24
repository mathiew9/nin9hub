import type { JSX } from "react";
import TicTacToeWrapper from "../games/tictactoe/TicTacToeWrapper";
import Chess from "../games/chess/Chess";
import Connect4 from "../games/connect4/Connect4";
import MinesweeperWrapper from "../games/minesweeper/MinesweeperWrapper";
import Snake from "../games/snake/Snake";

export interface GameInfo {
  id: string;
  name: string;
  component: JSX.Element;
}

export const games: GameInfo[] = [
  {
    id: "tictactoe",
    name: "Tic-Tac-Toe",
    component: <TicTacToeWrapper />,
  },
  {
    id: "chess",
    name: "Chess",
    component: <Chess />,
  },
  {
    id: "snake",
    name: "Snake",
    component: <Snake />,
  },
  {
    id: "ultimatetictactoe",
    name: "Ultimate Tic-Tac-Toe",
    component: <div>Ultimate Tic-Tac-Toe</div>,
  },
  {
    id: "connect4",
    name: "Connect 4",
    component: <Connect4 />,
  },
  {
    id: "hangman",
    name: "Hangman",
    component: <div>Hangman</div>,
  },
  {
    id: "minesweeper",
    name: "Minesweeper",
    component: <MinesweeperWrapper />,
  },
  {
    id: "2048",
    name: "2048",
    component: <div>2048</div>,
  },
  {
    id: "solitaire",
    name: "Solitaire",
    component: <div>Solitaire</div>,
  },
  {
    id: "sudoku",
    name: "Sudoku",
    component: <div>Sudoku</div>,
  },
];
