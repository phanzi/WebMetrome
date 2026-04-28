import { OFFSET } from "@/constants";
import { metronome } from "@/shared/lib/metronome";
import { ComponentProps } from "react";
import { useStore } from "zustand";
import { Card, CardBody } from "../Card";
import { Input } from "../Input";

type Props = ComponentProps<typeof Card> & {
  disabled?: boolean;
};

export function LatencyOffsetCard(props: Props) {
  const { disabled = false, ...rest } = props;

  const offset = useStore(metronome.store, (store) => store.offset);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value) || 0;
    metronome.store.setState({ offset: parsed });
  };

  return (
    <Card {...rest}>
      <CardBody>
        <h2 className="card-title justify-center">Latency Offset</h2>
        <div className="text-center">
          <Input
            className="input input-ghost text-center text-5xl"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={offset}
            disabled={disabled}
            onChange={handleChange}
            suffix="ms"
          />
        </div>
        <div className="mt-3 text-center">
          <input
            className="range range-primary"
            type="range"
            min={OFFSET.MIN}
            max={OFFSET.MAX}
            value={offset}
            disabled={disabled}
            onChange={handleChange}
          />
        </div>
      </CardBody>
    </Card>
  );
}
