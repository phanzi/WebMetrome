import { getAudioContext, scheduleSound } from "@/lib/utils";
import { useRef, useState } from "react";

export type MetronomeState = {
  bpm: number;
  beats: number;
};

export function useMetronomeController(offsetMs: number) {
  const [beatIndex, setBeatIndex] = useState(-1);
  const beatCounter = useRef(-1);
  const nextNoteSec = useRef(0);
  const timer = useRef<number | null>(null);

  const schedule = (ctx: AudioContext, state: MetronomeState) => {
    // Look-ahead: 100ms 앞의 박자를 미리 예약
    while (nextNoteSec.current < ctx.currentTime + 0.1) {
      beatCounter.current++;
      const isFirstBeat = beatCounter.current % state.beats === 0;
      scheduleSound(
        ctx,
        isFirstBeat ? "ACCENT" : "REGULAR",
        nextNoteSec.current + offsetMs / 1000,
      );

      nextNoteSec.current += 60.0 / state.bpm;
      setBeatIndex(beatCounter.current % state.beats);
    }

    timer.current = requestAnimationFrame(() => schedule(ctx, state));
  };

  const play = async (state: MetronomeState, startedAt?: number) => {
    const diffMs = startedAt ? Date.now() - startedAt : 0;
    if (diffMs < 50) {
      beatCounter.current = -1;
      nextNoteSec.current = (50 - diffMs) / 1000;
    } else {
      const bpmMs = 60_000 / state.bpm;
      beatCounter.current = Math.floor((diffMs - 50) / bpmMs);
      nextNoteSec.current = 50 + (beatCounter.current + 1) * bpmMs - diffMs;
    }

    const ctx = getAudioContext();
    schedule(ctx, state);
  };

  const stop = () => {
    if (timer.current) {
      cancelAnimationFrame(timer.current);
      nextNoteSec.current = 0;
      beatCounter.current = -1;
      setBeatIndex(-1);
      timer.current = null;
    }
  };

  return {
    play,
    stop,
    isPlaying: beatIndex !== -1,
    currentBeat: beatIndex,
  };
}
