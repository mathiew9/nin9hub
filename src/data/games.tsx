import type { JSX } from "react";
import TicTacToeWrapper from "../games/tictactoe/TicTacToeWrapper";
import Chess from "../games/chess/Chess";
import Connect4Wrapper from "../games/connect4/Connect4Wrapper";
import MinesweeperWrapper from "../games/minesweeper/MinesweeperWrapper";
import Snake from "../games/snake/Snake";
import _2048 from "../games/2048/2048";
import Hangman from "../games/hangman/HangmanWrapper";

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
    id: "minesweeper",
    name: "Minesweeper",
    component: <MinesweeperWrapper />,
    available: true,
  },
  {
    id: "2048",
    name: "2048",
    component: <_2048 />,
    available: true,
  },
  {
    id: "hangman",
    name: "Hangman",
    component: <Hangman />,
    available: true,
  },
  {
    id: "sudoku",
    name: "Sudoku",
    component: <div>Sudoku</div>,
    available: false,
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
    id: "solitaire",
    name: "Solitaire",
    component: <div>Solitaire</div>,
    available: false,
  },
  {
    id: "pacxon",
    name: "Pac Xon",
    component: <div>Pac Xon</div>,
    available: false,
  },
];
