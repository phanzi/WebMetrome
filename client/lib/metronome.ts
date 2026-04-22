import {
  DEFAULT_BEATS,
  DEFAULT_BPM,
  DEFAULT_SUB_DIVISION,
  STORAGE_KEYS,
} from "@/constants";
import { atom, toPersisted } from "./atom";
import { getAudioContext, scheduleSound, SOUND_PRESETS } from "./sound";

export type MetronomeState = {
  bpm: number;
  beats: number;
};

const bpm = toPersisted(STORAGE_KEYS.bpm, atom(DEFAULT_BPM));
const beats = toPersisted(STORAGE_KEYS.beats, atom(DEFAULT_BEATS));
const subDivision = toPersisted(
  STORAGE_KEYS.subDivision,
  atom<"quater" | "quavers" | "triplet" | "semiquavers">(DEFAULT_SUB_DIVISION),
);
const beatIndex = atom(-1);
const offset = toPersisted(STORAGE_KEYS.offset, atom(0));
const isPlaying = atom(false);

let _nextNoteSec = 0;
let _beatCounter = -1;
let _timer = -1;

function _scheduleBeat(
  ctx: AudioContext,
  presetKey: keyof typeof SOUND_PRESETS,
  beatAt: number,
) {
  scheduleSound(ctx, presetKey, beatAt + offset.get() / 1000);
}

function _scheduleNote(
  ctx: AudioContext,
  presetKey: keyof typeof SOUND_PRESETS,
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
  const ctx = await getAudioContext();
  if (isPlaying.get()) return;
  isPlaying.set(true);

  const now = Date.now();
  const diffMs = now - startedAt;
  const bpmMs = 60_000 / bpm.get();
  _beatCounter = Math.floor((diffMs - 50) / bpmMs);
  _nextNoteSec = (50 + (_beatCounter + 1) * bpmMs - diffMs) / 1000;

  _nextNoteSec += ctx.currentTime;
  _schedule(ctx);
}

async function stop() {
  if (!isPlaying.get()) return;
  const ctx = await getAudioContext();
  ctx.suspend();
  cancelAnimationFrame(_timer);
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
