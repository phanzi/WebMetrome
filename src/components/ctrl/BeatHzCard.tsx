import { audio } from "@/shared/lib/audio";
import type { ComponentProps } from "react";
import { useStore } from "zustand";
import { Card, CardBody } from "../Card";
import { Input } from "../Input";

type Props = ComponentProps<typeof Card> & {
  disabled?: boolean;
};

export function BeatHzCard(props: Props) {
  const { disabled = false, ...rest } = props;

  const audioPreset = useStore(audio.store, (store) => store.preset);
  const action = useStore(audio.store, (store) => store.action);

  const handleChange =
    (presetKey: keyof typeof audioPreset) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseInt(e.target.value) || 0;
      action.setBeatHz(presetKey, parsed);
    };

  return (
    <Card {...rest}>
      <CardBody>
        <h2 className="card-title justify-center">Beat Hz</h2>
        <div
          className="tooltip relative mt-2 flex items-center justify-center gap-2 text-center"
          data-tip="1st Beat"
        >
          <input
            className="range text-orange-500"
            type="range"
            min={200}
            max={2000}
            value={audioPreset.accent.hz}
            disabled={disabled}
            onChange={handleChange("accent")}
            onDoubleClick={() => action.resetBeatHz("accent")}
          />
          <Input
            className="input input-ghost input-xs w-28 text-center text-lg"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            name="volume"
            suffix="Hz"
            value={audioPreset.accent.hz}
            disabled={disabled}
            onChange={handleChange("accent")}
            onDoubleClick={() => action.resetBeatHz("accent")}
          />
        </div>
        <div
          className="tooltip relative mt-2 flex items-center justify-center gap-2 text-center"
          data-tip="After 1st beat"
        >
          <input
            className="range text-emerald-500"
            type="range"
            min={200}
            max={2000}
            value={audioPreset.regular.hz}
            disabled={disabled}
            onChange={handleChange("regular")}
            onDoubleClick={() => action.resetBeatHz("regular")}
          />
          <Input
            className="input input-ghost input-xs w-28 text-center text-lg"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            name="volume"
            suffix="Hz"
            value={audioPreset.regular.hz}
            disabled={disabled}
            onChange={handleChange("regular")}
            onDoubleClick={() => action.resetBeatHz("regular")}
          />
        </div>
        <div
          className="tooltip relative mt-2 flex items-center justify-center gap-2 text-center"
          data-tip="Between beats"
        >
          <input
            className="range"
            type="range"
            min={200}
            max={2000}
            value={audioPreset.sub.hz}
            disabled={disabled}
            onChange={handleChange("sub")}
            onDoubleClick={() => action.resetBeatHz("sub")}
          />
          <Input
            className="input input-ghost input-xs w-28 text-center text-lg"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            name="volume"
            suffix="Hz"
            value={audioPreset.sub.hz}
            disabled={disabled}
            onChange={handleChange("sub")}
            onDoubleClick={() => action.resetBeatHz("sub")}
          />
        </div>
      </CardBody>
    </Card>
  );
}
