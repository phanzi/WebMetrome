/**
 * anchorAtMs: host-scheduled downbeat (beat 0) wall time (epoch ms).
 * recvWallMs: when this client received play-schedule (Date.now()).
 */
export function computeAlignedStart(params: {
  anchorAtMs: number;
  recvWallMs: number;
  bpm: number;
  beatsPerMeasure: number;
}): { startWallMs: number; initialBeatIndex: number } {
  const periodMs = 60000 / params.bpm;
  if (params.recvWallMs < params.anchorAtMs) {
    return { startWallMs: params.anchorAtMs, initialBeatIndex: 0 };
  }
  const delta = params.recvWallMs - params.anchorAtMs;
  const n = Math.ceil(delta / periodMs);
  const startWallMs = params.anchorAtMs + n * periodMs;
  const initialBeatIndex = n % params.beatsPerMeasure;
  return { startWallMs, initialBeatIndex };
}
