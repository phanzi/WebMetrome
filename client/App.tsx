import { range } from "es-toolkit";
import { CopyIcon, MoonIcon, QrCodeIcon, SunIcon } from "lucide-react";
import { BeatCard } from "./components/BeatCard";
import { BeatDot } from "./components/BeatDot";
import { BpmCard } from "./components/BpmCard";
import { Card, CardBody } from "./components/Card";
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

  /**
   * extra state
   */
  // NOTHING HERE

  const handleJoinRoom = () => {
    const roomId = prompt("Enter room ID");
    if (!roomId) {
      return;
    }
    room.connect(roomId);
  };
  const togglePlay = () => {
    if (isPlaying) {
      metronome.stop();
    } else {
      metronome.play();
    }
  };

  const editDisabled = isPlaying || (state === "online" && role !== "owner");

  return (
    <div className="mx-auto min-h-screen max-w-md space-y-4 px-5 py-5 font-sans">
      <header className="flex items-center justify-between px-4">
        <h1 className="text-2xl font-bold">Sync Metronome</h1>
        {/* TODO: 다크 모드 토글 기능 추가 */}
        <label className="swap btn size-8">
          <input type="checkbox" />
          <SunIcon className="swap-on" />
          <MoonIcon className="swap-off" />
        </label>
      </header>

      <Card className="sticky top-4 z-10 flex-row shadow-lg">
        <div className="flex w-full p-4">
          <BeatDot className="w-0 border-0 outline-0" variant="accent" />
          <div
            className={cn(
              "flex w-full items-center justify-center gap-2",
              beats > 10 && "gap-1.5",
              beats > 20 && "gap-1",
              beats > 40 && "gap-0.5",
            )}
          >
            {range(0, beats).map((i) => (
              <BeatDot
                key={i}
                variant={i === 0 ? "accent" : "regular"}
                state={beatIndex === i ? "active" : "inactive"}
              />
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardBody className="gap-1">
          <h2 className="card-title justify-center">
            Remote Control{" "}
            {state === "online" ? (
              <>
                (
                <span className="text-primary">
                  {role === "owner" ? "HOST" : "MEMBER"}
                </span>
                )
              </>
            ) : null}
          </h2>
          {/* <div className="text-center text-4xl font-normal">{roomId}</div> */}
          {state === "online" ? (
            <div className="text-center">
              <input
                className="input input-ghost h-12 text-center text-4xl"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={roomId ?? ""}
              />
            </div>
          ) : null}
          <div className="text-center">
            {state === "online" ? (
              <div className="join mt-2 w-72 max-w-full justify-center">
                {/* TODO: roomId 복사 및 복사 성공 toast 표시 */}
                <button className="join-item btn bg-base-100 flex-1 p-0">
                  <CopyIcon className="size-5" />
                </button>
                <button
                  className="join-item btn bg-base-100 text-md flex-2 p-0"
                  onClick={() => room.leave()}
                >
                  EXIT
                </button>
                {/* TODO: QR 코드 생성 및 modal 표시 */}
                <button className="join-item btn bg-base-100 flex-1 p-0">
                  <QrCodeIcon className="size-5" />
                </button>
              </div>
            ) : (
              <div className="join mt-1 w-72 max-w-full justify-center">
                {/* TODO: join modal 추가 */}
                <button
                  className="btn btn-md btn-neutral join-item flex-1"
                  onClick={handleJoinRoom}
                  disabled={state === "connecting"}
                >
                  JOIN
                </button>
                <button
                  className="btn btn-md btn-primary join-item flex-1"
                  onClick={() => room.connect()}
                  disabled={state === "connecting"}
                >
                  SHARE
                </button>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

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
          "btn btn-xl sticky bottom-4 w-full",
          isPlaying ? "btn-warning" : "btn-primary",
        )}
        onClick={togglePlay}
        disabled={state === "online" && role !== "owner"}
      >
        {isPlaying ? "STOP" : "START"}
      </button>
    </div>
  );
}
