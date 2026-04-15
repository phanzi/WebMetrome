import { ALLOWED_BEATS } from "@/constants";
import { cn } from "@/lib/utils";
import { Card } from "./Card";

type Props = {
  beats: number;
  onChange: (beats: number) => void;
  disabled?: boolean;
};

export function BeatCard(props: Props) {
  const { beats, onChange, disabled = false } = props;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-600">
          박자 (Beats): <b>{beats}</b>
        </span>
        <input
          className="w-20 rounded-lg border border-slate-300 text-center font-bold text-slate-900"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={beats}
          disabled={disabled}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        />
      </div>
      <div className="mt-2.5 flex gap-2">
        {ALLOWED_BEATS.map((b) => (
          <button
            className={cn(
              "flex-1 cursor-pointer rounded-lg border px-0 py-2.5 font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
              beats === b
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-slate-300 bg-white text-slate-700",
            )}
            key={b}
            onClick={() => onChange(b)}
            disabled={disabled}
          >
            {b}
          </button>
        ))}
      </div>
    </Card>
  );
}
