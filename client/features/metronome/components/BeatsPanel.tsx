import { compact } from "es-toolkit";
import { ALLOWED_BEATS } from "../domain/constants";

type BeatsPanelProps = {
  className: string;
  beatsPerMeasure: number;
  canEditMetronomeSettings: boolean;
  canEditClass: string;
  onBeatsChange: (value: number) => void;
};

export function BeatsPanel({
  className,
  beatsPerMeasure,
  canEditMetronomeSettings,
  canEditClass,
  onBeatsChange,
}: BeatsPanelProps) {
  return (
    <div className={className}>
      <p className="m-0 text-sm font-semibold text-slate-600">
        박자 (Beats): <b>{beatsPerMeasure}</b>
      </p>
      <div className="mt-2.5 flex gap-2">
        {ALLOWED_BEATS.map((beats) => (
          <button
            className={compact([
              "flex-1 rounded-lg border px-0 py-2.5 font-bold transition",
              beatsPerMeasure === beats
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-slate-300 bg-white text-slate-700",
              canEditClass,
            ]).join(" ")}
            key={beats}
            onClick={() => onBeatsChange(beats)}
            disabled={!canEditMetronomeSettings}
          >
            {beats}
          </button>
        ))}
      </div>
    </div>
  );
}
