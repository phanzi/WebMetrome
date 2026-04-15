import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function getAudioContext() {
  const AC =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) {
    throw new Error("AudioContext constructor not found");
  }

  return new AC();
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

const SOUND_PRESETS = {
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

  // Create oscillator
  const osc = ctx.createOscillator();
  osc.frequency.value = hz;

  // Create gain node
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(gain.start, soundAtSec);
  gainNode.gain.exponentialRampToValueAtTime(
    gain.end,
    soundAtSec + gain.durationSec,
  );

  // Connect chain and schedule start/stop
  osc.connect(gainNode).connect(ctx.destination);
  osc.start(soundAtSec);
  osc.stop(soundAtSec + gain.durationSec);
}
