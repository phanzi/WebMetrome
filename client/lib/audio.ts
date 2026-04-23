import { VOLUME } from "@/constants";
import { atom, toPersisted } from "./atom";

let _audioCtx: AudioContext | null = null;

const getContext = async () => {
  if (_audioCtx !== null) {
    if (_audioCtx.state === "interrupted" || _audioCtx.state === "suspended") {
      await _audioCtx.resume();
    }
    return _audioCtx;
  }

  const AC =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) {
    throw new Error("AudioContext constructor not found");
  }

  _audioCtx = new AC();
  return _audioCtx;
};

/**
 * range: 0 ~ 100 (%)
 */
const volumeRatio = toPersisted(VOLUME.PERSIST_KEY, atom(VOLUME.DEFAULT));

type SoundPreset = {
  hz: number;
  gain: {
    type: "exponential" | "linear";
    start: number;
    durationSec: number;
    end: number;
  };
};

const SOUND_PRESETS = {
  SUB: {
    hz: 400,
    gain: {
      type: "exponential",
      start: 1,
      durationSec: 0.06,
      end: 0.001,
    },
  },
  REGULAR: {
    hz: 800,
    gain: {
      type: "exponential",
      start: 1,
      durationSec: 0.06,
      end: 0.001,
    },
  },
  ACCENT: {
    hz: 1600,
    gain: {
      type: "exponential",
      start: 1,
      durationSec: 0.12,
      end: 0.001,
    },
  },
} satisfies Record<string, SoundPreset>;

export function scheduleSound(
  ctx: AudioContext,
  presetKey: keyof typeof SOUND_PRESETS,
  soundAtSec: number,
) {
  const preset = SOUND_PRESETS[presetKey];
  const { hz, gain } = preset;
  const volumeMul = volumeRatio.get() / 100;

  // Create oscillator
  const osc = ctx.createOscillator();
  osc.frequency.value = hz;

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

/**
 * exports
 */

export const audio = {
  PRESETS: SOUND_PRESETS,
  volume: volumeRatio,
  schedule: scheduleSound,
  getContext,
};
