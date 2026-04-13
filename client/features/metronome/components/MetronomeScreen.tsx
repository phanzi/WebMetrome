import { ALLOWED_BEATS, MAX_BPM, MIN_BPM } from "../domain/constants";
import { clampBpm } from "../domain/guards";

type Props = {
  bpm: number;
  displayBpm: number;
  offset: number;
  beatsPerMeasure: number;
  isPlaying: boolean;
  currentBeat: number;
  canControl: boolean;
  isLive: boolean;
  isMaster: boolean;
  roomId: string | null;
  onDisplayBpmChange: (value: number) => void;
  onCommitBpm: (value: number) => void;
  onOffsetChange: (value: number) => void;
  onBeatsChange: (value: number) => void;
  onToggleMetronome: () => void;
  onJoinRoom: () => void;
  onCreateRoom: () => void;
  onExitRoom: () => void;
};

export function MetronomeScreen(props: Props) {
  const {
    bpm,
    displayBpm,
    offset,
    beatsPerMeasure,
    isPlaying,
    currentBeat,
    canControl,
    isLive,
    isMaster,
    roomId,
    onDisplayBpmChange,
    onCommitBpm,
    onOffsetChange,
    onBeatsChange,
    onToggleMetronome,
    onJoinRoom,
    onCreateRoom,
    onExitRoom,
  } = props;
  const pulseDurationClass =
    bpm >= 180
      ? "[animation-duration:0.35s]"
      : bpm >= 120
        ? "[animation-duration:0.5s]"
        : "[animation-duration:0.75s]";
  const cardClass =
    "mb-3 rounded-[18px] bg-white p-[15px] shadow-[0_4px_12px_rgba(0,0,0,0.05)]";
  const canControlClass = canControl
    ? "cursor-pointer"
    : "cursor-not-allowed opacity-60";

  return (
    <div className="mx-auto min-h-screen w-full max-w-105 bg-slate-50 px-5 py-5 font-sans">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="m-0 text-[1.2rem] font-bold text-slate-900">
          Sync Metronome
        </h1>
        <div className="flex gap-2">
          {!isLive ? (
            <>
              <button
                className="rounded-lg bg-slate-700 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                onClick={onJoinRoom}
              >
                JOIN
              </button>
              <button
                className="rounded-lg bg-violet-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-violet-700"
                onClick={onCreateRoom}
              >
                SHARE
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-emerald-500 px-3 py-1.5 text-[0.75rem] font-bold text-white">
                {isMaster ? "HOST" : "MEMBER"}: {roomId}
              </div>
              <button
                className="rounded-md bg-red-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600"
                onClick={onExitRoom}
              >
                EXIT
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="mb-4 flex min-h-27.5 items-center justify-center gap-2 rounded-[25px] border border-slate-200 bg-slate-100">
        {Array.from({ length: beatsPerMeasure }).map((_, i) => (
          <div
            className={[
              "flex items-center justify-center rounded-full font-bold text-white transition-all duration-100",
              i === 0
                ? "h-13.75 w-13.75 text-[1.2rem]"
                : "h-9.5 w-9.5 text-[0.9rem]",
              isPlaying && currentBeat === i
                ? i === 0
                  ? "scale-110 animate-pulse bg-orange-500 shadow-[0_0_20px_rgba(230,126,34,0.9)]"
                  : "scale-110 animate-pulse bg-emerald-500 shadow-[0_0_20px_rgba(46,204,113,0.9)]"
                : "bg-slate-700",
              i === 0 ? "border-2 border-white" : "",
              isPlaying && currentBeat === i ? pulseDurationClass : "",
            ].join(" ")}
            key={i}
          >
            {i + 1}
          </div>
        ))}
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between">
          <span className="m-0 text-sm font-semibold text-slate-600">
            BPM: <b>{displayBpm}</b>
          </span>
          <input
            className={`w-16.25 rounded-lg border border-slate-300 px-1.5 py-1.5 text-center font-bold text-slate-900 ${canControlClass}`}
            type="number"
            value={displayBpm}
            disabled={!canControl}
            onChange={(e) => onDisplayBpmChange(Number(e.target.value))}
            onBlur={() => {
              onCommitBpm(clampBpm(displayBpm));
            }}
          />
        </div>
        <input
          className={`mt-2.5 w-full accent-blue-500 ${canControlClass}`}
          type="range"
          min={MIN_BPM}
          max={MAX_BPM}
          value={displayBpm}
          disabled={!canControl}
          onChange={(e) => onDisplayBpmChange(Number(e.target.value))}
          onMouseUp={(e) => {
            const nextBpm = Number((e.target as HTMLInputElement).value);
            onCommitBpm(nextBpm);
          }}
        />
      </div>

      <div className={cardClass}>
        <p className="m-0 text-sm font-semibold text-slate-600">
          박자 (Beats): <b>{beatsPerMeasure}</b>
        </p>
        <div className="mt-2.5 flex gap-2">
          {ALLOWED_BEATS.map((beats) => (
            <button
              className={[
                "flex-1 rounded-lg border px-0 py-2.5 font-bold transition",
                beatsPerMeasure === beats
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-slate-300 bg-white text-slate-700",
                canControlClass,
              ].join(" ")}
              key={beats}
              onClick={() => onBeatsChange(beats)}
              disabled={!canControl}
            >
              {beats}
            </button>
          ))}
        </div>
      </div>

      <div className={`${cardClass} border border-amber-200 bg-amber-50`}>
        <p className="m-0 text-sm font-semibold text-slate-600">
          지연 보정 (Latency Offset): <b>{offset}ms</b>
        </p>
        <input
          className={`mt-2.5 w-full accent-amber-500 ${canControlClass}`}
          type="range"
          min="0"
          max="500"
          value={offset}
          onChange={(e) => onOffsetChange(Number(e.target.value))}
        />
        <p className="mt-1.5 text-[0.7rem] text-slate-500">
          소리가 화면보다 늦게 들릴 때 값을 높여서 맞추세요.
        </p>
      </div>

      <button
        className={[
          "mt-2.5 w-full rounded-[40px] border-none px-5 py-5 text-[1.4rem] font-bold text-white transition",
          isPlaying
            ? "bg-red-500 hover:bg-red-600"
            : "bg-blue-500 hover:bg-blue-600",
          canControlClass,
        ].join(" ")}
        onClick={onToggleMetronome}
        disabled={!canControl}
      >
        {isPlaying ? "STOP" : !canControl ? "WAITING..." : "START"}
      </button>
    </div>
  );
}
