import { range } from "es-toolkit";
import { MoonIcon, QrCodeIcon, SunIcon, TriangleAlertIcon } from "lucide-react";
import { useRef } from "react";
import { BeatCard } from "./components/BeatCard";
import { BeatDot } from "./components/BeatDot";
import { BpmCard } from "./components/BpmCard";
import { Card, CardBody } from "./components/Card";
import { CopyButton } from "./components/CopyButton";
import { SavedMetronomeStatesCard } from "./components/SavedMetronomeStatesCard";
import { ViewLatencyOffsetCard } from "./components/ViewLatencyCard";
import { useAtom } from "./lib/atom";
import { metronome } from "./lib/metronome";
import { room } from "./lib/room";
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
   * extra state and refs
   */
  const joinModalRef = useRef<HTMLDialogElement>(null);
  const qrCodeModalRef = useRef<HTMLDialogElement>(null);

  const togglePlay = () => {
    if (isPlaying) {
      metronome.stop();
    } else {
      metronome.play();
    }
  };

  const editDisabled = isPlaying || (state === "online" && role !== "owner");

  return (
    <>
      <div className="mx-auto min-h-screen max-w-md space-y-4 p-4 font-sans">
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
              <span>Remote Control</span>
              {state === "online" ? (
                <div>
                  (&nbsp;
                  <span className="text-primary">
                    {role === "owner" ? "HOST" : "MEMBER"}
                  </span>
                  &nbsp;)
                </div>
              ) : null}
            </h2>
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
                  <CopyButton content={roomId ?? ""} />
                  <button
                    className="join-item btn bg-base-100 text-md flex-2"
                    onClick={() => room.leave()}
                  >
                    EXIT
                  </button>
                  <button
                    className="join-item btn bg-base-100 flex-1"
                    onClick={() => qrCodeModalRef.current?.showModal()}
                  >
                    <QrCodeIcon className="size-5" />
                  </button>
                </div>
              ) : (
                <div className="join mt-1 w-72 max-w-full justify-center">
                  <button
                    className="btn btn-md btn-neutral join-item flex-1"
                    onClick={() => joinModalRef.current?.showModal()}
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

      <dialog className="modal" ref={joinModalRef}>
        <form
          className="modal-box space-y-2 text-center"
          method="dialog"
          onSubmit={(e: React.SubmitEvent<HTMLFormElement>) => {
            const formData = new FormData(e.target);
            const roomId = formData.get("room-id");
            if (!roomId) {
              return;
            }
            room.connect(roomId.toString());
            e.target.reset();
          }}
        >
          <h2 className="text-center text-lg font-bold">Remote Control</h2>
          <input
            className="input input-bordered input-lg w-72 max-w-full text-center text-3xl"
            type="text"
            name="room-id"
          />
          <p className="text-center text-sm text-gray-500">
            Enter room ID to join
          </p>
          <div className="modal-action justify-center">
            <button className="btn btn-primary w-72 max-w-full">Join</button>
          </div>
        </form>
        <form className="modal-backdrop" method="dialog">
          <button>close</button>
        </form>
      </dialog>

      <dialog className="modal" ref={qrCodeModalRef}>
        <div className="modal-box space-y-2">
          <h2 className="text-center text-lg font-bold">Link QR Code</h2>
          <div className="text-center">
            <span className="skeleton bg-base-200 inline-block h-72 w-72 max-w-full p-4">
              <p className="text-center">
                <TriangleAlertIcon className="inline-block size-8" /> <br />
                준비 중 입니다. <br />
                Preparing...
              </p>
            </span>
          </div>
          <p className="text-center text-sm text-gray-500">
            Scan QR code to join
          </p>
        </div>
        <form className="modal-backdrop" method="dialog">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
}
