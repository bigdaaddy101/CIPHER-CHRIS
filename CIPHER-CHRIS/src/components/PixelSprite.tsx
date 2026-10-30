import { useEffect, useRef } from "react";
import { getSprite, spriteSize } from "../game/sprites";

/** Renders one of the game's pixel sprites into the DOM at an integer scale. */
export function PixelSprite({
  name,
  scale = 3,
  className = "",
}: {
  name: string;
  scale?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const src = getSprite(name);
    cv.width = src.width;
    cv.height = src.height;
    const g = cv.getContext("2d");
    if (!g) return;
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(src, 0, 0);
  }, [name]);
  const { w, h } = spriteSize(name);
  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width: w * scale, height: h * scale, imageRendering: "pixelated" }}
      aria-hidden
    />
  );
}
