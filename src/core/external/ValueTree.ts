export interface ValueTree {
  type: string;
  attributes: Record<string, unknown>;
  children: ValueTree[];
}

export type ValueTreeBinary = Uint8Array;
