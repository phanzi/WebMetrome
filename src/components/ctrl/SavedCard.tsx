import { metronome, type MetronomeOption } from "@/lib/metronome";
import { cn } from "@/lib/utils";
import { InfoIcon } from "lucide-react";
import { useStore } from "zustand";
import { Card, CardBody } from "../Card";
import { NoteIcon } from "../NoteIcon";
import { Portal } from "../Portal";

type Props = {
  onLoad: (options: MetronomeOption) => void;
  disabled?: boolean;
  className?: string;
};

export function SavedCard(props: Props) {
  const { onLoad, disabled = false, className = "" } = props;

  const saved = useStore(metronome.store, (store) => store.saved);
  const actions = useStore(metronome.store, (store) => store.actions);

  const handleSaveSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const name = formData.get("state-name")?.toString() ?? "";
    e.currentTarget.reset();
    actions.saveOption(name);
  };

  return (
    <Card className={className}>
      <CardBody className="gap-0">
        <div className="card-title mb-1 px-2">
          {/* 좌우 공백 조정을 위한 빈 버튼 */}
          <div className="btn btn-ghost btn-sm btn-square">
            {/* <SettingsIcon className="size-5" /> */}
          </div>
          <h2 className="flex-1 text-center">Saved Settings</h2>
          <button
            className="btn btn-ghost btn-square btn-sm tooltip max-md:tooltip-left"
            data-tip="BPM / Beats / Sub Division"
          >
            <span className="sr-only">BPM / Beats / Sub Division</span>
            <InfoIcon className="size-5" />
          </button>
        </div>

        {saved.length === 0 ? (
          <p className="text-center">
            Press <b>Save</b> to store current settings.
          </p>
        ) : (
          <div>
            {saved.map((saved, i) => (
              <div className="flex w-full gap-2 border-dashed py-1" key={i}>
                <button
                  className="btn btn-soft btn-error max-w-14 flex-1"
                  onClick={() => actions.deleteOption(i)}
                  disabled={disabled}
                >
                  DEL
                </button>
                <button
                  className="btn btn-soft btn-primary flex-1 justify-between font-normal"
                  onClick={() => onLoad(saved.option)}
                  disabled={disabled}
                >
                  <span className="w-0 grow truncate">
                    {saved.name || "Unnamed"}
                  </span>
                  <div className="flex h-full items-center gap-1">
                    <b className="text-lg">{saved.option.bpm}</b> /
                    <b className="text-lg">{saved.option.beats}</b> /
                    <NoteIcon
                      className="h-full"
                      type={saved.option.subDivision}
                    />
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 text-center">
          <button
            className={cn(
              "btn btn-soft motion-safe:transition-all motion-safe:duration-500",
              saved.length > 0 ? "w-full max-w-full" : "btn-wide",
            )}
            command="show-modal"
            commandfor="save-modal"
            disabled={disabled}
          >
            SAVE
          </button>
        </div>
      </CardBody>

      <Portal>
        <dialog className="modal" id="save-modal">
          <form
            className="modal-box space-y-2 text-center"
            method="dialog"
            onSubmit={handleSaveSubmit}
          >
            <h2 className="text-center text-lg font-bold">Save State</h2>
            <input
              className="input input-bordered input-lg w-72 max-w-full text-center text-xl"
              autoComplete="off"
              type="text"
              name="state-name"
            />
            <p className="text-base-content text-sm">
              Enter state name to save
            </p>
            <div className="modal-action justify-center">
              <button className="btn btn-primary w-72 max-w-full">SAVE</button>
            </div>
          </form>
          <form className="modal-backdrop" method="dialog">
            <button>close</button>
          </form>
        </dialog>
      </Portal>
    </Card>
  );
}
