// Minimal ambient declaration to silence TypeScript when a @types/minimatch stub/package is missing.
// We only declare what the codebase needs: allow importing 'minimatch' as any.

declare module 'minimatch' {
  const minimatch: any;
  export = minimatch;
}

declare module 'minimatch/*' {
  const x: any;
  export default x;
}
