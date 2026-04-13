import { treaty } from "@elysiajs/eden/treaty2";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import type { App } from "../server/app";

function apiOrigin(): string {
  return window?.location?.origin ?? "http://localhost:4000";
}

export default function App() {
  const [bpm, setBpm] = useState(
    () => Number(localStorage.getItem("ms-bpm")) || 120,
  );
  const [displayBpm, setDisplayBpm] = useState(bpm);
  const [offset, setOffset] = useState(
    () => Number(localStorage.getItem("ms-offset")) || 0,
  );
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(
    () => Number(localStorage.getItem("ms-beats")) || 4,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [isMaster, setIsMaster] = useState(true);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [syncReady, setSyncReady] = useState(false);

  const audioCtx = useRef<AudioContext | null>(null);
  const nextNoteTime = useRef(0);
  const timerID = useRef<number | null>(null);
  const bpmRef = useRef(bpm);
  const offsetRef = useRef(offset);
  const beatsRef = useRef(beatsPerMeasure);
  type SyncWs = ReturnType<ReturnType<typeof treaty<App>>["sync"]["subscribe"]>;
  const wsRef = useRef<SyncWs | null>(null);
  const syncReadyRef = useRef(false);
  const beatCounterRef = useRef(0);

  const startMetronomeRef = useRef<() => void>(() => {});
  const stopMetronomeRef = useRef<() => void>(() => {});
  const applyRemoteControlRef = useRef<
    (data: { bpm: number; beats: number; isPlaying: boolean }) => void
  >(() => {});

  useEffect(() => {
    bpmRef.current = bpm;
    localStorage.setItem("ms-bpm", bpm.toString());
  }, [bpm]);
  useEffect(() => {
    beatsRef.current = beatsPerMeasure;
    localStorage.setItem("ms-beats", beatsPerMeasure.toString());
  }, [beatsPerMeasure]);
  useEffect(() => {
    offsetRef.current = offset;
    localStorage.setItem("ms-offset", offset.toString());
  }, [offset]);

  const playSound = (time: number, isFirstBeat: boolean) => {
    if (!audioCtx.current) {
      return;
    }
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();

    osc.frequency.value = isFirstBeat ? 1600 : 800;
    const duration = isFirstBeat ? 0.12 : 0.06;

    const scheduledTime = time + offsetRef.current / 1000;

    gain.gain.setValueAtTime(1, scheduledTime);
    gain.gain.exponentialRampToValueAtTime(0.001, scheduledTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    osc.start(scheduledTime);
    osc.stop(scheduledTime + duration);
  };

  const scheduler = () => {
    if (!audioCtx.current) {
      return;
    }

    while (nextNoteTime.current < audioCtx.current.currentTime + 0.1) {
      const isFirstBeat = beatCounterRef.current % beatsRef.current === 0;
      playSound(nextNoteTime.current, isFirstBeat);

      const beatIndex = beatCounterRef.current % beatsRef.current;
      setCurrentBeat(beatIndex);

      nextNoteTime.current += 60.0 / bpmRef.current;
      beatCounterRef.current++;
    }
    timerID.current = requestAnimationFrame(scheduler);
  };

  const startMetronome = () => {
    if (!audioCtx.current) {
      const AC =
        window.AudioContext ??
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;
      if (!AC) {
        return;
      }
      audioCtx.current = new AC();
    }
    if (audioCtx.current.state === "suspended") {
      audioCtx.current.resume();
    }

    beatCounterRef.current = 0;
    nextNoteTime.current = audioCtx.current.currentTime + 0.05;
    setIsPlaying(true);
    scheduler();
  };

  const stopMetronome = () => {
    if (timerID.current) {
      cancelAnimationFrame(timerID.current);
    }
    setIsPlaying(false);
    setCurrentBeat(0);
  };

  useEffect(() => {
    startMetronomeRef.current = () => {
      startMetronome();
    };
    stopMetronomeRef.current = () => {
      stopMetronome();
    };
  });

  useEffect(() => {
    applyRemoteControlRef.current = (data) => {
      setIsMaster((prevMaster) => {
        if (!prevMaster) {
          setBpm(data.bpm);
          setDisplayBpm(data.bpm);
          setBeatsPerMeasure(data.beats);
          if (data.isPlaying) {
            startMetronomeRef.current();
          } else {
            stopMetronomeRef.current();
          }
        }
        return prevMaster;
      });
    };
  });

  useEffect(() => {
    const api = treaty<App>(apiOrigin());
    const client = api.sync.subscribe();

    client.on("open", () => {
      syncReadyRef.current = true;
      setSyncReady(true);
    });

    client.subscribe((event) => {
      applyRemoteControlRef.current(event.data);
    });

    wsRef.current = client;

    return () => {
      syncReadyRef.current = false;
      setSyncReady(false);
      client.close();
      wsRef.current = null;
    };
  }, []);

  const sendJoin = (code: string) => {
    const c = wsRef.current;
    if (!c) {
      return;
    }
    const sendJoinNow = () => {
      c.send({ type: "join", roomId: code.toUpperCase() });
    };
    if (syncReadyRef.current) {
      sendJoinNow();
    } else {
      c.on("open", sendJoinNow);
    }
  };

  useEffect(() => {
    if (!syncReady || !isLive || !isMaster || !roomId) {
      return;
    }
    const c = wsRef.current;
    if (!c) {
      return;
    }
    c.send({
      type: "control",
      roomId,
      bpm,
      beats: beatsPerMeasure,
      isPlaying,
    });
  }, [syncReady, bpm, beatsPerMeasure, isPlaying, isLive, isMaster, roomId]);

  const toggleMetronome = () => {
    if (isLive && !isMaster) {
      return;
    }
    if (isPlaying) {
      stopMetronome();
    } else {
      startMetronome();
    }
  };

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
        <h1 style={{ fontSize: "1.2rem", margin: 0 }}>🥁 Sync Metronome</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          {!isLive ? (
            <>
              <button
                onClick={() => {
                  const code = prompt("방 코드 입력:");
                  if (code) {
                    const upper = code.toUpperCase();
                    setRoomId(upper);
                    setIsLive(true);
                    setIsMaster(false);
                    sendJoin(upper);
                  }
                }}
                style={{ ...styles.shareBtn, backgroundColor: "#34495e" }}
              >
                JOIN
              </button>
              <button
                onClick={() => {
                  const newId = Math.random()
                    .toString(36)
                    .substring(2, 7)
                    .toUpperCase();
                  setRoomId(newId);
                  setIsLive(true);
                  setIsMaster(true);
                  sendJoin(newId);
                }}
                style={styles.shareBtn}
              >
                SHARE
              </button>
            </>
          ) : (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div style={styles.liveBadge}>
                {isMaster ? "HOST" : "MEMBER"}: {roomId}
              </div>
              <button
                onClick={() => {
                  setIsLive(false);
                  stopMetronome();
                }}
                style={styles.exitBtn}
              >
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
            disabled={isLive && !isMaster}
            onChange={(e) => setDisplayBpm(Number(e.target.value))}
            onBlur={() => {
              const v = Math.max(20, Math.min(300, displayBpm));
              setBpm(v);
              setDisplayBpm(v);
            }}
            style={styles.numInput}
          />
        </div>
        <input
          type="range"
          min="20"
          max="300"
          value={displayBpm}
          disabled={isLive && !isMaster}
          onChange={(e) => setDisplayBpm(Number(e.target.value))}
          onMouseUp={(e) => {
            const v = Number((e.target as HTMLInputElement).value);
            setBpm(v);
            setDisplayBpm(v);
          }}
          style={{ width: "100%", marginTop: "10px" }}
        />
      </div>

      <div style={styles.card}>
        <p style={styles.label}>
          박자 (Beats): <b>{beatsPerMeasure}</b>
        </p>
        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
          {[2, 3, 4, 6, 8].map((b) => (
            <button
              key={b}
              onClick={() => setBeatsPerMeasure(b)}
              disabled={isLive && !isMaster}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: "8px",
                border: "1px solid #ddd",
                backgroundColor: beatsPerMeasure === b ? "#3498db" : "#fff",
                color: beatsPerMeasure === b ? "#fff" : "#333",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {b}
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
          onChange={(e) => setOffset(Number(e.target.value))}
          style={{ width: "100%", marginTop: "10px" }}
        />
        <p style={{ fontSize: "0.7rem", color: "#888", marginTop: "6px" }}>
          소리가 화면보다 늦게 들릴 때 값을 높여서 맞추세요.
        </p>
      </div>

      <button
        onClick={toggleMetronome}
        disabled={isLive && !isMaster}
        style={{
          ...styles.mainBtn,
          backgroundColor: isPlaying ? "#e74c3c" : "#3498db",
          opacity: isLive && !isMaster ? 0.6 : 1,
        }}
      >
        {isPlaying ? "STOP" : isLive && !isMaster ? "WAITING..." : "START"}
      </button>
    </div>
  );
}

const styles: { [key: string]: CSSProperties } = {
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
