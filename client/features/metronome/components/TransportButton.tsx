import { compact } from "es-toolkit";

type TransportButtonProps = {
  isPlaying: boolean;
  canToggleMetronome: boolean;
  canToggleClass: string;
  onToggleMetronome: () => void;
};

export function TransportButton({
  isPlaying,
  canToggleMetronome,
  canToggleClass,
  onToggleMetronome,
}: TransportButtonProps) {
  return (
    <button
      className={compact([
        "mt-2.5 w-full rounded-[40px] border-none px-5 py-5 text-[1.4rem] font-bold text-white transition",
        isPlaying
          ? "bg-red-500 hover:bg-red-600"
          : "bg-blue-500 hover:bg-blue-600",
        canToggleClass,
      ]).join(" ")}
      onClick={onToggleMetronome}
      disabled={!canToggleMetronome}
    >
      {isPlaying ? "STOP" : !canToggleMetronome ? "WAITING..." : "START"}
    </button>
  );
}
