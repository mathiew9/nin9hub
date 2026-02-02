import React, { createContext, useContext } from "react";
import { useConnect4Online } from "../hooks/useConnect4Online";

type Ctx = ReturnType<typeof useConnect4Online>;
const OnlineCtx = createContext<Ctx | null>(null);

export const Connect4OnlineProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const value = useConnect4Online();
  return <OnlineCtx.Provider value={value}>{children}</OnlineCtx.Provider>;
};

export function useOnline() {
  const ctx = useContext(OnlineCtx);
  if (!ctx)
    throw new Error("useOnline must be used inside <Connect4OnlineProvider>");
  return ctx;
}
