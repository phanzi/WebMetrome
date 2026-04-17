import { STORAGE_KEYS } from "@/constants";
import type { MetronomeState } from "@/hooks/metronome";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Card, CardBody } from "./Card";

type Props = {
  state: MetronomeState;
  onLoad: (state: MetronomeState) => void;
  disabled?: boolean;
  className?: string;
};

export function SavedMetronomeStatesCard(props: Props) {
  const { state, onLoad, disabled = false, className = "" } = props;

  const [savedStates, setSavedStates] = useLocalStorage<MetronomeState[]>(
    STORAGE_KEYS.savedStates,
    [],
  );

  const handleSave = () => {
    const newSavedStates = [...savedStates, state];
    setSavedStates(newSavedStates);
  };
  const handleDelete = (index: number) => {
    const newSavedStates = savedStates.toSpliced(index, 1);
    setSavedStates(newSavedStates);
  };

  return (
    <Card className={className}>
      <CardBody>
        <h2 className="card-title relative justify-center">Saved Settings</h2>

        {savedStates.length === 0 ? (
          <p className="text-center">
            Press <b>Save</b> to store current settings.
          </p>
        ) : (
          <div>
            {savedStates.map((savedState, i) => (
              <div
                className="border-base-200 flex items-center justify-between border-dashed px-2 py-3 not-first:border-t"
                key={i}
              >
                <p>
                  BPM <b>{savedState.bpm}</b> Beats <b>{savedState.beats}</b>
                </p>
                <div className="join">
                  <button
                    className="join-item btn btn-soft btn-sm btn-primary"
                    onClick={() => onLoad(savedState)}
                    disabled={disabled}
                  >
                    LOAD
                  </button>
                  <button
                    className="join-item btn btn-soft btn-sm btn-error"
                    onClick={() => handleDelete(i)}
                    disabled={disabled}
                  >
                    DEL
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="text-center">
          <button
            className="btn btn-soft btn-wide"
            onClick={handleSave}
            disabled={disabled}
          >
            SAVE
          </button>
        </div>
      </CardBody>
    </Card>
  );
}
