/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LIVE_API_KEY?: string;
  readonly VITE_LIVE_API_URL?: string;
  readonly VITE_SHARED_STATE_URL?: string;
  // add other VITE_ env vars here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}
declare module '*.jpeg' {
  const src: string;
  export default src;
}
declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.svg' {
  const src: string;
  export default src;
}
declare module '*.webp' {
  const src: string;
  export default src;
}
