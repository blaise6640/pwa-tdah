import React from 'react';

export type SnackbarFn = (message: string) => void;

export interface SnackbarContextValue {
  showSuccess: SnackbarFn;
  showError: SnackbarFn;
  showWarning: SnackbarFn;
  showInfo: SnackbarFn;
}

export const SnackbarProvider: React.FC<{ children?: React.ReactNode }>;

export function useSnackbar(): SnackbarContextValue;
