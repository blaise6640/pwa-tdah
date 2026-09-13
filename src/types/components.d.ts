// Module declarations for components imported from ../components/*
// This prevents TypeScript from treating .jsx files as `any` when imported from TS/TSX files.

declare module '../components/MainLayout' {
  import type { FC, PropsWithChildren } from 'react';
  const MainLayout: FC<PropsWithChildren<Record<string, any>>>;
  export default MainLayout;
}

declare module '../components/*' {
  import type { ComponentType } from 'react';
  const Component: ComponentType<any>;
  export default Component;
}

// Also allow absolute-ish imports 'src/components/...'
declare module 'src/components/*' {
  import type { ComponentType } from 'react';
  const Component: ComponentType<any>;
  export default Component;
}

// Generic patterns to match different relative depths like '../../components/...'
declare module '*components/MainLayout' {
  import type { FC, PropsWithChildren } from 'react';
  const MainLayout: FC<PropsWithChildren<Record<string, any>>>;
  export default MainLayout;
}

declare module '*components/*' {
  import type { ComponentType } from 'react';
  const Component: ComponentType<any>;
  export default Component;
}
