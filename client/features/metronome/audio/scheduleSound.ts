import { memoize } from "es-toolkit";

type GainPreset = {
  type: "exponential" | "linear";
  start: number;
  durationSec: number;
  end: number;
};

type SoundPreset = {
  hz: number;
  gain: GainPreset;
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

const getAudioContext = memoize(() => {
  const AC =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) {
    throw new Error("AudioContext constructor not found");
  }
  return new AC();
});

export function scheduleSound(
  presetKey: keyof typeof SOUND_PRESETS,
  soundAt: number,
) {
  const preset = SOUND_PRESETS[presetKey];
  const { hz, gain } = preset;
  const ctx = getAudioContext();

  // Create oscillator
  const oscillator = ctx.createOscillator();
  oscillator.frequency.value = hz;

  // Create gain node
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(gain.start, soundAt);
  gainNode.gain.exponentialRampToValueAtTime(
    gain.end,
    soundAt + gain.durationSec,
  );

  // Connect chanin and start/stop oscillator
  oscillator.connect(gainNode).connect(ctx.destination);
  oscillator.start(soundAt);
  oscillator.stop(soundAt + gain.durationSec);
}
