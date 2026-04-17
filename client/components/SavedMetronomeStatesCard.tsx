import { STORAGE_KEYS } from "@/constants";
import { MetronomeState } from "@/hooks/metronome";
import { useState } from "react";
import { Card } from "./Card";

type Props = {
  state: MetronomeState;
  onLoad: (state: MetronomeState) => void;
  disabled?: boolean;
};

export function SavedMetronomeStatesCard(props: Props) {
  const { state, onLoad, disabled = false } = props;

  const [savedStates, setSavedStates] = useState<MetronomeState[]>(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.savedStates) ?? "[]"),
  );

  const handleSave = () => {
    const newSavedStates = [...savedStates, state];
    setSavedStates(newSavedStates);
    localStorage.setItem(
      STORAGE_KEYS.savedStates,
      JSON.stringify(newSavedStates),
    );
  };
  const handleDelete = (index: number) => {
    const newSavedStates = savedStates.toSpliced(index, 1);
    setSavedStates(newSavedStates);
    localStorage.setItem(
      STORAGE_KEYS.savedStates,
      JSON.stringify(newSavedStates),
    );
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-600">
          Saved States
        </span>
        <button
          className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleSave}
          disabled={disabled}
        >
          SAVE
        </button>
      </div>

      {savedStates.length === 0 ? (
        <p className="text-xs text-slate-500">
          No saved state yet. Press SAVE to store current settings.
        </p>
      ) : (
        <div>
          {savedStates.map((savedState, i) => (
            <div
              className="flex items-center gap-2 rounded-lg bg-slate-50 p-2"
              key={i}
            >
              <p className="space-y-0.5 text-xs text-slate-700">
                BPM <b>{savedState.bpm}</b> Beats <b>{savedState.beats}</b>
              </p>
              <div className="flex-1"></div>
              <button
                className="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => onLoad(savedState)}
                disabled={disabled}
              >
                LOAD
              </button>
              <button
                className="rounded-md bg-red-400 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => handleDelete(i)}
                disabled={disabled}
              >
                DELETE
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
