import { clamp } from "es-toolkit";
import {
  AUDIO_ACCENT_DURATION_SEC,
  AUDIO_ACCENT_FREQUENCY_HZ,
  AUDIO_RAMP_MIN_GAIN,
  AUDIO_REGULAR_DURATION_SEC,
  AUDIO_REGULAR_FREQUENCY_HZ,
  DEFAULT_START_DELAY_SEC,
  MS_PER_SECOND,
  SCHEDULER_LOOKAHEAD_SEC,
  SECONDS_PER_MINUTE,
} from "./constants";

type MetronomeEngineOptions = {
  bpm: number;
  beatsPerMeasure: number;
  onBeat: (beatIndex: number) => void;
};

export type StartAlignedParams = {
  /** Wall clock ms when this handler runs (Date.now()) — aligns audio clock to wall delay. */
  recvWallMs: number;
  /** Absolute wall ms of the first click. */
  startWallMs: number;
  initialBeatIndex: number;
};

export function createMetronomeEngine(options: MetronomeEngineOptions) {
  const { onBeat } = options;
  let bpm = options.bpm;
  let beatsPerMeasure = options.beatsPerMeasure;

  let audioContext: AudioContext | null = null;
  let timerId: number | null = null;
  let nextNoteTime = 0;
  let beatCounter = 0;

  const getAudioContext = (): AudioContext | null => {
    if (audioContext) {
      return audioContext;
    }

    const AC =
      window.AudioContext ??
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AC) {
      return null;
    }

    audioContext = new AC();
    return audioContext;
  };

  const playSound = (time: number, isFirstBeat: boolean) => {
    if (!audioContext) {
      return;
    }

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.frequency.value = isFirstBeat
      ? AUDIO_ACCENT_FREQUENCY_HZ
      : AUDIO_REGULAR_FREQUENCY_HZ;
    const duration = isFirstBeat
      ? AUDIO_ACCENT_DURATION_SEC
      : AUDIO_REGULAR_DURATION_SEC;
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(
      AUDIO_RAMP_MIN_GAIN,
      time + duration,
    );

    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(time);
    osc.stop(time + duration);
  };

  const scheduler = () => {
    if (!audioContext) {
      return;
    }

    while (nextNoteTime < audioContext.currentTime + SCHEDULER_LOOKAHEAD_SEC) {
      const beatIndex = beatCounter % beatsPerMeasure;
      const isFirstBeat = beatIndex === 0;
      playSound(nextNoteTime, isFirstBeat);
      onBeat(beatIndex);

      nextNoteTime += SECONDS_PER_MINUTE / bpm;
      beatCounter += 1;
    }

    timerId = requestAnimationFrame(scheduler);
  };

  return {
    start(): boolean {
      if (timerId !== null) {
        return false;
      }

      const context = getAudioContext();
      if (!context) {
        return false;
      }

      if (context.state === "suspended") {
        context.resume();
      }

      beatCounter = 0;
      nextNoteTime = context.currentTime + DEFAULT_START_DELAY_SEC;
      scheduler();
      return true;
    },

    startAligned(params: StartAlignedParams): boolean {
      if (timerId !== null) {
        return false;
      }

      const context = getAudioContext();
      if (!context) {
        return false;
      }

      if (context.state === "suspended") {
        context.resume();
      }

      const audioNow = context.currentTime;
      const delaySec = clamp(
        (params.startWallMs - params.recvWallMs) / MS_PER_SECOND,
        0,
        Number.POSITIVE_INFINITY,
      );
      beatCounter = params.initialBeatIndex;
      nextNoteTime = audioNow + delaySec;
      scheduler();
      return true;
    },

    stop() {
      if (timerId !== null) {
        cancelAnimationFrame(timerId);
        timerId = null;
      }

      onBeat(0);
    },
    isRunning(): boolean {
      return timerId !== null;
    },
    setBpm(nextBpm: number) {
      bpm = nextBpm;
    },
    setBeatsPerMeasure(nextBeatsPerMeasure: number) {
      beatsPerMeasure = nextBeatsPerMeasure;
    },
  };
}
