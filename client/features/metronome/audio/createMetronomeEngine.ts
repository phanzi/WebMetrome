type MetronomeEngineOptions = {
  bpm: number;
  beatsPerMeasure: number;
  offsetMs: number;
  onBeat: (beatIndex: number) => void;
};

export function createMetronomeEngine(options: MetronomeEngineOptions) {
  const { onBeat } = options;
  let bpm = options.bpm;
  let beatsPerMeasure = options.beatsPerMeasure;
  let offsetMs = options.offsetMs;

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

    osc.frequency.value = isFirstBeat ? 1600 : 800;
    const duration = isFirstBeat ? 0.12 : 0.06;
      const scheduledTime = time + offsetMs / 1000;

    gain.gain.setValueAtTime(1, scheduledTime);
    gain.gain.exponentialRampToValueAtTime(0.001, scheduledTime + duration);

    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(scheduledTime);
    osc.stop(scheduledTime + duration);
  };

  const scheduler = () => {
    if (!audioContext) {
      return;
    }

    while (nextNoteTime < audioContext.currentTime + 0.1) {
      const isFirstBeat = beatCounter % beatsPerMeasure === 0;
      const beatIndex = beatCounter % beatsPerMeasure;
      playSound(nextNoteTime, isFirstBeat);
      onBeat(beatIndex);

      nextNoteTime += 60.0 / bpm;
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
      nextNoteTime = context.currentTime + 0.05;
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
    setOffsetMs(nextOffsetMs: number) {
      offsetMs = nextOffsetMs;
    },
  };
}
