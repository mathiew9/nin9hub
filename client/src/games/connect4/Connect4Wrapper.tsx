import { useState } from "react";

import "./Connect4Wrapper.css";

import Connect4Menu from "./Connect4Menu";
import Connect4 from "./Connect4";
export default function Connect4Wrapper() {
  const [mode, setMode] = useState<"ai" | "friend" | null>(null);

  return (
    <div className="connect4Wrapper">
      <div>
        {mode === null ? (
          <Connect4Menu onSelectMode={setMode} />
        ) : (
          <Connect4 mode={mode} setMode={setMode} />
        )}
      </div>
    </div>
  );
}
