import { useEffect, useState } from "react";
import { Card, CardBody } from "./Card";
import { Input } from "./Input";

type Props = {
  offset: number;
  onChange: (offset: number) => void;
  disabled?: boolean;
  className?: string;
};

export function ViewLatencyOffsetCard(props: Props) {
  const { offset, onChange, disabled = false, className = "" } = props;

  const [displayOffset, setDisplayOffset] = useState(offset);

  useEffect(() => {
    setDisplayOffset(offset);
  }, [offset]);

  const handleChangeBefore =
    (callback?: (offset: number) => void) =>
    (e: React.SyntheticEvent<HTMLInputElement>) => {
      const parsed = parseInt(e.currentTarget.value) || 0;
      setDisplayOffset(parsed);
      callback?.(parsed);
    };

  return (
    <Card className={className}>
      <CardBody>
        <h2 className="card-title justify-center">Latency Offset</h2>
        <div className="text-center">
          <Input
            className="input input-ghost text-center text-5xl"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={displayOffset}
            disabled={disabled}
            onChange={handleChangeBefore()}
            suffix="ms"
          />
        </div>
        <div className="mt-3 text-center">
          <input
            className="range range-primary"
            type="range"
            min={-40}
            max={40}
            value={displayOffset}
            disabled={disabled}
            onChange={handleChangeBefore(onChange)}
          />
        </div>
      </CardBody>
    </Card>
  );
}
