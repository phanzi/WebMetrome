import { MAX_BPM, MIN_BPM } from "../domain/constants";

type BpmPanelProps = {
  className: string;
  displayBpm: number;
  canEditMetronomeSettings: boolean;
  canEditClass: string;
  onDisplayBpmChange: (value: number) => void;
  onCommitBpm: (value: number) => void;
};

export function BpmPanel({
  className,
  displayBpm,
  canEditMetronomeSettings,
  canEditClass,
  onDisplayBpmChange,
  onCommitBpm,
}: BpmPanelProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <span className="m-0 text-sm font-semibold text-slate-600">
          BPM: <b>{displayBpm}</b>
        </span>
        <input
          className={`w-16.25 rounded-lg border border-slate-300 px-1.5 py-1.5 text-center font-bold text-slate-900 ${canEditClass}`}
          type="number"
          value={displayBpm}
          disabled={!canEditMetronomeSettings}
          onChange={(e) => onDisplayBpmChange(Number(e.target.value))}
          onBlur={() => onCommitBpm(displayBpm)}
        />
      </div>
      <input
        className={`mt-2.5 w-full accent-blue-500 ${canEditClass}`}
        type="range"
        min={MIN_BPM}
        max={MAX_BPM}
        value={displayBpm}
        disabled={!canEditMetronomeSettings}
        onChange={(e) => onDisplayBpmChange(Number(e.target.value))}
        onMouseUp={(e) => {
          const nextBpm = Number((e.target as HTMLInputElement).value);
          onCommitBpm(nextBpm);
        }}
      />
    </div>
  );
}
