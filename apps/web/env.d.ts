/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend API base URL used by the Hono RPC client */
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
