/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

type unsafe_any = any;

interface ImportMetaEnv {
  readonly VITE_API_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
