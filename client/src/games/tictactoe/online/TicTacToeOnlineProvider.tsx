import React, { createContext, useContext } from "react";
import { useTicTacToeOnline } from "../hooks/useTicTacToeOnline";

type Ctx = ReturnType<typeof useTicTacToeOnline>;
const OnlineCtx = createContext<Ctx | null>(null);

export const TicTacToeOnlineProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const value = useTicTacToeOnline(); // un seul hook centralisé
  return <OnlineCtx.Provider value={value}>{children}</OnlineCtx.Provider>;
};

export function useOnline() {
  const ctx = useContext(OnlineCtx);
  if (!ctx)
    throw new Error("useOnline must be used inside <TicTacToeOnlineProvider>");
  return ctx;
}
