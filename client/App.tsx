import { range } from "es-toolkit";
import { useState } from "react";
import { BeatCard } from "./components/BeatCard";
import { BeatDot } from "./components/BeatDot";
import { BpmCard } from "./components/BpmCard";
import { SavedMetronomeStatesCard } from "./components/SavedMetronomeStatesCard";
import { ViewLatencyOffsetCard } from "./components/ViewLatencyCard";
import { DEFAULT_BEATS, DEFAULT_BPM, STORAGE_KEYS } from "./constants";
import {
  MetronomeState,
  useMetronomeController,
} from "./hooks/useMetronomeController";
import { useServerMetronome } from "./hooks/useServerMetronome";
import { cn } from "./lib/utils";

export default function App() {
  /**
   * Metronome state
   */

  const [state, setState] = useState({
    bpm: localStorage.getItem(STORAGE_KEYS.bpm)
      ? parseInt(localStorage.getItem(STORAGE_KEYS.bpm) ?? "")
      : DEFAULT_BPM,
    beats: localStorage.getItem(STORAGE_KEYS.beats)
      ? parseInt(localStorage.getItem(STORAGE_KEYS.beats) ?? "")
      : DEFAULT_BEATS,
  });
  const [offset, setOffset] = useState(0);

  const handleBpmChange = (bpm: number) => {
    setState((prev) => ({ ...prev, bpm }));
    localStorage.setItem(STORAGE_KEYS.bpm, bpm.toString());
    if (server.state === "online" && server.role === "owner") {
      server.send({
        type: "set-metronome",
        metronome: {
          bpm,
          beats: state.beats,
        },
      });
    }
  };
  const handleBeatsChange = (beats: number) => {
    setState((prev) => ({ ...prev, beats }));
    localStorage.setItem(STORAGE_KEYS.beats, beats.toString());
    if (server.state === "online" && server.role === "owner") {
      server.send({
        type: "set-metronome",
        metronome: {
          bpm: state.bpm,
          beats,
        },
      });
    }
  };
  const handleOffsetChange = (offset: number) => {
    setOffset(offset);
    localStorage.setItem(STORAGE_KEYS.offset, offset.toString());
  };
  const handleLoadState = (state: MetronomeState) => {
    setState(state);
    localStorage.setItem(STORAGE_KEYS.bpm, state.bpm.toString());
    localStorage.setItem(STORAGE_KEYS.beats, state.beats.toString());
    if (server.state === "online" && server.role === "owner") {
      server.send({
        type: "set-metronome",
        metronome: state,
      });
    }
  };

  /**
   * Metronome playing state
   */
  const metronome = useMetronomeController(offset);
  const toggleMetronome = () => {
    if (metronome.isPlaying) {
      metronome.stop();
      if (server.state === "online" && server.role === "owner") {
        server.send({
          type: "play-halt",
        });
      }
    } else {
      // eslint-disable-next-line react-hooks/purity
      const startedAt = Date.now();
      if (server.state === "online" && server.role === "owner") {
        server.send({
          type: "play-schedule",
          startedAt,
        });
      }
      metronome.play(state, startedAt);
    }
  };

  /**
   * Server metronome and connection state
   */
  const server = useServerMetronome(state, (response) => {
    switch (response.type) {
      case "metronome-state": {
        setState(response.metronome);
        return;
      }
      case "play-schedule": {
        metronome.play(state, response.startedAt);
        return;
      }
      case "play-halt": {
        metronome.stop();
        return;
      }
    }
  });
  const handleJoinRoom = () => {
    const roomId = prompt("Enter room ID");
    if (!roomId) {
      return;
    }
    server.connect(roomId);
  };

  /**
   * extra derived states
   */
  const canEditMetronomeSettings =
    !metronome.isPlaying &&
    (server.state !== "online" || server.role === "owner");
  const canToggleMetronome =
    server.state !== "online" || server.role === "owner";

  return (
    <div className="mx-auto min-h-screen max-w-105 space-y-4 bg-slate-50 px-5 py-5 font-sans">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="m-0 text-[1.2rem] font-bold text-slate-900">
          Sync Metronome
        </h1>
        <div className="flex gap-2">
          {server.state !== "online" ? (
            <>
              <button
                className="rounded-lg bg-slate-700 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleJoinRoom}
                disabled={server.state === "connecting"}
              >
                {server.state === "connecting" ? "CONNECTING..." : "JOIN"}
              </button>
              <button
                className="rounded-lg bg-violet-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => server.connect()}
                disabled={server.state === "connecting"}
              >
                SHARE
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-emerald-500 px-3 py-1.5 text-[0.75rem] font-bold text-white">
                {server.role === "owner" ? "HOST" : "MEMBER"}: {server.roomId}
              </div>
              <button
                className="rounded-md bg-red-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600"
                onClick={() => server.disconnect()}
              >
                EXIT
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex items-center justify-center gap-2 rounded-[25px] border border-slate-200 bg-slate-100 px-4 py-4">
        {range(0, state.beats).map((i) => (
          <BeatDot
            key={i}
            variant={i === 0 ? "accent" : "regular"}
            state={metronome.currentBeat === i ? "active" : "inactive"}
          />
        ))}
      </div>

      <BpmCard
        bpm={state.bpm}
        onChange={handleBpmChange}
        disabled={!canEditMetronomeSettings}
      />

      <BeatCard
        beats={state.beats}
        onChange={handleBeatsChange}
        disabled={!canEditMetronomeSettings}
      />

      <ViewLatencyOffsetCard
        offset={offset}
        onChange={handleOffsetChange}
        disabled={metronome.isPlaying}
      />

      <SavedMetronomeStatesCard
        state={state}
        onLoad={handleLoadState}
        disabled={!canEditMetronomeSettings}
      />

      <button
        className={cn(
          "w-full rounded-[40px] border-none px-5 py-5 text-[1.4rem] font-bold text-white transition",
          metronome.isPlaying
            ? "bg-red-500 hover:bg-red-600"
            : "bg-blue-500 hover:bg-blue-600",
          canToggleMetronome
            ? "cursor-pointer"
            : "cursor-not-allowed opacity-60",
        )}
        onClick={toggleMetronome}
        disabled={!canToggleMetronome}
      >
        {metronome.isPlaying ? "STOP" : "START"}
      </button>
    </div>
  );
}
