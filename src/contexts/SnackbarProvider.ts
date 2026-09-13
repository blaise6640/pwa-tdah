import type React from 'react';
import { SnackbarProvider as RawProvider, useSnackbar as rawUseSnackbar } from './SnackbarProvider.jsx';

// Re-export bindings mapped to the existing JSX implementation
export const SnackbarProvider: React.FC<{ children?: React.ReactNode }> = (RawProvider as unknown) as React.FC<{ children?: React.ReactNode }>;

// keep the runtime hook as any to avoid requiring duplicate type declarations here
export const useSnackbar = (rawUseSnackbar as unknown) as () => any;

export default SnackbarProvider;
