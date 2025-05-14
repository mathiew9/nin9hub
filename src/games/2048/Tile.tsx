import { useEffect, useRef, useState } from "react";
import { TileMeta } from "./reducer";

type Props = {
  tile: TileMeta;
};

function usePrevProps<K = any>(value: K): K | undefined {
  const ref = useRef<K | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export default function Tile({ tile }: Props) {
  const [scale, setScale] = useState(1);

  const tileSize = 80;
  const gap = 10;
  const padding = 10;

  const style = {
    top: padding + tile.position[1] * (tileSize + gap),
    left: padding + tile.position[0] * (tileSize + gap),
    width: tileSize,
    height: tileSize,
    transform: `scale(${scale})`,
    transition: "top 100ms ease, left 100ms ease, transform 100ms ease",
    position: "absolute" as const,
  };

  const prevValue = usePrevProps<number>(tile.value);

  useEffect(() => {
    const isFirst = prevValue === undefined;
    const changed = prevValue !== undefined && prevValue !== tile.value;

    if (isFirst || changed) {
      setScale(1.1);
      const timeout = setTimeout(() => setScale(1), 100);
      return () => clearTimeout(timeout);
    }
  }, [tile.value]);

  return (
    <div className={`tile tile-${tile.value}`} style={style}>
      {tile.value}
    </div>
  );
}
