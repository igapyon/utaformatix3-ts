import { DEFAULT_BPM } from "./Constants";

export interface Tempo {
  tickPosition: number;
  bpm: number;
  extras?: Record<string, unknown>;
}

export function getDefaultTempo(): Tempo {
  return {
    tickPosition: 0,
    bpm: DEFAULT_BPM,
  };
}
