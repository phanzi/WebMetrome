import { Card, CardBody } from "@/components/Card";
import { QrcodeImg } from "@/components/QrcodeSvg";
import { Portal } from "@/components/portal";
import { InjectSwapActive } from "@/components/swap";
import { useAtom } from "@/lib/atom";
import { room } from "@/lib/room";
import { getRouter } from "@/router";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckIcon, CopyIcon, QrCodeIcon } from "lucide-react";
import { useRef } from "react";

export const Route = createFileRoute("/rooms/$roomId")({
  loader: async ({ params }) => {
    return await room.join(params.roomId, () => {
      getRouter().navigate({ to: "/", replace: true });
    });
  },
  staleTime: 0,
  gcTime: 0,
  component: RouteComponent,
  pendingComponent: PendingComponent,
  pendingMs: 0,
  onError: () => Route.redirect({ to: "/", throw: true }),
  onLeave: ({ loaderData: leave }) => leave?.(),
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
            <InjectSwapActive>
              <button
                className="join-item btn bg-base-100 swap flex-1"
                onClick={() => navigator.clipboard.writeText(roomId)}
              >
                <CopyIcon className="swap-off size-5" />
                <CheckIcon className="swap-on size-5" />
              </button>
            </InjectSwapActive>
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

      <Portal>
        <dialog className="modal" id="qr-code-modal" ref={qrCodeModalRef}>
          <div className="modal-box space-y-2">
            <h2 className="text-center text-lg font-bold">Link QR Code</h2>
            <div className="text-center">
              <QrcodeImg
                className="inline-block max-w-72"
                src={location.href}
              />
            </div>
            <p className="text-center text-sm text-gray-500">
              Scan QR code to join
            </p>
          </div>
          <form className="modal-backdrop" method="dialog">
            <button>close</button>
          </form>
        </dialog>
      </Portal>
    </Card>
  );
}
