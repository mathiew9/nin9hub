import { useEffect, useState, useRef } from "react";
import "./Snake.css";

type Position = {
  x: number;
  y: number;
};

const BOARD_SIZE = 20;

function getRandomPosition(exclude: Position[]): Position {
  let position: Position;
  do {
    position = {
      x: Math.floor(Math.random() * BOARD_SIZE),
      y: Math.floor(Math.random() * BOARD_SIZE),
    };
  } while (exclude.some((p) => p.x === position.x && p.y === position.y));
  return position;
}

export default function Snake() {
  const [snake, setSnake] = useState<Position[]>([{ x: 5, y: 5 }]);
  const [food, setFood] = useState<Position>(
    getRandomPosition([{ x: 5, y: 5 }])
  );
  const [direction, setDirection] = useState<
    "UP" | "DOWN" | "LEFT" | "RIGHT" | null
  >(null);
  const pendingDirection = useRef<"UP" | "DOWN" | "LEFT" | "RIGHT" | null>(
    null
  );
  const [isGameOver, setIsGameOver] = useState(false);
  const gameInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Gestion clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return;

      const current = direction;

      if (e.key === "ArrowUp" && current !== "DOWN") {
        pendingDirection.current = "UP";
        if (!current) setDirection("UP");
      }
      if (e.key === "ArrowDown" && current !== "UP") {
        pendingDirection.current = "DOWN";
        if (!current) setDirection("DOWN");
      }
      if (e.key === "ArrowLeft" && current !== "RIGHT") {
        pendingDirection.current = "LEFT";
        if (!current) setDirection("LEFT");
      }
      if (e.key === "ArrowRight" && current !== "LEFT") {
        pendingDirection.current = "RIGHT";
        if (!current) setDirection("RIGHT");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [direction, isGameOver]);

  // Mouvement + gestion des collisions
  useEffect(() => {
    if (!direction || isGameOver) return; // ← ← ← ON GÈRE LE CAS initial ici !

    gameInterval.current = setInterval(() => {
      setSnake((prevSnake) => {
        if (
          pendingDirection.current &&
          direction !== pendingDirection.current
        ) {
          setDirection(pendingDirection.current);
        }

        const dir = pendingDirection.current || direction;
        if (!dir) return prevSnake;

        const head = prevSnake[0];
        let newHead = { ...head };

        if (dir === "UP") newHead.y -= 1;
        if (dir === "DOWN") newHead.y += 1;
        if (dir === "LEFT") newHead.x -= 1;
        if (dir === "RIGHT") newHead.x += 1;

        // Collision mur
        if (
          newHead.x < 0 ||
          newHead.x >= BOARD_SIZE ||
          newHead.y < 0 ||
          newHead.y >= BOARD_SIZE
        ) {
          endGame();
          return prevSnake;
        }

        // Collision avec le corps
        if (
          prevSnake.some(
            (segment) => segment.x === newHead.x && segment.y === newHead.y
          )
        ) {
          endGame();
          return prevSnake;
        }

        const hasEaten = newHead.x === food.x && newHead.y === food.y;

        const newSnake = hasEaten
          ? [newHead, ...prevSnake]
          : [newHead, ...prevSnake.slice(0, -1)];

        if (hasEaten) {
          setFood(getRandomPosition(newSnake));
        }

        return newSnake;
      });
    }, 200);

    return () => {
      if (gameInterval.current) clearInterval(gameInterval.current);
    };
  }, [direction, food, isGameOver]);

  // Fin du jeu
  const endGame = () => {
    setIsGameOver(true);
    if (gameInterval.current) clearInterval(gameInterval.current);
  };

  // Restart
  const restartGame = () => {
    setSnake([{ x: 5, y: 5 }]);
    setFood(getRandomPosition([{ x: 5, y: 5 }]));
    setDirection(null);
    setIsGameOver(false);
  };

  return (
    <div className="snake">
      <div className="top-bar">
        <span>Score : {snake.length - 1}</span>
        <button onClick={restartGame}>🔄 Rejouer</button>
      </div>
      <div className="board">
        {Array.from({ length: BOARD_SIZE }).map((_, y) => (
          <div className="row" key={y}>
            {Array.from({ length: BOARD_SIZE }).map((_, x) => {
              const head = snake[0];
              const isHead = head.x === x && head.y === y;
              const isSnake = snake.some(
                (segment) => segment.x === x && segment.y === y
              );
              const isFood = food.x === x && food.y === y;
              return (
                <div
                  key={`${x}-${y}`}
                  className={`cell ${isSnake ? "snakeCell" : ""} ${
                    isHead ? "snakeHead" : ""
                  } ${isFood ? "food" : ""}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      {isGameOver && (
        <div className="snakeEndGame">
          <p>💀 Game Over !</p>
          <button onClick={restartGame}>Rejouer</button>
        </div>
      )}
    </div>
  );
}
