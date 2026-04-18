import { DEFAULT_BPM, MAX_BPM, MIN_BPM } from "@/constants";
import { useEffect, useState } from "react";
import { Card, CardBody } from "./Card";

type Props = {
  bpm: number;
  onChange: (bpm: number) => void;
  disabled?: boolean;
  className?: string;
};

export function BpmCard(props: Props) {
  const { bpm, onChange, disabled = false, className = "" } = props;

  const [displayBpm, setDisplayBpm] = useState(bpm);

  useEffect(() => {
    setDisplayBpm(bpm);
  }, [bpm]);

  const handleChangeBefore =
    (callback?: (bpm: number) => void) =>
    (e: React.SyntheticEvent<HTMLInputElement>) => {
      const parsed = parseInt(e.currentTarget.value) || 0;
      setDisplayBpm(parsed);
      callback?.(parsed);
    };
  const handleDoubleClick = () => {
    setDisplayBpm(DEFAULT_BPM);
    onChange?.(DEFAULT_BPM);
  };

  return (
    <Card className={className}>
      <CardBody>
        <h2 className="card-title justify-center">BPM</h2>
        <div className="text-center">
          <input
            className="input input-ghost text-center text-5xl"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={displayBpm}
            disabled={disabled}
            onChange={handleChangeBefore()}
            onDoubleClick={handleDoubleClick}
            onMouseUp={handleChangeBefore(onChange)}
            onTouchEnd={handleChangeBefore(onChange)}
          />
        </div>
        <div className="mt-3 text-center">
          <input
            className="range range-primary"
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={displayBpm}
            disabled={disabled}
            onChange={handleChangeBefore()}
            onMouseUp={handleChangeBefore(onChange)}
            onTouchEnd={handleChangeBefore(onChange)}
          />
        </div>
      </CardBody>
    </Card>
  );
}
