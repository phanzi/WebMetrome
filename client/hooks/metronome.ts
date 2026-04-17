import { DEFAULT_BEATS, DEFAULT_BPM, STORAGE_KEYS } from "@/constants";
import { getAudioContext, scheduleSound } from "@/lib/utils";
import { room } from "./room";
import { atom, toPersisted } from "./useAtom";

export type MetronomeState = {
  bpm: number;
  beats: number;
};

const bpm = toPersisted(STORAGE_KEYS.bpm, atom(DEFAULT_BPM));
const beats = toPersisted(STORAGE_KEYS.beats, atom(DEFAULT_BEATS));
const beatIndex = atom(-1);
const offset = toPersisted(STORAGE_KEYS.offset, atom(0));
const isPlaying = atom(false);

let _nextNoteSec = 0;
let _beatCounter = -1;
let _timer = -1;

function _schedule(ctx: AudioContext) {
  // Look-ahead: 100ms 앞의 박자를 미리 예약
  while (_nextNoteSec < ctx.currentTime + 0.1) {
    _beatCounter++;
    const isFirstBeat = _beatCounter % beats.get() === 0;
    scheduleSound(
      ctx,
      isFirstBeat ? "ACCENT" : "REGULAR",
      _nextNoteSec + offset.get() / 1000,
    );

    _nextNoteSec += 60.0 / bpm.get();
    beatIndex.set(_beatCounter % beats.get());
  }

  _timer = requestAnimationFrame(() => _schedule(ctx));
}

function play(startedAt: number = Date.now()) {
  room.send({
    type: "play-schedule",
    payload: {
      at: startedAt,
    },
  });
  isPlaying.set(true);
  const diffMs = Math.min(0, Date.now() - startedAt);
  if (diffMs < 50) {
    _beatCounter = -1;
    _nextNoteSec = (50 - diffMs) / 1000;
  } else {
    const bpmMs = 60_000 / bpm.get();
    _beatCounter = Math.floor((diffMs - 50) / bpmMs);
    _nextNoteSec = 50 + (_beatCounter + 1) * bpmMs - diffMs;
  }

  const ctx = getAudioContext();
  _schedule(ctx);
}

function stop() {
  room.send({
    type: "play-halt",
  });
  cancelAnimationFrame(_timer);
  beatIndex.set(-1);
  isPlaying.set(false);
}

export const metronome = {
  bpm,
  beats,
  beatIndex,
  offset,
  isPlaying,
  play,
  stop,
};

bpm.subscribe(() => {
  room.send({
    type: "set-metronome",
    payload: {
      bpm: bpm.get(),
      beats: beats.get(),
    },
  });
});
beats.subscribe(() => {
  room.send({
    type: "set-metronome",
    payload: {
      bpm: bpm.get(),
      beats: beats.get(),
    },
  });
});
