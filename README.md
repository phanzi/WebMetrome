# Web Sync Metronome

브라우저에서 동작하는 실시간 동기화 메트로놈입니다.  
호스트가 만든 룸(Room)에 멤버가 참여하면, 호스트의 BPM·박자·재생 상태가 다른 기기에도 같이 반영되어 여러 기기가 같은 설정으로 연습할 수 있습니다.

## 주요 기능

### 기본 메트로놈

BPM은 `20 ~ 300`까지, 박자는 `2, 3, 4, 6, 8` 중에서 고를 수 있습니다. 강박은 더 높은 음, 약박은 더 낮은 음으로 구분됩니다.

![BPM 슬라이더·숫자 입력과 박자 선택 버튼](docs/feature-metronome.png)

### 실시간 룸 동기화

`SHARE`로 룸을 만들면 호스트가 되고, 표시되는 코드를 다른 기기에서 `JOIN`에 입력하면 멤버로 참여합니다. 호스트가 바꾼 BPM·박자·재생/정지가 멤버에게 전달됩니다.

![호스트 룸 코드 표시](docs/feature-room-sync.png)

### 시각 비주얼라이저

재생 중에는 현재 박자에 맞춰 번호 원이 강조되며, 박자를 한눈에 따라가기 쉽습니다.

![재생 중 박자 표시](docs/feature-visualizer.png)

### 로컬 저장

BPM·박자 값은 같은 브라우저에 저장되어, 다음에 열 때 이전 설정을 이어서 쓸 수 있습니다.

![저장되는 주요 설정 영역](docs/feature-local-settings.png)

## 실행 구조

- API와 WebSocket은 Elysia 서버가 단일로 처리합니다.
- 웹 페이지 렌더링/서빙은 TanStack Start 서버가 담당하고, Elysia가 `WEB_ORIGIN`으로 프록시합니다.
- `dev`, `build`, `start`만 공식 진입점 스크립트로 사용합니다.
- `_` prefix 스크립트는 내부 orchestration 용도이며 직접 실행하지 않습니다.

## 스크립트 규칙

- `dev`: one-liner를 유지해 Vite dev + Elysia watch를 함께 실행합니다.
- `build`: one-liner를 유지합니다. `vite build`는 기본 env 로딩을 사용하고, `bun build` 단계에서만 `--env-file=.env.production`을 명시합니다.
- `start`: `bun --env-file=.env.production`로 환경변수를 한번 주입한 뒤 내부 스크립트를 실행합니다.

## 환경변수 계약

- `.env.development`와 `.env.production`에 `PORT`, `WEB_ORIGIN`, `TANSTACK_SERVER_ENTRY`를 명시합니다.
- 코드에서는 환경 분기 대신 주입된 값으로만 동작합니다.
