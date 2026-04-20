import { STORAGE_KEYS } from "@/constants";
import { atom, toPersisted, useAtom } from "@/lib/atom";
import type { MetronomeState } from "@/lib/metronome";
import { cn } from "@/lib/utils";
import { InfoIcon } from "lucide-react";
import { useRef } from "react";
import { Card, CardBody } from "./Card";

type Props = {
  state: MetronomeState;
  onLoad: (state: MetronomeState) => void;
  disabled?: boolean;
  className?: string;
};

type SavedState = MetronomeState & {
  name: string;
};

const savedStatesAtom = toPersisted(
  STORAGE_KEYS.savedStates,
  atom<SavedState[]>([]),
);

export function SavedMetronomeStatesCard(props: Props) {
  const { state, onLoad, disabled = false, className = "" } = props;

  const [savedStates, setSavedStates] = useAtom(savedStatesAtom);
  const saveModal = useRef<HTMLDialogElement>(null);

  const handleDelete = (index: number) => {
    const newSavedStates = savedStates.toSpliced(index, 1);
    setSavedStates(newSavedStates);
  };

  const handleSaveSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const name = formData.get("state-name")?.toString() ?? "";
    e.currentTarget.reset();
    setSavedStates((prev) => [...prev, { ...state, name }]);
  };

  return (
    <Card className={className}>
      <CardBody className="gap-0">
        <div className="card-title mb-1 px-2">
          <button className="btn btn-ghost btn-sm btn-square">
            {/* <SettingsIcon className="size-5" /> */}
          </button>
          <h2 className="flex-1 text-center">Saved Settings</h2>
          <div className="tooltip">
            <div className="tooltip-content p-0">
              <div className="bg-neutral rounded-full p-1 px-2 [@media(max-width:28rem)]:-translate-x-2">
                BPM / Beats
              </div>
            </div>
            <button className="btn btn-ghost btn-square btn-sm">
              <InfoIcon className="size-5" />
            </button>
          </div>
        </div>

        {savedStates.length === 0 ? (
          <p className="text-center">
            Press <b>Save</b> to store current settings.
          </p>
        ) : (
          <div>
            {savedStates.map((savedState, i) => (
              <div className="flex w-full gap-2 border-dashed py-1" key={i}>
                <button
                  className="btn btn-soft btn-error max-w-14 flex-1"
                  onClick={() => handleDelete(i)}
                  disabled={disabled}
                >
                  DEL
                </button>
                <button
                  className="btn btn-soft btn-primary flex-1 justify-between font-normal"
                  onClick={() => onLoad(savedState)}
                  disabled={disabled}
                >
                  <span className="w-0 grow truncate">
                    {savedState.name || "Unnamed"}
                  </span>
                  <span>
                    <b className="text-lg">{savedState.bpm}</b> /{" "}
                    <b className="text-lg">{savedState.beats}</b>
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 text-center">
          <button
            className={cn(
              "btn btn-soft transition-all duration-500",
              savedStates.length > 0 ? "w-full max-w-full" : "btn-wide",
            )}
            onClick={() => saveModal.current?.showModal()}
            disabled={disabled}
          >
            SAVE
          </button>
        </div>
      </CardBody>

      <dialog className="modal" ref={saveModal}>
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
          <p className="text-base-content text-sm">Enter state name to save</p>
          <div className="modal-action justify-center">
            <button className="btn btn-primary w-72 max-w-full">SAVE</button>
          </div>
        </form>
        <form className="modal-backdrop" method="dialog">
          <button>close</button>
        </form>
      </dialog>
    </Card>
  );
}
