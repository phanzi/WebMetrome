import path from "path";
import { defineConfig } from "tsup";

export default defineConfig({
  target: "es2018", // 트랜스파일 대상
  format: ["esm"], // ESM + CommonJS 포맷 지원
  // format: ["esm"], // ESM + CommonJS 포맷 지원
  // outExtension: (_) => ({ js: ".mjs" }),
  entry: ["src/server.ts"], // 루트 entry 파일
  outDir: "out", // 출력 디렉토리

  platform: "node",
  // external: ["express"], //번들에 포함하지 않을 외부 라이브러리 지정,
  noExternal: [/.*/],

  dts: false, // 타입 선언 파일(.d.ts) 생성
  minify: false, // JS 파일을 압축(minify) 해서 더 작게 만듭니다.
  sourcemap: false, // 소스맵 생성
  clean: false, // 빌드 전 dist 폴더 정리
  treeshake: true, //사용하지 않는 코드를 제거합니다. 기본은 true지만 명시

  esbuildOptions: (options) => {
    if (!options.alias) {
      options.alias = {};
    }
    options.alias["@"] = path.resolve(__dirname, "src");
  },
});
