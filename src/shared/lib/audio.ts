import { VOLUME } from "@/constants";
import { createStore } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type BeapType = keyof Store["preset"];

const _activeNodes = new Set<AudioScheduledSourceNode>();

let _audioCtx: AudioContext | null = null;

function _getAudioContext() {
  if (_audioCtx !== null) return _audioCtx;
  const AC = AudioContext ?? (window as unsafe_any).webkitAudioContext;
  _audioCtx = new AC();
  return _audioCtx;
}

type SoundPreset = {
  hz: number;
  gain: {
    type: "exponential" | "linear";
    start: number;
    durationSec: number;
    end: number;
  };
};

type Store = {
  preset: {
    sub: SoundPreset;
    regular: SoundPreset;
    accent: SoundPreset;
  };
  volume: number;
  action: {
    setBeatHz: (presetKey: keyof Store["preset"], hz: number) => void;
    resetBeatHz: (presetKey: keyof Store["preset"]) => void;
    resetVolume: () => void;
    setVolume: (volume: number) => void;
  };
};

const store = createStore<Store>()(
  persist(
    immer((set, _get) => ({
      preset: {
        sub: {
          hz: 400,
          gain: {
            type: "exponential",
            start: 1,
            durationSec: 0.06,
            end: 0.001,
          },
        },
        regular: {
          hz: 800,
          gain: {
            type: "exponential",
            start: 1,
            durationSec: 0.06,
            end: 0.001,
          },
        },
        accent: {
          hz: 1600,
          gain: {
            type: "exponential",
            start: 1,
            durationSec: 0.12,
            end: 0.001,
          },
        },
      },
      /**
       * range: 0 ~ 100 (%)
       */
      volume: VOLUME.DEFAULT,
      action: {
        setBeatHz: (presetKey: keyof Store["preset"], hz: number) => {
          set((state) => {
            state.preset[presetKey].hz = hz;
          });
        },
        resetBeatHz: (presetKey: keyof Store["preset"]) => {
          set((state) => {
            state.preset[presetKey].hz =
              store.getInitialState().preset[presetKey].hz;
          });
        },
        resetVolume: () => {
          set((state) => {
            state.volume = store.getInitialState().volume;
          });
        },
        setVolume: (volume: number) => {
          set((state) => {
            state.volume = volume;
          });
        },
      },
    })),
    {
      name: "audio",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        volume: state.volume,
      }),
    },
  ),
);

export function scheduleSound(
  ctx: AudioContext,
  presetKey: keyof Store["preset"],
  soundAtSec: number,
) {
  const preset = store.getState().preset[presetKey];
  const { hz, gain } = preset;
  const volumeMul = store.getState().volume / 100;

  // Create oscillator
  const osc = ctx.createOscillator();
  osc.frequency.value = hz;
  osc.addEventListener("ended", () => _activeNodes.delete(osc));
  _activeNodes.add(osc);

  // Create gain node
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(gain.start * volumeMul, soundAtSec);
  gainNode.gain.exponentialRampToValueAtTime(
    gain.end * volumeMul,
    soundAtSec + gain.durationSec,
  );

  // Connect chain and schedule start/stop
  osc.connect(gainNode).connect(ctx.destination);
  osc.start(soundAtSec);
  osc.stop(soundAtSec + gain.durationSec);
}

async function resume() {
  const _audioCtx = _getAudioContext();
  if (_audioCtx.state === "interrupted" || _audioCtx.state === "suspended") {
    await _audioCtx.resume();
  }
  return _audioCtx;
}

async function suspend() {
  const _audioCtx = _getAudioContext();
  for (const node of _activeNodes) {
    try {
      node.stop();
    } catch {}
  }
  _activeNodes.clear();
  await _audioCtx.suspend();
  return _audioCtx;
}

/**
 * exports
 */

export const audio = {
  store,
  schedule: scheduleSound,
  resume,
  suspend,
};
