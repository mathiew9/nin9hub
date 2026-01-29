import { useState } from "react";

import Connect4 from "./Connect4";
import Connect4Menu from "./Connect4Menu";

import "./Connect4Wrapper.css";

export default function Connect4Wrapper() {
  const [mode, setMode] = useState<"ai" | "friend" | "online" | null>(null);

  return (
    <div className="connect4Wrapper">
      {mode === null ? (
        <Connect4Menu onSelectMode={setMode} />
      ) : (
        <Connect4 mode={mode} setMode={setMode} />
      )}
    </div>
  );
}
