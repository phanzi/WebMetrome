import { compact, range } from "es-toolkit";
import { memo } from "react";

function getBpmPulseDurationClass(bpm: number): string {
  if (bpm >= 180) {
    return "[animation-duration:0.35s]";
  }
  if (bpm >= 120) {
    return "[animation-duration:0.5s]";
  }
  return "[animation-duration:0.75s]";
}

type BeatDotProps = {
  label: string;
  isAccent: boolean;
  isActive: boolean;
  isPlaying: boolean;
  pulseDurationClass: string;
};

const BeatDot = memo(function BeatDot({
  label,
  isAccent,
  isActive,
  isPlaying,
  pulseDurationClass,
}: BeatDotProps) {
  return (
    <div
      className={compact([
        "flex items-center justify-center rounded-full font-bold text-white transition-all duration-100",
        isAccent
          ? "h-13.75 w-13.75 text-[1.2rem]"
          : "h-9.5 w-9.5 text-[0.9rem]",
        isPlaying && isActive
          ? isAccent
            ? "scale-110 animate-pulse bg-orange-500 shadow-[0_0_20px_rgba(230,126,34,0.9)]"
            : "scale-110 animate-pulse bg-emerald-500 shadow-[0_0_20px_rgba(46,204,113,0.9)]"
          : "bg-slate-700",
        isAccent ? "border-2 border-white" : undefined,
        isPlaying && isActive ? pulseDurationClass : undefined,
      ]).join(" ")}
    >
      {label}
    </div>
  );
});

type BeatIndicatorsProps = {
  beatsPerMeasure: number;
  currentBeat: number;
  isPlaying: boolean;
  bpm: number;
};

export function BeatIndicators({
  beatsPerMeasure,
  currentBeat,
  isPlaying,
  bpm,
}: BeatIndicatorsProps) {
  const pulseDurationClass = getBpmPulseDurationClass(bpm);

  return (
    <div className="mb-4 flex min-h-27.5 items-center justify-center gap-2 rounded-[25px] border border-slate-200 bg-slate-100">
      {range(0, beatsPerMeasure).map((i) => (
        <BeatDot
          key={i}
          label={String(i + 1)}
          isAccent={i === 0}
          isActive={currentBeat === i}
          isPlaying={isPlaying}
          pulseDurationClass={pulseDurationClass}
        />
      ))}
    </div>
  );
}
