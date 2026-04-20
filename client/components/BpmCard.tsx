import { DEFAULT_BPM, MAX_BPM, MIN_BPM } from "@/constants";
import { useEffect, useRef, useState } from "react";
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
  const tapTime = useRef<number>(undefined);

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

  const handleTapBpm = () => {
    if (tapTime.current === undefined) {
      tapTime.current = Date.now();
    } else {
      const now = Date.now();
      const elapsed = now - tapTime.current;
      const bpm = Math.round(60_000 / elapsed);
      setDisplayBpm(bpm);
      onChange?.(bpm);
      tapTime.current = now;
    }
  };

  return (
    <Card className={className}>
      <CardBody>
        <h2 className="card-title justify-center">BPM</h2>
        <div className="relative flex items-center justify-center gap-2 text-center">
          <input
            className="input input-ghost text-center text-5xl"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            name="bpm"
            value={displayBpm}
            disabled={disabled}
            onChange={handleChangeBefore()}
            onDoubleClick={handleDoubleClick}
            onBlur={handleChangeBefore(onChange)}
          />
          <button
            className="btn btn-soft btn-primary absolute top-0 right-1"
            onClick={handleTapBpm}
          >
            TAP
          </button>
        </div>
        <div className="relative mt-3 text-center">
          <input
            className="range range-primary"
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={displayBpm}
            disabled={disabled}
            onChange={handleChangeBefore()}
            onBlur={handleChangeBefore(onChange)}
          />
          {/* <button
            className="btn btn-soft btn-primary absolute right-0 bottom-[calc(100%+1rem)]"
            onClick={handleTapBpm}
          >
            TAP
          </button> */}
        </div>
      </CardBody>
    </Card>
  );
}
