import { useEffect, useRef } from "react";
import { Play, Zap, MousePointerClick, Backpack, Trophy, Award, Sun, Moon, Sunrise, Sunset } from "lucide-react";
import { VW, VH } from "../game/types";
import { ROOMS } from "../game/rooms";
import { usePhTime, cycleTimeMode } from "../game/phTime";
import { sfx } from "../game/sound";
import { PixelSprite } from "./PixelSprite";

function RooftopBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext("2d");
    if (!g) return;
    g.imageSmoothingEnabled = false;
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const t = (now - start) / 1000;
      ROOMS.rooftop.dynamics?.(g, t, {});
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} width={VW} height={VH} className="pixelated absolute inset-0 w-full h-full object-cover opacity-80" aria-hidden />;
}

export function TitleScreen({ onStart, onInfo }: { onStart: () => void; onInfo: () => void }) {
  const pht = usePhTime();

  const start = () => {
    sfx.init();
    sfx.fanfare();
    onStart();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); start(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-dvh relative overflow-hidden bg-void flex flex-col">
      <RooftopBackdrop />
      <div className="absolute inset-0 bg-gradient-to-b from-void/55 via-void/30 to-void/95" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 py-10">
        {/* Live Philippine Time & Sky pill */}
        <button
          onClick={() => { sfx.init(); sfx.uiClick(); cycleTimeMode(); }}
          className="pix-panel px-3.5 py-1.5 mb-4 inline-flex items-center gap-2 font-term text-lg sm:text-xl text-amber-neon hover:border-amber-neon cursor-pointer"
          title="Synced live to Philippine Standard Time (Asia/Manila) — click to preview Dawn, Day, Sunset & Night!"
        >
          {pht.phase === "day" && <Sun size={15} className="text-amber-neon" />}
          {pht.phase === "dawn" && <Sunrise size={15} className="text-pink-neon" />}
          {pht.phase === "dusk" && <Sunset size={15} className="text-amber-neon" />}
          {pht.phase === "night" && <Moon size={15} className="text-cyan-neon" />}
          <span>PHILIPPINES · {pht.hh12}<span className="pix-blink">:</span>{pht.mm} {pht.ampm} PHT</span>
          <span className="font-pixel text-[7px] bg-violet-neon/25 text-cyan-neon px-1.5 py-0.5 border border-cyan-neon/40">
            {pht.isLive ? `LIVE · ${pht.phaseLabel}` : `PREVIEW · ${pht.phaseLabel}`}
          </span>
        </button>

        <p className="font-pixel text-[8px] sm:text-[10px] text-cyan-neon tracking-widest" style={{ textShadow: "2px 2px 0 #000" }}>
          CIPHER CHRIS INTERACTIVE PRESENTS
        </p>

        <h1 className="neon-sign text-[28px] sm:text-5xl md:text-6xl mt-5 leading-none whitespace-nowrap">cipher chris</h1>
        <p className="font-pixel text-[9px] sm:text-xs text-bone mt-5 leading-relaxed" style={{ textShadow: "2px 2px 0 #000" }}>
          A POINT &amp; CLICK PORTFOLIO ADVENTURE
        </p>
        <p className="font-term text-xl sm:text-2xl text-bone/90 mt-2 max-w-[580px] leading-tight" style={{ textShadow: "2px 2px 0 #000" }}>
          Step inside Cipher Chris's house — synced live to <span className="text-amber-neon">Philippine time ({pht.formatted})</span>.
          Find the USB. Bribe the cat. Ship the secret project.
        </p>

        <div className="flex items-end gap-6 mt-7">
          <div className="floaty"><PixelSprite name="charIdle" scale={3} /></div>
          <div className="mb-1"><PixelSprite name="catSit" scale={3} /></div>
          <div className="mb-2 hidden sm:block"><PixelSprite name="duck" scale={3} /></div>
        </div>

        <button
          onClick={start}
          className="pix-btn pix-btn-green mt-8 px-8 py-4 text-xs sm:text-sm flex items-center gap-3"
        >
          <Play size={16} /> <span className="pix-blink">PRESS START</span>
        </button>
        <p className="font-term text-dim text-lg mt-2" style={{ textShadow: "1px 1px 0 #000" }}>
          sound on for full chiptune glory ♪ · click clock above to test Day / Sunset / Night
        </p>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-7 font-term text-lg text-bone/85" style={{ textShadow: "2px 2px 0 #000" }}>
          <span className="flex items-center gap-1.5"><MousePointerClick size={15} className="text-cyan-neon" /> click to walk &amp; explore</span>
          <span className="flex items-center gap-1.5"><Backpack size={15} className="text-amber-neon" /> collect &amp; combine STUFF</span>
          <span className="flex items-center gap-1.5"><Trophy size={15} className="text-pink-neon" /> score 100 pts of secrets</span>
          <span className="flex items-center gap-1.5"><Zap size={15} className="text-green-neon" /> live PH day &amp; night sky</span>
        </div>

        <button onClick={onInfo} className="mt-7 font-term text-xl text-bone/80 hover:text-cyan-neon underline decoration-dotted underline-offset-4" style={{ textShadow: "1px 1px 0 #000" }}>
          in a hurry? skip the game — info only →
        </button>
      </div>

      <footer className="relative z-10 pb-5 px-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-term text-lg text-dim" style={{ textShadow: "1px 1px 0 #000" }}>
        <span>© 1994–2026 CIPHER CHRIS</span>
        <span className="hidden sm:inline">·</span>
        <span>SYNCED TO ASIA/MANILA ({pht.formatted})</span>
        <span className="hidden sm:inline">·</span>
        <a href="https://www.awwwards.com" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-amber-neon">
          <Award size={15} /> AWWWARDS
        </a>
      </footer>

      {/* CRT vibe */}
      <div className="crt absolute inset-0 pointer-events-none" />
    </div>
  );
}
