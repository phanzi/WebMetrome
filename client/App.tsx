import { trim } from "es-toolkit";
import { useCallback, useEffect, useState } from "react";
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
  const {
    bpm,
    beatsPerMeasure,
    currentBeat,
    isOwner,
    roomId,
    setBpm,
    setBeatsPerMeasure,
    toggle,
    disconnect,
  } = metronome;

  const [displayBpm, setDisplayBpm] = useState(() => bpm);

  // Reset the BPM input when authoritative `bpm` changes (e.g. remote sync), without fighting local typing.
  useEffect(() => {
    setDisplayBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.bpm, bpm.toString());
  }, [bpm]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.beats, beatsPerMeasure.toString());
  }, [beatsPerMeasure]);

  const canControlInServer = !isServer || isOwner;
  const canToggleMetronome = canControlInServer;
  const canEditMetronomeSettings = canControlInServer && !isPlaying;

  const handleCommitBpm = useCallback(
    (value: number) => {
      const nextBpm = clampBpm(value);
      setDisplayBpm(nextBpm);
      setBpm(nextBpm);
    },
    [setBpm],
  );

  const handleJoinRoom = useCallback(() => {
    const code = prompt("방 코드 입력:");
    if (!code) {
      return;
    }
    const normalized = trim(code);
    if (!normalized) {
      return;
    }
    connect(normalized);
  }, [connect]);

  const handleExitRoom = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const handleBeatsChange = useCallback(
    (value: number) => {
      setBeatsPerMeasure(normalizeBeats(value));
    },
    [setBeatsPerMeasure],
  );

  const handleToggleMetronome = useCallback(() => {
    if (canToggleMetronome) {
      toggle();
    }
  }, [canToggleMetronome, toggle]);

  const handleCreateRoom = useCallback(() => {
    connect();
  }, [connect]);

  return (
    <MetronomeScreen
      bpm={bpm}
      displayBpm={displayBpm}
      beatsPerMeasure={beatsPerMeasure}
      isPlaying={isPlaying}
      currentBeat={currentBeat}
      canEditMetronomeSettings={canEditMetronomeSettings}
      canToggleMetronome={canToggleMetronome}
      isLive={isServer}
      isMaster={isOwner}
      isConnecting={isConnecting}
      roomId={roomId}
      onDisplayBpmChange={setDisplayBpm}
      onCommitBpm={handleCommitBpm}
      onBeatsChange={handleBeatsChange}
      onToggleMetronome={handleToggleMetronome}
      onJoinRoom={handleJoinRoom}
      onCreateRoom={handleCreateRoom}
      onExitRoom={handleExitRoom}
    />
  );
}
