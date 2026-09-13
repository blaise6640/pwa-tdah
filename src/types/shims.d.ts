/// <reference types="vitest" />

declare module '../hooks/useAppUser' {
  const useAppUser: any;
  export default useAppUser;
}

// allow importing some JS modules without types
declare module '*/useAppUser' {
  const useAppUser: any;
  export default useAppUser;
}
