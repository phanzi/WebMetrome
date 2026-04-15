import { DEFAULT_BPM, MAX_BPM, MIN_BPM } from "@/constants";
import { useEffect, useState } from "react";
import { Card } from "./Card";

type Props = {
  bpm: number;
  onChange: (bpm: number) => void;
  disabled?: boolean;
};

export function BpmCard(props: Props) {
  const { bpm, onChange, disabled = false } = props;

  const [displayBpm, setDisplayBpm] = useState(bpm);

  useEffect(() => {
    setDisplayBpm(bpm);
  }, [bpm]);

  const handleBpmChangeWith =
    (callback?: (bpm: number) => void) =>
    (e: React.SyntheticEvent<HTMLInputElement>) => {
      const parsed = parseInt(e.currentTarget.value);
      const newBpm = Number.isFinite(parsed) ? parsed : DEFAULT_BPM;
      setDisplayBpm(newBpm);
      callback?.(newBpm);
    };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="m-0 text-sm font-semibold text-slate-600">
          BPM: <b>{displayBpm}</b>
        </span>
        <input
          className="w-20 rounded-lg border border-slate-300 text-center font-bold text-slate-900"
          type="number"
          value={displayBpm}
          disabled={disabled}
          onChange={handleBpmChangeWith()}
          onMouseUp={handleBpmChangeWith(onChange)}
          onTouchEnd={handleBpmChangeWith(onChange)}
        />
      </div>
      <input
        className="w-full accent-blue-500"
        type="range"
        min={MIN_BPM}
        max={MAX_BPM}
        value={displayBpm}
        disabled={disabled}
        onChange={handleBpmChangeWith()}
        onMouseUp={handleBpmChangeWith(onChange)}
        onTouchEnd={handleBpmChangeWith(onChange)}
      />
    </Card>
  );
}
