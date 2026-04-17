import { range } from "es-toolkit";
import { BeatCard } from "./components/BeatCard";
import { BeatDot } from "./components/BeatDot";
import { BpmCard } from "./components/BpmCard";
import { SavedMetronomeStatesCard } from "./components/SavedMetronomeStatesCard";
import { ViewLatencyOffsetCard } from "./components/ViewLatencyCard";
import { metronome } from "./hooks/metronome";
import { room } from "./hooks/room";
import { useAtom } from "./hooks/useAtom";
import { cn } from "./lib/utils";

export default function App() {
  /**
   * metronome state
   */
  const [bpm, setBpm] = useAtom(metronome.bpm);
  const [beats, setBeats] = useAtom(metronome.beats);
  const [beatIndex] = useAtom(metronome.beatIndex);
  const [offset, setOffset] = useAtom(metronome.offset);
  const [isPlaying] = useAtom(metronome.isPlaying);

  /**
   * room state
   */
  const [role] = useAtom(room.role);
  const [state] = useAtom(room.state);
  const [roomId] = useAtom(room.id);

  const handleJoinRoom = () => {
    const roomId = prompt("Enter room ID");
    if (!roomId) {
      return;
    }
    room.connect(roomId);
  };

  const editDisabled = isPlaying || (state === "online" && role !== "owner");

  return (
    <div className="mx-auto min-h-screen max-w-105 space-y-4 bg-slate-50 px-5 py-5 font-sans">
      <header className="flex items-center justify-between">
        <h1 className="m-0 text-[1.2rem] font-bold text-slate-900">
          Sync Metronome
        </h1>
        <div className="flex gap-2">
          {state !== "online" ? (
            <>
              <button
                className="rounded-lg bg-slate-700 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleJoinRoom}
                disabled={state === "connecting"}
              >
                {state === "connecting" ? "CONNECTING..." : "JOIN"}
              </button>
              <button
                className="rounded-lg bg-violet-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => room.connect()}
                disabled={state === "connecting"}
              >
                SHARE
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-emerald-500 px-3 py-1.5 text-[0.75rem] font-bold text-white">
                {role === "owner" ? "HOST" : "MEMBER"}: {roomId}
              </div>
              <button
                className="rounded-md bg-red-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600"
                onClick={() => room.leave()}
              >
                EXIT
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-slate-100 px-4 py-4">
        {range(0, beats).map((i) => (
          <BeatDot
            key={i}
            variant={i === 0 ? "accent" : "regular"}
            state={beatIndex === i ? "active" : "inactive"}
          />
        ))}
      </div>

      <BpmCard bpm={bpm} onChange={setBpm} disabled={editDisabled} />
      <BeatCard beats={beats} onChange={setBeats} disabled={editDisabled} />
      <ViewLatencyOffsetCard offset={offset} onChange={setOffset} />
      <SavedMetronomeStatesCard
        state={{ bpm, beats }}
        onLoad={({ bpm, beats }) => {
          setBpm(bpm);
          setBeats(beats);
        }}
        disabled={editDisabled}
      />

      <button
        className={cn(
          "w-full cursor-pointer rounded-full border-none px-5 py-5 text-[1.4rem] font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60",
          isPlaying
            ? "bg-red-500 hover:bg-red-600"
            : "bg-blue-500 hover:bg-blue-600",
        )}
        onClick={() => {
          if (isPlaying) {
            metronome.stop();
          } else {
            metronome.play();
          }
        }}
        disabled={state === "online" && role !== "owner"}
      >
        {isPlaying ? "STOP" : "START"}
      </button>
    </div>
  );
}
