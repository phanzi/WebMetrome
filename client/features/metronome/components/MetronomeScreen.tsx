import type { CSSProperties } from "react";
import { ALLOWED_BEATS, MAX_BPM, MIN_BPM } from "../domain/constants";
import { clampBpm } from "../domain/guards";

type Props = {
  bpm: number;
  displayBpm: number;
  offset: number;
  beatsPerMeasure: number;
  isPlaying: boolean;
  currentBeat: number;
  canControl: boolean;
  isLive: boolean;
  isMaster: boolean;
  roomId: string | null;
  onDisplayBpmChange: (value: number) => void;
  onCommitBpm: (value: number) => void;
  onOffsetChange: (value: number) => void;
  onBeatsChange: (value: number) => void;
  onToggleMetronome: () => void;
  onJoinRoom: () => void;
  onCreateRoom: () => void;
  onExitRoom: () => void;
};

export function MetronomeScreen(props: Props) {
  const {
    bpm,
    displayBpm,
    offset,
    beatsPerMeasure,
    isPlaying,
    currentBeat,
    canControl,
    isLive,
    isMaster,
    roomId,
    onDisplayBpmChange,
    onCommitBpm,
    onOffsetChange,
    onBeatsChange,
    onToggleMetronome,
    onJoinRoom,
    onCreateRoom,
    onExitRoom,
  } = props;

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes beatPulse {
          0% { transform: scale(1.3); box-shadow: 0 0 20px rgba(76, 175, 80, 0.9); }
          100% { transform: scale(1); box-shadow: none; }
        }
        .beat-animated { animation: beatPulse ${60 / bpm}s cubic-bezier(0, 0, 0.2, 1); }
      `}</style>

      <header style={styles.header}>
        <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Sync Metronome</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          {!isLive ? (
            <>
              <button
                onClick={onJoinRoom}
                style={{ ...styles.shareBtn, backgroundColor: "#34495e" }}
              >
                JOIN
              </button>
              <button onClick={onCreateRoom} style={styles.shareBtn}>
                SHARE
              </button>
            </>
          ) : (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div style={styles.liveBadge}>
                {isMaster ? "HOST" : "MEMBER"}: {roomId}
              </div>
              <button onClick={onExitRoom} style={styles.exitBtn}>
                EXIT
              </button>
            </div>
          )}
        </div>
      </header>

      <div style={styles.visualizer}>
        {Array.from({ length: beatsPerMeasure }).map((_, i) => (
          <div
            className={isPlaying && currentBeat === i ? "beat-animated" : ""}
            key={i}
            style={{
              ...styles.beatCircle,
              width: i === 0 ? "55px" : "38px",
              height: i === 0 ? "55px" : "38px",
              backgroundColor:
                isPlaying && currentBeat === i
                  ? i === 0
                    ? "#e67e22"
                    : "#2ecc71"
                  : "#34495e",
              border: i === 0 ? "2px solid #fff" : "none",
              fontSize: i === 0 ? "1.2rem" : "0.9rem",
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>

      <div style={styles.card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={styles.label}>
            BPM: <b>{displayBpm}</b>
          </span>
          <input
            type="number"
            value={displayBpm}
            disabled={!canControl}
            onChange={(e) => onDisplayBpmChange(Number(e.target.value))}
            onBlur={() => {
              onCommitBpm(clampBpm(displayBpm));
            }}
            style={styles.numInput}
          />
        </div>
        <input
          type="range"
          min={MIN_BPM}
          max={MAX_BPM}
          value={displayBpm}
          disabled={!canControl}
          onChange={(e) => onDisplayBpmChange(Number(e.target.value))}
          onMouseUp={(e) => {
            const nextBpm = Number((e.target as HTMLInputElement).value);
            onCommitBpm(nextBpm);
          }}
          style={{ width: "100%", marginTop: "10px" }}
        />
      </div>

      <div style={styles.card}>
        <p style={styles.label}>
          박자 (Beats): <b>{beatsPerMeasure}</b>
        </p>
        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
          {ALLOWED_BEATS.map((beats) => (
            <button
              key={beats}
              onClick={() => onBeatsChange(beats)}
              disabled={!canControl}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: "8px",
                border: "1px solid #ddd",
                backgroundColor: beatsPerMeasure === beats ? "#3498db" : "#fff",
                color: beatsPerMeasure === beats ? "#fff" : "#333",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {beats}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          ...styles.card,
          backgroundColor: "#fffbe6",
          border: "1px solid #ffe58f",
        }}
      >
        <p style={styles.label}>
          지연 보정 (Latency Offset): <b>{offset}ms</b>
        </p>
        <input
          type="range"
          min="0"
          max="500"
          value={offset}
          onChange={(e) => onOffsetChange(Number(e.target.value))}
          style={{ width: "100%", marginTop: "10px" }}
        />
        <p style={{ fontSize: "0.7rem", color: "#888", marginTop: "6px" }}>
          소리가 화면보다 늦게 들릴 때 값을 높여서 맞추세요.
        </p>
      </div>

      <button
        onClick={onToggleMetronome}
        disabled={!canControl}
        style={{
          ...styles.mainBtn,
          backgroundColor: isPlaying ? "#e74c3c" : "#3498db",
          opacity: canControl ? 1 : 0.6,
        }}
      >
        {isPlaying ? "STOP" : !canControl ? "WAITING..." : "START"}
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    padding: "20px",
    maxWidth: "420px",
    margin: "0 auto",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  shareBtn: {
    padding: "8px 14px",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: "bold",
    backgroundColor: "#9b59b6",
  },
  exitBtn: {
    padding: "6px 10px",
    backgroundColor: "#e74c3c",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  liveBadge: {
    padding: "6px 12px",
    backgroundColor: "#2ecc71",
    color: "#fff",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: "bold",
  },
  visualizer: {
    display: "flex",
    gap: "8px",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "110px",
    background: "#f0f2f5",
    borderRadius: "25px",
    marginBottom: "15px",
    border: "1px solid #e0e0e0",
  },
  beatCircle: {
    borderRadius: "50%",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    transition: "background-color 0.1s",
  },
  card: {
    background: "#fff",
    padding: "15px",
    borderRadius: "18px",
    marginBottom: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },
  label: { fontSize: "0.9rem", color: "#555", margin: 0, fontWeight: "600" },
  numInput: {
    padding: "6px",
    width: "65px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    textAlign: "center",
    fontWeight: "bold",
  },
  mainBtn: {
    width: "100%",
    padding: "20px",
    borderRadius: "40px",
    border: "none",
    color: "#fff",
    fontSize: "1.4rem",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "10px",
    transition: "all 0.2s",
  },
};
