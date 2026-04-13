import { useEffect, useState } from "react";
import { MetronomeScreen } from "./features/metronome/components/MetronomeScreen";
import {
  DEFAULT_BEATS,
  DEFAULT_BPM,
  DEFAULT_OFFSET_MS,
  STORAGE_KEYS,
} from "./features/metronome/domain/constants";
import {
  clampBpm,
  normalizeBeats,
  normalizeOffset,
  readStoredNumber,
  sanitizeInitialBpm,
  sanitizeInitialOffset,
} from "./features/metronome/domain/guards";
import { useMetronomeController } from "./features/metronome/hooks/useMetronomeController";
import { useRoomSync } from "./features/sync/hooks/useRoomSync";

export default function App() {
  const [bpm, setBpm] = useState(() =>
    sanitizeInitialBpm(
      readStoredNumber(localStorage.getItem(STORAGE_KEYS.bpm), DEFAULT_BPM),
    ),
  );
  const [displayBpm, setDisplayBpm] = useState(bpm);
  const [offset, setOffset] = useState(() =>
    sanitizeInitialOffset(
      readStoredNumber(
        localStorage.getItem(STORAGE_KEYS.offset),
        DEFAULT_OFFSET_MS,
      ),
    ),
  );
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(() =>
    normalizeBeats(
      readStoredNumber(localStorage.getItem(STORAGE_KEYS.beats), DEFAULT_BEATS),
    ),
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.bpm, bpm.toString());
  }, [bpm]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.beats, beatsPerMeasure.toString());
  }, [beatsPerMeasure]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.offset, offset.toString());
  }, [offset]);

  const metronome = useMetronomeController({
    bpm,
    beatsPerMeasure,
    offset,
  });

  const sync = useRoomSync({
    control: {
      bpm,
      beats: beatsPerMeasure,
      isPlaying: metronome.isPlaying,
    },
    onRemoteControl: (payload) => {
      setBpm(payload.bpm);
      setDisplayBpm(payload.bpm);
      setBeatsPerMeasure(payload.beats);
      if (payload.isPlaying) {
        metronome.start();
      } else {
        metronome.stop();
      }
    },
  });

  const handleCommitBpm = (value: number) => {
    const nextBpm = clampBpm(value);
    setBpm(nextBpm);
    setDisplayBpm(nextBpm);
  };

  const handleJoinRoom = () => {
    const code = prompt("방 코드 입력:");
    if (!code) {
      return;
    }
    sync.joinRoom(code);
  };

  const handleExitRoom = () => {
    sync.exitRoom();
    metronome.stop();
  };

  return (
    <MetronomeScreen
      bpm={bpm}
      displayBpm={displayBpm}
      offset={offset}
      beatsPerMeasure={beatsPerMeasure}
      isPlaying={metronome.isPlaying}
      currentBeat={metronome.currentBeat}
      canControl={sync.canControl}
      isLive={sync.isLive}
      isMaster={sync.isMaster}
      roomId={sync.roomId}
      onDisplayBpmChange={setDisplayBpm}
      onCommitBpm={handleCommitBpm}
      onOffsetChange={(value) => {
        setOffset(normalizeOffset(value));
      }}
      onBeatsChange={(value) => {
        setBeatsPerMeasure(normalizeBeats(value));
      }}
      onToggleMetronome={() => {
        if (sync.canControl) {
          metronome.toggle();
        }
      }}
      onJoinRoom={handleJoinRoom}
      onCreateRoom={sync.createRoom}
      onExitRoom={handleExitRoom}
    />
  );
}
