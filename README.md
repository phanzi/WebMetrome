# Web Sync Metronome

브라우저에서 동작하는 실시간 동기화 메트로놈입니다.  
호스트가 만든 룸(Room)에 멤버가 참여하면, 호스트의 BPM/박자/재생 상태를 Socket.IO로 공유해서 여러 기기가 같은 설정으로 연습할 수 있습니다.

## 주요 기능

- **기본 메트로놈**
  - BPM 범위: `20 ~ 300`
  - 박자(Beat) 선택: `2, 3, 4, 6, 8`
  - 강박/약박 구분 사운드 (강박 고음, 약박 저음)
- **실시간 룸 동기화**
  - `SHARE`: 룸 생성(호스트)
  - `JOIN`: 코드 입력 후 룸 참여(멤버)
  - 호스트가 변경한 BPM/박자/재생 상태를 멤버에게 브로드캐스트
- **레이턴시 보정**
  - `Latency Offset` 슬라이더(`0 ~ 500ms`)로 소리 지연 체감 보정
- **시각 비주얼라이저**
  - 현재 박자에 맞춰 비트 원형 UI 애니메이션 표시
- **로컬 저장**
  - `bpm`, `beats`, `offset` 값을 `localStorage`에 저장

## 기술 스택

- **Frontend**: React, Vite, Web Audio API
- **Realtime**: Socket.IO Client
- **Backend**: Express, Socket.IO
- **Tooling**: ESLint, Prettier, concurrently

## 프로젝트 구조

```text
.
├── src/
│   ├── App.tsx       # 메트로놈 UI/오디오 스케줄러/소켓 동기화 로직
│   ├── main.jsx      # React 엔트리포인트
│   └── server.js     # Socket.IO 시그널 중계 서버
├── package.json
└── vite.config.js
```

## 실행 방법

### 1) 설치

```bash
npm install
```

### 2) 개발 서버 실행 (클라이언트 + 시그널 서버 동시 실행)

```bash
npm run dev
```

- 클라이언트(Vite): 기본적으로 `http://localhost:5173` (환경에 따라 포트 변경 가능)
- 시그널 서버(Socket.IO): `http://localhost:4000`

### 개별 실행

```bash
# 클라이언트만
npm run client:dev

# 서버만
npm run server:dev
```

## 사용 흐름

1. 호스트 기기에서 앱 실행 후 `SHARE` 클릭
2. 생성된 5자리 룸 코드를 다른 기기에서 `JOIN`으로 입력
3. 호스트가 BPM/박자/START/STOP을 제어하면 멤버에 동기화
4. 각 기기에서 필요 시 `Latency Offset`으로 체감 딜레이 조정

## 스크립트

```bash
npm run dev        # 클라이언트+서버 동시 실행
npm run client:dev # Vite 개발 서버
npm run server:dev # Express + Socket.IO 서버
npm run build      # 프로덕션 빌드
npm run lint       # ESLint 검사
npm run format     # Prettier 포맷
```

## 동작 원리 요약

- 오디오 재생은 Web Audio API의 look-ahead 스케줄링 방식으로 구현되어, 박자를 조금 앞서 예약합니다.
- 멀티 기기 동기화는 오디오 스트리밍이 아니라 **제어 신호(BPM, beats, isPlaying)** 를 룸 단위로 전달하는 구조입니다.
- 멤버는 호스트 신호를 수신해 동일한 설정으로 로컬에서 메트로놈을 재생합니다.

## 참고 사항

- 현재 서버 CORS는 개발 편의를 위해 `origin: "*"`로 열려 있습니다.
- 서버는 `localhost:4000`에 바인딩되어 있어 로컬 개발 환경 기준으로 동작합니다.
