/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type unsafe_any = any;

interface ImportMetaEnv {
  readonly VITE_API_ORIGIN?: string;
  readonly VITE_PUBLIC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
