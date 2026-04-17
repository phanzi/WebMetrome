import { ALLOWED_BEATS } from "@/constants";
import { cn } from "@/lib/utils";
import { Card, CardBody } from "./Card";

type Props = {
  beats: number;
  onChange: (beats: number) => void;
  disabled?: boolean;
  className?: string;
};

export function BeatCard(props: Props) {
  const { beats, onChange, disabled = false, className = "" } = props;

  return (
    <Card className={className}>
      <CardBody>
        <h2 className="card-title justify-center">Beats (박자)</h2>
        <div className="text-center">
          <input
            className="input input-ghost text-center text-5xl"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={beats}
            disabled={disabled}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="join mt-3">
          {ALLOWED_BEATS.map((b) => (
            <button
              className={cn(
                "join-item btn btn-lg flex-1 p-0",
                beats === b
                  ? "bg-primary border-primary text-primary-content"
                  : "bg-base-100",
              )}
              key={b}
              onClick={() => onChange(b)}
              disabled={disabled}
            >
              {b}
            </button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
