/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type unsafe_any = any;

interface ImportMetaEnv {
  readonly VITE_PUBLIC_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface HTMLButtonElement {
  commandFor?: string;
  command?: string;
}

declare namespace React {
  interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
    commandfor?: string;
    command?: string;
  }
}
