/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_ENABLE_CAMERA: string;
  readonly VITE_INSECURE_CAMERA: string;
  readonly VITE_USE_MOCK_DETECTION: string;
  readonly VITE_ENABLE_TENSORFLOW: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 