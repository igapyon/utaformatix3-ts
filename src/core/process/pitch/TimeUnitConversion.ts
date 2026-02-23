import { TICKS_IN_BEAT } from "../../model/Constants";

export function milliSecFromTick(tick: number, bpm: number): number {
  return (tick * 60000) / (bpm * TICKS_IN_BEAT);
}

