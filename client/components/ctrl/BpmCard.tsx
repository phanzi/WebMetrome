import { BPM } from "@/constants";
import { audio } from "@/lib/audio";
import { useEffect, useRef, useState } from "react";
import { Card, CardBody } from "../Card";

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value) || 0;
    setDisplayBpm(parsed);
    onChange?.(parsed);
  };
  const handleDoubleClick = () => {
    setDisplayBpm(BPM.DEFAULT);
    onChange?.(BPM.DEFAULT);
  };

  const handleTapBpm = async () => {
    const ctx = await audio.resume();
    audio.schedule(ctx, "REGULAR", ctx.currentTime + 0.01);
    const now = Date.now();
    const elapsed = Math.max(1, now - (tapTime.current ?? now));
    const bpm = Math.min(BPM.MAX, Math.round(60_000 / elapsed));
    setDisplayBpm(bpm);
    onChange?.(bpm);
    tapTime.current = now;
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
            onChange={handleChange}
            onDoubleClick={handleDoubleClick}
          />
          <button
            className="btn btn-soft btn-primary absolute top-0 right-1"
            onClick={handleTapBpm}
            disabled={disabled}
          >
            TAP
          </button>
        </div>
        <div className="relative mt-3 text-center">
          <input
            className="range range-primary"
            type="range"
            min={BPM.MIN}
            max={BPM.MAX}
            value={displayBpm}
            disabled={disabled}
            onChange={handleChange}
          />
        </div>
      </CardBody>
    </Card>
  );
}
