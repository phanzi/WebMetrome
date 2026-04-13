import { useEffect, useState } from "react";
import { MetronomeScreen } from "./features/metronome/components/MetronomeScreen";
import {
  DEFAULT_BEATS,
  DEFAULT_BPM,
  STORAGE_KEYS,
} from "./features/metronome/domain/constants";
import {
  clampBpm,
  normalizeBeats,
  readStoredNumber,
  sanitizeInitialBpm,
} from "./features/metronome/domain/guards";
import { useMetronome } from "./features/metronome/hooks/useMetronome";

export default function App() {
  const initialBpm = sanitizeInitialBpm(
    readStoredNumber(localStorage.getItem(STORAGE_KEYS.bpm), DEFAULT_BPM),
  );
  const initialBeatsPerMeasure = normalizeBeats(
    readStoredNumber(localStorage.getItem(STORAGE_KEYS.beats), DEFAULT_BEATS),
  );

  const { connect, isServer, isConnecting, metronome, isPlaying } =
    useMetronome({
      initialBpm,
      initialBeatsPerMeasure,
    });
  const { bpm, beatsPerMeasure } = metronome;

  const [displayBpm, setDisplayBpm] = useState(() => bpm);

  useEffect(() => {
    setDisplayBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.bpm, bpm.toString());
  }, [bpm]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.beats, beatsPerMeasure.toString());
  }, [beatsPerMeasure]);

  const canControlInServer = !isServer || metronome.isOwner;
  const canToggleMetronome = canControlInServer;
  const canEditMetronomeSettings = canControlInServer && !isPlaying;

  const handleCommitBpm = (value: number) => {
    const nextBpm = clampBpm(value);
    setDisplayBpm(nextBpm);
    metronome.setBpm(nextBpm);
  };

  const handleJoinRoom = () => {
    const code = prompt("방 코드 입력:");
    if (!code) {
      return;
    }
    connect(code);
  };

  const handleExitRoom = () => {
    metronome.disconnect();
  };

  return (
    <MetronomeScreen
      bpm={bpm}
      displayBpm={displayBpm}
      beatsPerMeasure={beatsPerMeasure}
      isPlaying={isPlaying}
      currentBeat={metronome.currentBeat}
      canEditMetronomeSettings={canEditMetronomeSettings}
      canToggleMetronome={canToggleMetronome}
      isLive={isServer}
      isMaster={metronome.isOwner}
      isConnecting={isConnecting}
      roomId={metronome.roomId}
      onDisplayBpmChange={setDisplayBpm}
      onCommitBpm={handleCommitBpm}
      onBeatsChange={(value) => {
        metronome.setBeatsPerMeasure(normalizeBeats(value));
      }}
      onToggleMetronome={() => {
        if (canToggleMetronome) {
          metronome.toggle();
        }
      }}
      onJoinRoom={handleJoinRoom}
      onCreateRoom={() => {
        connect();
      }}
      onExitRoom={handleExitRoom}
    />
  );
}
