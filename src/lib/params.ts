export type SP = Promise<Record<string, string | string[] | undefined>>;
export const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);
