import { BEATS, BPM, OFFSET, PLAY_DELAY_MS, SUB_DIVISION } from "@/constants";
import { delay } from "es-toolkit";
import { atom, toPersisted } from "./atom";
import { audio } from "./audio";

export type SubDivision = (typeof SUB_DIVISION.S)[number];

export type MetronomeState = {
  bpm: number;
  beats: number;
  subDivision: SubDivision;
};

const bpm = toPersisted(BPM.PERSIST_KEY, atom(BPM.DEFAULT));
const beats = toPersisted(BEATS.PERSIST_KEY, atom(BEATS.DEFAULT));
const subDivision = toPersisted(
  SUB_DIVISION.PERSIST_KEY,
  atom<SubDivision>(SUB_DIVISION.DEFAULT),
);
const beatIndex = atom(-1);
const offset = toPersisted(OFFSET.PERSIST_KEY, atom(OFFSET.DEFAULT));
const isPlaying = atom(false);

let _nextNoteSec = 0;
let _beatCounter = -1;
let _timer = -1;

function _scheduleBeat(
  ctx: AudioContext,
  presetKey: keyof typeof audio.PRESETS,
  beatAt: number,
) {
  audio.schedule(ctx, presetKey, beatAt + offset.get() / 1000);
}

function _scheduleNote(
  ctx: AudioContext,
  presetKey: keyof typeof audio.PRESETS,
  noteAtSec: number,
) {
  switch (subDivision.get()) {
    case "quater":
      _scheduleBeat(ctx, presetKey, noteAtSec);
      break;
    case "quavers":
      _scheduleBeat(ctx, presetKey, noteAtSec);
      _scheduleBeat(ctx, "SUB", noteAtSec + 30 / bpm.get());
      break;
    case "triplet":
      _scheduleBeat(ctx, presetKey, noteAtSec);
      _scheduleBeat(ctx, "SUB", noteAtSec + 20 / bpm.get());
      _scheduleBeat(ctx, "SUB", noteAtSec + 40 / bpm.get());
      break;
    case "semiquavers":
      _scheduleBeat(ctx, presetKey, noteAtSec);
      _scheduleBeat(ctx, "SUB", noteAtSec + 15 / bpm.get());
      _scheduleBeat(ctx, "SUB", noteAtSec + 30 / bpm.get());
      _scheduleBeat(ctx, "SUB", noteAtSec + 45 / bpm.get());
      break;
  }
}

function _schedule(ctx: AudioContext) {
  // Look-ahead: 100ms 앞의 박자를 미리 예약
  while (_nextNoteSec < ctx.currentTime + 0.1) {
    _beatCounter++;
    const isFirstBeat = _beatCounter % beats.get() === 0;
    _scheduleNote(ctx, isFirstBeat ? "ACCENT" : "REGULAR", _nextNoteSec);

    _nextNoteSec += 60 / bpm.get();
    beatIndex.set(_beatCounter % beats.get());
  }

  _timer = requestAnimationFrame(() => _schedule(ctx));
}

async function play(startedAt: number) {
  const ctx = await audio.resume();
  if (isPlaying.get()) return;
  isPlaying.set(true);

  const now = Date.now();
  const diffMs = now - startedAt;
  const bpmMs = 60_000 / bpm.get();
  _beatCounter = Math.floor((diffMs - PLAY_DELAY_MS) / bpmMs);
  _nextNoteSec = (PLAY_DELAY_MS + (_beatCounter + 1) * bpmMs - diffMs) / 1000;

  _nextNoteSec += ctx.currentTime;
  _schedule(ctx);
}

async function stop() {
  if (!isPlaying.get()) return;
  cancelAnimationFrame(_timer);
  await delay(100);
  await audio.suspend();
  beatIndex.set(-1);
  isPlaying.set(false);
}

export const metronome = {
  bpm,
  beats,
  subDivision,
  beatIndex,
  offset,
  isPlaying,
  play,
  stop,
};
