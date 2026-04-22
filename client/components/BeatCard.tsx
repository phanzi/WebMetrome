import QuaterImage from "@/assets/note/quater.svg";
import QuaversImage from "@/assets/note/quavers.svg";
import SemiquaversImage from "@/assets/note/semiquavers.svg";
import TripletImage from "@/assets/note/triplet.svg";
import { ALLOWED_BEATS, DEFAULT_BEATS } from "@/constants";
import { useAtom } from "@/lib/atom";
import { metronome } from "@/lib/metronome";
import { theme as colorTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Card, CardBody } from "./Card";

type Props = {
  beats: number;
  onBeatsChange: (beats: number) => void;
  subDivision: ReturnType<typeof metronome.subDivision.get>;
  onSubDivisionChange: (
    subDivision: ReturnType<typeof metronome.subDivision.get>,
  ) => void;
  disabled?: boolean;
  className?: string;
};

const SUB_DIVISIONS: {
  label: ReturnType<typeof metronome.subDivision.get>;
  image: string;
}[] = [
  {
    label: "quater",
    image: QuaterImage,
  },
  {
    label: "quavers",
    image: QuaversImage,
  },
  {
    label: "triplet",
    image: TripletImage,
  },
  {
    label: "semiquavers",
    image: SemiquaversImage,
  },
];

export function BeatCard(props: Props) {
  const {
    beats,
    onBeatsChange,
    subDivision,
    onSubDivisionChange,
    disabled = false,
    className = "",
  } = props;

  const [theme] = useAtom(colorTheme);

  const handleDoubleClick = () => {
    onBeatsChange(DEFAULT_BEATS);
  };

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
            onChange={(e) => onBeatsChange(parseInt(e.target.value) || 0)}
            onDoubleClick={handleDoubleClick}
          />
        </div>
        <div className="join mt-3">
          {ALLOWED_BEATS.map((b) => (
            <button
              className={cn(
                "join-item btn btn-lg flex-1 p-0",
                beats === b ? "btn-primary" : "bg-base-100",
              )}
              key={b}
              onClick={() => onBeatsChange(b)}
              disabled={disabled}
            >
              {b}
            </button>
          ))}
        </div>
        <div className="join mt-2">
          {SUB_DIVISIONS.map((s) => (
            <button
              className={cn(
                "join-item btn btn-lg tooltip tooltip-bottom flex-1 p-0",
                subDivision === s.label ? "btn-primary" : "bg-base-100",
              )}
              key={s.label}
              disabled={disabled}
              onClick={() => onSubDivisionChange(s.label)}
              data-tip={s.label}
            >
              <img
                className={cn(
                  "h-full",
                  theme === "light" ? "" : "dark:invert",
                  subDivision === s.label ? "invert" : "",
                  disabled ? "opacity-20" : "",
                )}
                src={s.image}
                alt={s.label}
              />
            </button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
