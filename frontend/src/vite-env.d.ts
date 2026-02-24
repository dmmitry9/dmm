/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WC_PROJECT_ID: string;
  readonly VITE_GAME_ENGINE: string;
  readonly VITE_TREASURY: string;
  readonly VITE_SEASON_NFT: string;
  readonly VITE_USDC: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
