import { useEffect, useState } from "react";
import { Card } from "./Card";

type Props = {
  offset: number;
  onChange: (offset: number) => void;
  disabled?: boolean;
};

export function ViewLatencyOffsetCard(props: Props) {
  const { offset, onChange, disabled = false } = props;

  const [displayOffset, setDisplayOffset] = useState(offset);

  useEffect(() => {
    setDisplayOffset(offset);
  }, [offset]);

  const handleChangeBefore =
    (callback?: (offset: number) => void) =>
    (e: React.SyntheticEvent<HTMLInputElement>) => {
      const parsed = parseInt(e.currentTarget.value);
      const newOffset = Number.isFinite(parsed) ? parsed : 0;
      setDisplayOffset(newOffset);
      callback?.(newOffset);
    };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="m-0 text-sm font-semibold text-slate-600">
          Latency Offset: <b>{displayOffset}</b>
        </span>
        <input
          className="w-20 rounded-lg border border-slate-300 text-center font-bold text-slate-900"
          type="number"
          value={displayOffset}
          disabled={disabled}
          onChange={handleChangeBefore()}
          onMouseUp={handleChangeBefore(onChange)}
          onTouchEnd={handleChangeBefore(onChange)}
        />
      </div>
      <input
        className="w-full accent-blue-500"
        type="range"
        min={-40}
        max={40}
        value={displayOffset}
        disabled={disabled}
        onChange={handleChangeBefore()}
        onMouseUp={handleChangeBefore(onChange)}
        onTouchEnd={handleChangeBefore(onChange)}
      />
    </Card>
  );
}
