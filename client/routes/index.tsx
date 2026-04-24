import { Card, CardBody } from "@/components/Card";
import { Portal } from "@/components/portal";
import { useAtom } from "@/lib/atom";
import { room } from "@/lib/room";
import { ROOM_ID_MIN_LENGTH, ROOM_ID_REGEX } from "@server/domain/constants";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const [error, setError] = useAtom(room.error);
  const [joinError, setJoinError] = useState("");
  const joinModalRef = useRef<HTMLDialogElement>(null);

  const handleJoinSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setJoinError("");

    const formData = new FormData(e.target);
    const roomId = formData.get("room-id")?.toString();
    if (!roomId) {
      setJoinError("Room ID is required");
      return;
    }
    if (roomId.length < ROOM_ID_MIN_LENGTH) {
      setJoinError(`Room ID is longer than ${ROOM_ID_MIN_LENGTH} characters`);
      return;
    }
    if (!ROOM_ID_REGEX.test(roomId)) {
      setJoinError("Room ID contains invalid characters");
      return;
    }
    e.target.reset();
    joinModalRef.current?.close();
    navigate({
      to: "/rooms/$roomId",
      params: {
        roomId,
      },
    });
  };

  const handleShareClick = async () => {
    setError("");
    setJoinError("");

    const roomId = await room.create();
    if (!roomId.data) {
      setError("Try again later");
      return;
    }

    navigate({
      to: "/rooms/$roomId",
      params: {
        roomId: roomId.data,
      },
    });
  };

  return (
    <Card>
      <CardBody className="gap-1">
        <h2 className="card-title justify-center">
          <span>Remote Control</span>
        </h2>
        <div className="text-center">
          {error ? <p className="text-error text-lg">{error}</p> : null}
        </div>
        <div className="text-center">
          <div className="join mt-1 w-72 max-w-full justify-center">
            <button
              className="btn btn-md btn-neutral join-item flex-1"
              onClick={() => joinModalRef.current?.showModal()}
            >
              JOIN
            </button>
            <button
              className="btn btn-md btn-primary join-item flex-1"
              onClick={handleShareClick}
            >
              SHARE
            </button>
          </div>
        </div>
      </CardBody>

      <Portal>
        <dialog className="modal" ref={joinModalRef}>
          <form
            className="modal-box space-y-2 text-center"
            method="dialog"
            onSubmit={handleJoinSubmit}
          >
            <h2 className="text-center text-lg font-bold">Remote Control</h2>
            <input
              className="input input-bordered input-lg w-72 max-w-full text-center text-3xl"
              type="text"
              name="room-id"
            />
            {joinError ? (
              <p className="text-error text-sm">{joinError}</p>
            ) : (
              <p className="text-base-content text-sm">Enter room ID to join</p>
            )}
            <div className="modal-action justify-center">
              <button className="btn btn-primary w-72 max-w-full">Join</button>
            </div>
          </form>
          <form
            className="modal-backdrop"
            method="dialog"
            onSubmit={() => setJoinError("")}
          >
            <button>close</button>
          </form>
        </dialog>
      </Portal>
    </Card>
  );
}
