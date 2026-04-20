import { Card, CardBody } from "@/components/Card";
import { CopyButton } from "@/components/CopyButton";
import { QrcodeSvg } from "@/components/QrcodeSvg";
import { useAtom } from "@/lib/atom";
import { room } from "@/lib/room";
import { createFileRoute, Link } from "@tanstack/react-router";
import { QrCodeIcon } from "lucide-react";
import { useRef } from "react";

export const Route = createFileRoute("/rooms/$roomId")({
  loader: ({ params }) => room.join(params.roomId),
  staleTime: 0,
  gcTime: 0,
  component: RouteComponent,
  pendingComponent: PendingComponent,
  onError: () => Route.redirect({ to: "/", throw: true }),
  onLeave: () => room.leave(),
});

function PendingComponent() {
  return (
    <Card>
      <CardBody className="gap-1">
        <h2 className="card-title justify-center">
          <span>Remote Control</span>
        </h2>
        <div className="text-center">
          <input
            className="input input-ghost text-base-content h-12 text-center text-xl"
            type="text"
            defaultValue="Connecting..."
          />
        </div>
        <div className="text-center">
          <div className="join mt-1 w-72 max-w-full justify-center">
            <button
              className="btn btn-md btn-neutral join-item flex-1"
              disabled
            >
              JOIN
            </button>
            <button
              className="btn btn-md btn-primary join-item flex-1"
              disabled
            >
              SHARE
            </button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function RouteComponent() {
  const [error] = useAtom(room.error);
  const [role] = useAtom(room.role);
  const { roomId } = Route.useParams();

  const qrCodeModalRef = useRef<HTMLDialogElement>(null);

  return (
    <Card>
      <CardBody className="gap-1">
        <h2 className="card-title justify-center">
          <span>Remote Control</span>
          <div>
            (&nbsp;
            <span className="text-primary">
              {role === "owner" ? "HOST" : "MEMBER"}
            </span>
            &nbsp;)
          </div>
        </h2>
        <div className="text-center">
          {error ? <p className="text-error text-lg">{error}</p> : null}
          <input
            className="input input-ghost h-12 text-center text-4xl"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            defaultValue={roomId}
          />
        </div>
        <div className="text-center">
          <div className="join mt-2 w-72 max-w-full justify-center">
            <CopyButton content={roomId} />
            <Link className="join-item btn bg-base-100 text-md flex-2" to="/">
              EXIT
            </Link>
            <button
              className="join-item btn bg-base-100 flex-1"
              onClick={() => qrCodeModalRef.current?.showModal()}
            >
              <QrCodeIcon className="size-5" />
            </button>
          </div>
        </div>
      </CardBody>

      <dialog className="modal" id="qr-code-modal" ref={qrCodeModalRef}>
        <div className="modal-box space-y-2">
          <h2 className="text-center text-lg font-bold">Link QR Code</h2>
          <div className="text-center">
            <QrcodeSvg className="inline-block max-w-72" src={location.href} />
          </div>
          <p className="text-center text-sm text-gray-500">
            Scan QR code to join
          </p>
        </div>
        <form className="modal-backdrop" method="dialog">
          <button>close</button>
        </form>
      </dialog>
    </Card>
  );
}
