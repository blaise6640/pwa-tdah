declare module '../contexts/SnackbarProvider' {
  export type SnackbarFn = (message: string) => void;
  export interface SnackbarContextValue {
    showSuccess: SnackbarFn;
    showError: SnackbarFn;
    showWarning: SnackbarFn;
    showInfo: SnackbarFn;
  }
  export const SnackbarProvider: any;
  export function useSnackbar(): SnackbarContextValue;
}

declare module '../contexts/SnackbarProvider.jsx' {
  export const SnackbarProvider: any;
  export function useSnackbar(): any;
}
