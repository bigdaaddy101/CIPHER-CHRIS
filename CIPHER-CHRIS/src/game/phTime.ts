/* Real-time Philippine Standard Time (Asia/Manila, UTC+8 / PHT) day & night engine,
   with optional preview override so visitors can either experience live Philippine
   sky & clocks OR test Dawn / Day / Sunset / 03:47 AM Night anytime. */

import { useEffect, useState } from "react";

export type TimePhase = "dawn" | "day" | "dusk" | "night";
export type TimeMode = "live" | TimePhase;

export interface PhTimeInfo {
  mode: TimeMode;
  isLive: boolean;
  phase: TimePhase;
  phaseLabel: string;
  hour24: number;
  minute: number;
  second: number;
  hh12: string;
  mm: string;
  ampm: "AM" | "PM";
  /** compact string for tiny appliance displays like "3:47" or "12:05" */
  shortTime: string;
  /** full display string like "02:35 PM PHT" */
  formatted: string;
  /** 0..1 progress across sun arc (05:30->18:30) or moon arc (18:30->05:30) */
  skyProgress: number;
}

const PRESET_TIMES: Record<TimePhase, { hour24: number; minute: number }> = {
  dawn: { hour24: 5, minute: 45 },
  day: { hour24: 13, minute: 15 },
  dusk: { hour24: 17, minute: 50 },
  night: { hour24: 3, minute: 47 },
};

const PHASE_LABELS: Record<TimePhase, string> = {
  dawn: "PH DAWN",
  day: "PH DAY",
  dusk: "PH SUNSET",
  night: "PH NIGHT",
};

const MODE_ORDER: TimeMode[] = ["live", "dawn", "day", "dusk", "night"];

let currentMode: TimeMode = "live";
const listeners = new Set<() => void>();

export function getTimeMode(): TimeMode {
  return currentMode;
}

export function setTimeMode(mode: TimeMode) {
  currentMode = mode;
  listeners.forEach((fn) => fn());
}

export function cycleTimeMode(): TimeMode {
  const next = MODE_ORDER[(MODE_ORDER.indexOf(currentMode) + 1) % MODE_ORDER.length];
  setTimeMode(next);
  return next;
}

export function subscribeTimeMode(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function usePhTime(): PhTimeInfo {
  const [info, setInfo] = useState<PhTimeInfo>(() => getPhTime());
  useEffect(() => {
    const sync = () => setInfo(getPhTime());
    const unsub = subscribeTimeMode(sync);
    const iv = window.setInterval(sync, 1000);
    return () => {
      unsub();
      window.clearInterval(iv);
    };
  }, []);
  return info;
}

function readRealManilaClock(now = new Date()): { hour24: number; minute: number; second: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? NaN);
    const h = get("hour");
    const m = get("minute");
    const s = get("second");
    if (!Number.isNaN(h) && !Number.isNaN(m) && !Number.isNaN(s)) {
      return { hour24: h % 24, minute: m, second: s };
    }
  } catch {
    // Fallback to exact UTC+8 offset (Philippines never observes DST)
  }
  const phMs = now.getTime() + 8 * 3600_000;
  const d = new Date(phMs);
  return {
    hour24: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
  };
}

export function phaseFromClock(hour24: number, minute: number): TimePhase {
  const mins = hour24 * 60 + minute;
  if (mins >= 300 && mins < 420) return "dawn"; // 05:00 AM – 06:59 AM PHT
  if (mins >= 420 && mins < 1020) return "day"; // 07:00 AM – 04:59 PM PHT
  if (mins >= 1020 && mins < 1125) return "dusk"; // 05:00 PM – 06:44 PM PHT (Manila Bay sunset!)
  return "night"; // 06:45 PM – 04:59 AM PHT
}

export function getPhTime(now = new Date()): PhTimeInfo {
  const mode = currentMode;
  const liveClock = readRealManilaClock(now);
  const isLive = mode === "live";
  const hour24 = isLive ? liveClock.hour24 : PRESET_TIMES[mode].hour24;
  const minute = isLive ? liveClock.minute : PRESET_TIMES[mode].minute;
  const second = liveClock.second;

  const phase: TimePhase = isLive ? phaseFromClock(hour24, minute) : mode;
  const ampm: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const h12Num = hour24 % 12 || 12;
  const hh12 = String(h12Num).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const shortTime = `${h12Num}:${mm}`;

  const totalMins = hour24 * 60 + minute;
  let skyProgress: number;
  if (phase === "dawn" || phase === "day" || phase === "dusk") {
    // 05:00 (300m) -> 18:45 (1125m)
    skyProgress = Math.max(0, Math.min(1, (totalMins - 300) / (1125 - 300)));
  } else {
    // 18:45 (1125m) -> 05:00 next morning (1740m)
    const wrapped = totalMins < 300 ? totalMins + 1440 : totalMins;
    skyProgress = Math.max(0, Math.min(1, (wrapped - 1125) / (1740 - 1125)));
  }

  return {
    mode: currentMode,
    isLive,
    phase,
    phaseLabel: PHASE_LABELS[phase],
    hour24,
    minute,
    second,
    hh12,
    mm,
    ampm,
    shortTime,
    formatted: `${hh12}:${mm} ${ampm} PHT`,
    skyProgress,
  };
}
