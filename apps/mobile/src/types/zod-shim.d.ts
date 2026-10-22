// The native app imports SearchLocation only as a TypeScript type from the shared server contract.
// Runtime validation remains server-owned. This declaration prevents native typechecking from
// requiring the web/server zod package to be installed or bundled into the mobile application.
declare module "zod" {
  export namespace z {
    interface ZodType<T = unknown> {
      parse(value: unknown): T;
      safeParse(value: unknown): { success: true; data: T } | { success: false; error: unknown };
      optional(): ZodType<T | undefined>;
    }
  }

  export const z: {
    object(shape: unknown): z.ZodType<any>;
    string(): any;
    number(): any;
    enum<const T extends readonly [string, ...string[]]>(values: T): any;
    array(schema: unknown): any;
  };
}
