import { useEffect, useState } from "react";
import { createMetronomeEngine } from "../audio/createMetronomeEngine";

type UseMetronomeControllerParams = {
  bpm: number;
  beatsPerMeasure: number;
};

export function useMetronomeController(params: UseMetronomeControllerParams) {
  const { bpm, beatsPerMeasure } = params;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);

  const [engine] = useState(() =>
    createMetronomeEngine({
      bpm,
      beatsPerMeasure,
      onBeat: (beatIndex) => {
        setCurrentBeat(beatIndex);
      },
    }),
  );

  useEffect(() => {
    engine.setBpm(bpm);
  }, [bpm, engine]);

  useEffect(() => {
    engine.setBeatsPerMeasure(beatsPerMeasure);
  }, [beatsPerMeasure, engine]);

  const start = () => {
    if (engine.start()) {
      setIsPlaying(true);
    }
  };

  const stop = () => {
    engine.stop();
    setIsPlaying(false);
  };

  const toggle = () => {
    if (engine.isRunning()) {
      stop();
      return;
    }
    start();
  };

  return {
    isPlaying,
    currentBeat,
    start,
    stop,
    toggle,
  };
}
