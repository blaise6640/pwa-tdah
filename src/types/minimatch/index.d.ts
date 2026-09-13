// Local minimatch type package to satisfy TypeScript when upstream types are missing/stubbed.
// This mirrors a minimal subset of the public API used in the project.

declare module "minimatch" {
  interface IOptions {
    dot?: boolean;
    nobrace?: boolean;
    noglobstar?: boolean;
    noext?: boolean;
    nonegate?: boolean;
    nocomment?: boolean;
    flipNegate?: boolean;
  }

  function minimatch(path: string, pattern: string, options?: IOptions): boolean;
  namespace minimatch {
    function filter(pattern: string, options?: IOptions): (p: string) => boolean;
    const MINIMATCH_EMPTY: any;
  }

  export = minimatch;
}

declare module "minimatch/*" {
  const x: any;
  export default x;
}
