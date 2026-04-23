import { VOLUME } from "@/constants";
import { useAtom } from "@/lib/atom";
import { audio } from "@/lib/audio";
import type { ComponentProps } from "react";
import { Card, CardBody } from "../Card";
import { Input } from "../Input";

type Props = ComponentProps<typeof Card> & {
  disabled?: boolean;
};

export function VolumeCard(props: Props) {
  const { disabled = false, ...rest } = props;

  const [volume, setVolume] = useAtom(audio.volume);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value) || 0;
    setVolume(parsed);
  };
  const handleDoubleClick = () => {
    setVolume(VOLUME.DEFAULT);
  };

  return (
    <Card {...rest}>
      <CardBody>
        <h2 className="card-title justify-center">Volume</h2>
        <div className="relative flex items-center justify-center gap-2 text-center">
          <Input
            className="input input-ghost text-center text-5xl"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            name="volume"
            suffix="%"
            value={volume}
            disabled={disabled}
            onChange={handleChange}
            onDoubleClick={handleDoubleClick}
          />
        </div>
        <div className="relative mt-3 text-center">
          <input
            className="range range-primary"
            type="range"
            min={VOLUME.MIN}
            max={VOLUME.MAX}
            value={volume}
            disabled={disabled}
            onChange={handleChange}
          />
        </div>
      </CardBody>
    </Card>
  );
}
