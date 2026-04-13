import { memo } from "react";
import { BeatIndicators } from "./BeatIndicators";
import { BeatsPanel } from "./BeatsPanel";
import { BpmPanel } from "./BpmPanel";
import { RoomHeader } from "./RoomHeader";
import { TransportButton } from "./TransportButton";

const METRONOME_CARD_CLASS =
  "mb-3 rounded-[18px] bg-white p-[15px] shadow-[0_4px_12px_rgba(0,0,0,0.05)]";

type Props = {
  bpm: number;
  displayBpm: number;
  beatsPerMeasure: number;
  isPlaying: boolean;
  currentBeat: number;
  canEditMetronomeSettings: boolean;
  canToggleMetronome: boolean;
  isLive: boolean;
  isMaster: boolean;
  isConnecting: boolean;
  roomId: string | null;
  onDisplayBpmChange: (value: number) => void;
  onCommitBpm: (value: number) => void;
  onBeatsChange: (value: number) => void;
  onToggleMetronome: () => void;
  onJoinRoom: () => void;
  onCreateRoom: () => void;
  onExitRoom: () => void;
};

function MetronomeScreenComponent(props: Props) {
  const {
    bpm,
    displayBpm,
    beatsPerMeasure,
    isPlaying,
    currentBeat,
    canEditMetronomeSettings,
    canToggleMetronome,
    isLive,
    isMaster,
    isConnecting,
    roomId,
    onDisplayBpmChange,
    onCommitBpm,
    onBeatsChange,
    onToggleMetronome,
    onJoinRoom,
    onCreateRoom,
    onExitRoom,
  } = props;

  const canEditClass = canEditMetronomeSettings
    ? "cursor-pointer"
    : "cursor-not-allowed opacity-60";
  const canToggleClass = canToggleMetronome
    ? "cursor-pointer"
    : "cursor-not-allowed opacity-60";

  return (
    <div className="mx-auto min-h-screen w-full max-w-105 bg-slate-50 px-5 py-5 font-sans">
      <RoomHeader
        {...(isLive
          ? {
              kind: "live" as const,
              roomId: roomId ?? "",
              isMaster,
              onExitRoom,
            }
          : {
              kind: "offline" as const,
              isConnecting,
              onJoinRoom,
              onCreateRoom,
            })}
      />

      <BeatIndicators
        beatsPerMeasure={beatsPerMeasure}
        currentBeat={currentBeat}
        isPlaying={isPlaying}
        bpm={bpm}
      />

      <BpmPanel
        className={METRONOME_CARD_CLASS}
        displayBpm={displayBpm}
        canEditMetronomeSettings={canEditMetronomeSettings}
        canEditClass={canEditClass}
        onDisplayBpmChange={onDisplayBpmChange}
        onCommitBpm={onCommitBpm}
      />

      <BeatsPanel
        className={METRONOME_CARD_CLASS}
        beatsPerMeasure={beatsPerMeasure}
        canEditMetronomeSettings={canEditMetronomeSettings}
        canEditClass={canEditClass}
        onBeatsChange={onBeatsChange}
      />

      <TransportButton
        isPlaying={isPlaying}
        canToggleMetronome={canToggleMetronome}
        canToggleClass={canToggleClass}
        onToggleMetronome={onToggleMetronome}
      />
    </div>
  );
}

export const MetronomeScreen = memo(MetronomeScreenComponent);
