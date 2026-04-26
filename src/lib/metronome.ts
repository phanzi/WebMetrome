import { BEATS, BPM, OFFSET, PLAY_DELAY_MS, SUB_DIVISION } from "@/constants";
import { delay } from "es-toolkit";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { createStore } from "zustand/vanilla";
import { audio, BeapType } from "./audio";

type Option = {
  bpm: number;
  beats: number;
  subDivision: SubDivision;
};

export type SubDivision = (typeof SUB_DIVISION.S)[number];
export type MetronomeOption = Option;

type Store = {
  option: Option;
  saved: { name: string; option: Option }[];
  beatIndex: number;
  offset: number;
  isPlaying: boolean;
  actions: {
    resetOption: <K extends keyof Option>(key: K) => void;
    setOption: (parital: Partial<Option>) => void;
    saveOption: (name: string) => void;
    deleteOption: (index: number) => void;
  };
};

const store = createStore<Store>()(
  persist(
    immer((set, _get) => ({
      option: {
        bpm: BPM.DEFAULT,
        beats: BEATS.DEFAULT,
        subDivision: SUB_DIVISION.DEFAULT,
      },
      saved: [],
      beatIndex: -1,
      offset: OFFSET.DEFAULT,
      isPlaying: false,
      actions: {
        resetOption: (key) => {
          set((state) => {
            state.option[key] = store.getInitialState().option[key];
          });
        },
        setOption: (partial) => {
          set((state) => {
            state.option = { ...state.option, ...partial };
          });
        },
        saveOption: (name) => {
          set((state) => {
            state.saved.push({ name, option: state.option });
          });
        },
        deleteOption: (index) => {
          set((state) => {
            state.saved.splice(index, 1);
          });
        },
      },
    })),
    {
      version: 1,
      name: "metronome",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        option: state.option,
        savedOptions: state.saved,
      }),
    },
  ),
);

let _timer = -1;

function _scheduleBeat(ctx: AudioContext, beapType: BeapType, beatAt: number) {
  audio.schedule(ctx, beapType, beatAt + store.getState().offset / 1000);
}

function _scheduleNote(
  ctx: AudioContext,
  beapType: BeapType,
  noteAtSec: number,
) {
  const { subDivision, bpm } = store.getState().option;
  switch (subDivision) {
    case "quater":
      _scheduleBeat(ctx, beapType, noteAtSec);
      break;
    case "quavers":
      _scheduleBeat(ctx, beapType, noteAtSec);
      _scheduleBeat(ctx, "SUB", noteAtSec + 30 / bpm);
      break;
    case "triplet":
      _scheduleBeat(ctx, beapType, noteAtSec);
      _scheduleBeat(ctx, "SUB", noteAtSec + 20 / bpm);
      _scheduleBeat(ctx, "SUB", noteAtSec + 40 / bpm);
      break;
    case "semiquavers":
      _scheduleBeat(ctx, beapType, noteAtSec);
      _scheduleBeat(ctx, "SUB", noteAtSec + 15 / bpm);
      _scheduleBeat(ctx, "SUB", noteAtSec + 30 / bpm);
      _scheduleBeat(ctx, "SUB", noteAtSec + 45 / bpm);
      break;
  }
}

function _schedule(
  ctx: AudioContext,
  _nextNoteSec: number,
  _beatCounter: number,
) {
  // Look-ahead: 100ms 앞의 박자를 미리 예약
  while (_nextNoteSec < ctx.currentTime + 0.1) {
    _beatCounter++;
    const isFirstBeat = _beatCounter % store.getState().option.beats === 0;
    _scheduleNote(ctx, isFirstBeat ? "ACCENT" : "REGULAR", _nextNoteSec);

    const { bpm, beats } = store.getState().option;
    _nextNoteSec += 60 / bpm;
    store.setState({ beatIndex: _beatCounter % beats });
  }

  _timer = requestAnimationFrame(() =>
    _schedule(ctx, _nextNoteSec, _beatCounter),
  );
}

async function play(startedAt: number) {
  const ctx = await audio.resume();
  if (store.getState().isPlaying) return;
  store.setState({ isPlaying: true });

  const now = Date.now();
  const diffMs = now - startedAt;
  const bpmMs = 60_000 / store.getState().option.bpm;
  const _beatCounter = Math.floor((diffMs - PLAY_DELAY_MS) / bpmMs);
  const _nextNoteSec =
    ctx.currentTime +
    (PLAY_DELAY_MS + (_beatCounter + 1) * bpmMs - diffMs) / 1000;

  _schedule(ctx, _nextNoteSec, _beatCounter);
}

async function stop() {
  if (!store.getState().isPlaying) return;
  cancelAnimationFrame(_timer);
  await delay(100);
  await audio.suspend();
  store.setState({ beatIndex: -1, isPlaying: false });
}

export const metronome = {
  store,
  play,
  stop,
};
