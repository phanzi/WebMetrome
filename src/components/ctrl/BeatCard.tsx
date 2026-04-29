import { BEATS, SUB_DIVISION } from "@/constants";
import { type SubDivision } from "@/shared/lib/metronome";
import { cn } from "@/shared/lib/utils";
import { Card, CardBody } from "../Card";
import { NoteIcon } from "../NoteIcon";

type Props = {
  beats: number;
  onBeatsChange: (beats: number) => void;
  subDivision: SubDivision;
  onSubDivisionChange: (subDivision: SubDivision) => void;
  disabled?: boolean;
  className?: string;
};

export function BeatCard(props: Props) {
  const {
    beats,
    onBeatsChange,
    subDivision,
    onSubDivisionChange,
    disabled = false,
    className,
  } = props;

  return (
    <Card className={className}>
      <CardBody>
        <h2 className="card-title justify-center">Beats (박자)</h2>
        <div className="text-center">
          <input
            className="input input-ghost text-center text-4xl"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            name="beats"
            aria-label="beats text input"
            value={beats}
            disabled={disabled}
            onChange={(e) => onBeatsChange(parseInt(e.target.value) || 0)}
            onDoubleClick={() => onBeatsChange(BEATS.DEFAULT)}
          />
        </div>
        <div className="join mt-3">
          {[2, 3, 4, 6, 8].map((b) => (
            <button
              className={cn(
                "join-item btn btn-lg btn-card flex-1 p-0",
                beats === b ? "btn-primary" : "bg-base-100",
              )}
              data-active={beats === b}
              key={b}
              onClick={() => onBeatsChange(b)}
              disabled={disabled}
            >
              {b}
            </button>
          ))}
        </div>
        <div className="join mt-2">
          {SUB_DIVISION.S.map((s) => (
            <button
              className={cn(
                "join-item btn btn-lg tooltip tooltip-bottom flex-1 p-0",
                subDivision === s ? "btn-primary" : "bg-base-100",
              )}
              key={s}
              disabled={disabled}
              onClick={() => onSubDivisionChange(s)}
              data-tip={s}
            >
              <NoteIcon className="h-full" type={s} />
              <span className="sr-only">{s}</span>
            </button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
