import { range } from "es-toolkit";
import { useState } from "react";
import { BeatDot } from "./components/BeatDot";
import { BpmCard } from "./components/BpmCard";
import { Card } from "./components/Card";
import {
  ALLOWED_BEATS,
  DEFAULT_BEATS,
  DEFAULT_BPM,
  STORAGE_KEYS,
} from "./constants";
import { useMetronomeController } from "./hooks/useMetronomeController";
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

  /**
   * Metronome playing state
   */
  const metronome = useMetronomeController();
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

      <div className="mb-4 flex min-h-27.5 items-center justify-center gap-2 rounded-[25px] border border-slate-200 bg-slate-100">
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

      <Card>
        <p className="m-0 text-sm font-semibold text-slate-600">
          박자 (Beats): <b>{state.beats}</b>
        </p>
        <div className="mt-2.5 flex gap-2">
          {ALLOWED_BEATS.map((b) => (
            <button
              className={cn(
                "flex-1 rounded-lg border px-0 py-2.5 font-bold transition",
                state.beats === b
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-slate-300 bg-white text-slate-700",
                canEditMetronomeSettings
                  ? "cursor-pointer"
                  : "cursor-not-allowed opacity-60",
              )}
              key={b}
              onClick={() => handleBeatsChange(b)}
              disabled={!canEditMetronomeSettings}
            >
              {b}
            </button>
          ))}
        </div>
      </Card>

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
