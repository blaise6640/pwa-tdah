declare interface ImportMetaEnv {
  readonly MODE: string;
  readonly VITE_FIREBASE_VAPID_KEY?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module './app.config' {
  const value: any;
  export default value;
}
