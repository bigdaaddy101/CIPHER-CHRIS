import { useEffect, useState } from "react";
import { TitleScreen } from "./components/TitleScreen";
import { GameScreen } from "./components/GameScreen";
import { InfoOnly } from "./components/InfoOnly";
import { sfx } from "./game/sound";

type Mode = "title" | "game" | "info";

export default function App() {
  const [mode, setMode] = useState<Mode>("title");
  const [started, setStarted] = useState(false);

  const startGame = () => {
    sfx.init();
    setStarted(true);
    setMode("game");
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [mode]);

  return (
    <div className="bg-void">
      {/* game stays mounted after first start so progress survives info-mode detours */}
      {started && (
        <div style={{ display: mode === "game" ? "block" : "none" }}>
          <GameScreen active={mode === "game"} onInfoOnly={() => setMode("info")} />
        </div>
      )}
      {mode === "title" && <TitleScreen onStart={startGame} onInfo={() => setMode("info")} />}
      {mode === "info" && <InfoOnly onPlay={startGame} />}
    </div>
  );
}
