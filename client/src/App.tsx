import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Preset {
  id: string;
  name: string;
  bpm: number;
  beats: number;
}

const SERVER_URL = 'http://10.225.167.115:4000';

export default function App() {
  const [bpm, setBpm] = useState(() => Number(localStorage.getItem('ms-bpm')) || 120);
  const [displayBpm, setDisplayBpm] = useState(bpm);
  const [offset, setOffset] = useState(() => Number(localStorage.getItem('ms-offset')) || 0);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(() => Number(localStorage.getItem('ms-beats')) || 4);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);

  // 프리셋 상태
  const [presets, setPresets] = useState<Preset[]>(() => {
    const saved = localStorage.getItem('ms-presets');
    return saved ? JSON.parse(saved) : [];
  });

  const [isLive, setIsLive] = useState(false);
  const [isMaster, setIsMaster] = useState(true);
  const [roomId, setRoomId] = useState<string | null>(null);

  const audioCtx = useRef<AudioContext | null>(null);
  const nextNoteTime = useRef(0);
  const timerID = useRef<number | null>(null);
  const bpmRef = useRef(bpm);
  const offsetRef = useRef(offset);
  const beatsRef = useRef(beatsPerMeasure);
  const socketRef = useRef<Socket | null>(null);
  const beatCounterRef = useRef(0);

  useEffect(() => { bpmRef.current = bpm; localStorage.setItem('ms-bpm', bpm.toString()); }, [bpm]);
  useEffect(() => { beatsRef.current = beatsPerMeasure; localStorage.setItem('ms-beats', beatsPerMeasure.toString()); }, [beatsPerMeasure]);
  useEffect(() => { offsetRef.current = offset; localStorage.setItem('ms-offset', offset.toString()); }, [offset]);
  useEffect(() => { localStorage.setItem('ms-presets', JSON.stringify(presets)); }, [presets]);

  const playSound = (time: number, isFirstBeat: boolean) => {
    if (!audioCtx.current) return;
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    osc.frequency.value = isFirstBeat ? 1600 : 800;
    const duration = isFirstBeat ? 0.12 : 0.06;
    const scheduledTime = time + (offsetRef.current / 1000);

    gain.gain.setValueAtTime(1, scheduledTime);
    gain.gain.exponentialRampToValueAtTime(0.001, scheduledTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    osc.start(scheduledTime);
    osc.stop(scheduledTime + duration);
  };

  const scheduler = () => {
    if (!audioCtx.current) return;
    while (nextNoteTime.current < audioCtx.current.currentTime + 0.1) {
      const isFirstBeat = beatCounterRef.current % beatsRef.current === 0;
      playSound(nextNoteTime.current, isFirstBeat);
      setCurrentBeat(beatCounterRef.current % beatsRef.current);
      nextNoteTime.current += 60.0 / bpmRef.current;
      beatCounterRef.current++;
    }
    timerID.current = requestAnimationFrame(scheduler);
  };

  const startMetronome = () => {
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
    beatCounterRef.current = 0;
    nextNoteTime.current = audioCtx.current.currentTime + 0.05;
    setIsPlaying(true);
    scheduler();
  };

  const stopMetronome = () => {
    if (timerID.current) cancelAnimationFrame(timerID.current);
    setIsPlaying(false);
    setCurrentBeat(0);
  };

  const toggleMetronome = () => {
    if (isLive && !isMaster) return;
    isPlaying ? stopMetronome() : startMetronome();
  };

  // 프리셋 추가
  const addPreset = () => {
    const name = prompt('곡 제목을 입력하세요:');
    if (!name) return;
    const newPreset: Preset = { id: Date.now().toString(), name, bpm, beats: beatsPerMeasure };
    setPresets([...presets, newPreset]);
  };

  const loadPreset = (p: Preset) => {
    setBpm(p.bpm);
    setDisplayBpm(p.bpm);
    setBeatsPerMeasure(p.beats);
  };

  const deletePreset = (id: string) => {
    setPresets(presets.filter(p => p.id !== id));
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
        <h1 style={{ fontSize: '1.2rem', margin: 0 }}>🥁 Sync Metronome</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {!isLive ? (
            <button onClick={() => {
              const newId = Math.random().toString(36).substring(2, 7).toUpperCase();
              setRoomId(newId); setIsLive(true); setIsMaster(true);
            }} style={styles.shareBtn}>SHARE</button>
          ) : (
            <button onClick={() => setIsLive(false)} style={styles.exitBtn}>EXIT</button>
          )}
        </div>
      </header>

      <div style={styles.visualizer}>
        {Array.from({ length: beatsPerMeasure }).map((_, i) => (
          <div key={i} className={isPlaying && currentBeat === i ? 'beat-animated' : ''}
            style={{ 
              ...styles.beatCircle, 
              width: i === 0 ? '55px' : '38px', height: i === 0 ? '55px' : '38px',
              backgroundColor: isPlaying && currentBeat === i ? (i === 0 ? '#e67e22' : '#2ecc71') : '#34495e',
            }}>
            {i + 1}
          </div>
        ))}
      </div>

      {/* BPM 설정 */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={styles.label}>BPM: <b>{displayBpm}</b></span>
          <input type="number" value={displayBpm} onChange={(e) => setDisplayBpm(Number(e.target.value))}
            onBlur={() => { const v = Math.max(20, Math.min(300, displayBpm)); setBpm(v); setDisplayBpm(v); }} 
            style={styles.numInput} />
        </div>
        <input type="range" min="20" max="300" value={displayBpm} 
          onChange={(e) => setDisplayBpm(Number(e.target.value))}
          onMouseUp={(e) => { const v = Number((e.target as HTMLInputElement).value); setBpm(v); }}
          style={{ width: '100%', marginTop: '10px' }} />
      </div>

      {/* 박자 설정 */}
      <div style={styles.card}>
        <p style={styles.label}>박자 (Beats): <b>{beatsPerMeasure}</b></p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          {[2, 3, 4, 6, 8].map(b => (
            <button key={b} onClick={() => setBeatsPerMeasure(b)}
              style={{ ...styles.choiceBtn, backgroundColor: beatsPerMeasure === b ? '#3498db' : '#fff', color: beatsPerMeasure === b ? '#fff' : '#333' }}>
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* 오프셋 설정 (버튼 추가) */}
      <div style={{ ...styles.card, backgroundColor: '#fffbe6', border: '1px solid #ffe58f' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={styles.label}>지연 보정: <b>{offset}ms</b></span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => setOffset(prev => Math.max(0, prev - 10))} style={styles.adjBtn}>-10</button>
            <button onClick={() => setOffset(prev => Math.max(0, prev - 1))} style={styles.adjBtn}>-1</button>
            <button onClick={() => setOffset(prev => Math.min(500, prev + 1))} style={styles.adjBtn}>+1</button>
            <button onClick={() => setOffset(prev => Math.min(500, prev + 10))} style={styles.adjBtn}>+10</button>
          </div>
        </div>
        <input type="range" min="0" max="500" value={offset} onChange={(e) => setOffset(Number(e.target.value))} style={{ width: '100%' }} />
      </div>

      {/* 프리셋 영역 */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={styles.label}>곡 프리셋</span>
          <button onClick={addPreset} style={styles.saveBtn}>현재 설정 저장</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
          {presets.length === 0 && <p style={{ fontSize: '0.8rem', color: '#999', textAlign: 'center' }}>저장된 곡이 없습니다.</p>}
          {presets.map(p => (
            <div key={p.id} style={styles.presetItem}>
              <div onClick={() => loadPreset(p)} style={{ flex: 1, cursor: 'pointer' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{p.name}</span>
                <span style={{ fontSize: '0.75rem', marginLeft: '8px', color: '#666' }}>{p.bpm} BPM / {p.beats}박</span>
              </div>
              <button onClick={() => deletePreset(p.id)} style={styles.delBtn}>×</button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={toggleMetronome} style={{ ...styles.mainBtn, backgroundColor: isPlaying ? '#e74c3c' : '#3498db' }}>
        {isPlaying ? 'STOP' : 'START'}
      </button>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: '20px', maxWidth: '420px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  shareBtn: { padding: '8px 14px', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', backgroundColor: '#9b59b6' },
  exitBtn: { padding: '6px 10px', backgroundColor: '#e74c3c', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  visualizer: { display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', minHeight: '100px', background: '#f0f2f5', borderRadius: '25px', marginBottom: '12px' },
  beatCircle: { borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  card: { background: '#fff', padding: '15px', borderRadius: '18px', marginBottom: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' },
  label: { fontSize: '0.9rem', color: '#555', margin: 0, fontWeight: '600' },
  numInput: { padding: '6px', width: '50px', borderRadius: '6px', border: '1px solid #ddd', textAlign: 'center' },
  choiceBtn: { flex: 1, padding: '10px 0', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer', fontWeight: 'bold' },
  adjBtn: { padding: '4px 8px', fontSize: '0.7rem', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer' },
  saveBtn: { padding: '4px 10px', fontSize: '0.75rem', backgroundColor: '#2ecc71', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  presetItem: { display: 'flex', alignItems: 'center', padding: '8px 12px', background: '#f8f9fa', borderRadius: '10px', border: '1px solid #eee' },
  delBtn: { border: 'none', background: 'none', color: '#e74c3c', fontSize: '1.2rem', cursor: 'pointer', padding: '0 5px' },
  mainBtn: { width: '100%', padding: '18px', borderRadius: '30px', border: 'none', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' },
};