import { delay } from "es-toolkit";
import { DEFAULT_BEATS, DEFAULT_BPM } from "../domain/constants";

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

export class Metronome {
  private bpm: number = DEFAULT_BPM;
  private beats: number = DEFAULT_BEATS;

  private abortController: AbortController | null = null;
  private onBeat: ((beatIndex: number) => void) | null = null;

  private getAudioContext() {
    const AC =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) {
      throw new Error("AudioContext constructor not found");
    }

    return new AC();
  }

  public set(state: { bpm: number; beats: number }) {
    const running = this.isRunning();
    if (running) {
      this.stop();
    }
    this.bpm = state.bpm;
    this.beats = state.beats;
    if (running) {
      this.play(this.onBeat!);
    }
  }

  public async play(onBeat: (beatIndex: number) => void, startedAt?: number) {
    this.abortController = new AbortController();
    this.onBeat = onBeat;
    const { signal } = this.abortController;

    const elapsedMs = startedAt ? Date.now() - startedAt : 0;
    const delayMs = 60_000 / this.bpm;

    const ctx = this.getAudioContext();
    let beatCounter = Math.floor(elapsedMs / delayMs);
    let lastBeatAt = beatCounter * delayMs;

    while (!signal.aborted) {
      const beatIndex = beatCounter % this.beats;
      const presetKey = beatIndex === 0 ? "ACCENT" : "REGULAR";
      lastBeatAt = lastBeatAt + delayMs;
      this.scheduleSound(ctx, presetKey, lastBeatAt);
      try {
        await delay(delayMs, { signal });
        onBeat(beatIndex);
        beatCounter++;
      } catch (error) {
        if (!signal.aborted) {
          throw error;
        }
      }
    }
  }

  private scheduleSound(
    ctx: AudioContext,
    presetKey: keyof typeof SOUND_PRESETS,
    soundAt: number,
  ) {
    const preset = SOUND_PRESETS[presetKey];
    const { hz, gain } = preset;

    // Create oscillator
    const osc = ctx.createOscillator();
    osc.frequency.value = hz;

    // Create gain node
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(gain.start, soundAt);
    gainNode.gain.exponentialRampToValueAtTime(
      gain.end,
      soundAt + gain.durationSec,
    );

    // Connect chain and schedule start/stop
    osc.connect(gainNode).connect(ctx.destination);
    osc.start(soundAt);
    osc.stop(soundAt + gain.durationSec);
  }

  public stop() {
    this.abortController?.abort();
    this.abortController = null;
    this.onBeat = null;
  }

  public isRunning(): boolean {
    return this.abortController !== null;
  }
}
