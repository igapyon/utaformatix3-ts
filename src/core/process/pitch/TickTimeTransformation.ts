import { TICKS_IN_BEAT } from "../../model/Constants";
import type { Tempo } from "../../model/Tempo";

function bpmToSecPerTick(bpm: number): number {
  return 60.0 / TICKS_IN_BEAT / bpm;
}

interface Segment {
  rangeStart: number;
  rangeEndExclusive: number;
  offset: number;
  secPerTick: number;
}

export class TickTimeTransformer {
  private readonly segments: Segment[];

  public constructor(tempos: Tempo[]) {
    this.segments = [];
    for (let i = 0; i < tempos.length; i += 1) {
      const thisTempo = tempos[i];
      const nextTempo = tempos[i + 1];
      const segment: Segment = {
        rangeStart: thisTempo.tickPosition,
        rangeEndExclusive: nextTempo?.tickPosition ?? Number.POSITIVE_INFINITY,
        offset: 0,
        secPerTick: bpmToSecPerTick(thisTempo.bpm),
      };
      if (this.segments.length > 0) {
        const last = this.segments[this.segments.length - 1];
        segment.offset = last.offset + (last.rangeEndExclusive - last.rangeStart) * last.secPerTick;
      }
      this.segments.push(segment);
    }
  }

  public tickToSec(tick: number): number {
    const segment = this.segments.find((it) => tick >= it.rangeStart && tick < it.rangeEndExclusive) ?? this.segments[0];
    return segment.offset + (tick - segment.rangeStart) * segment.secPerTick;
  }

  public tickToMilliSec(tick: number): number {
    return this.tickToSec(tick) * 1000;
  }

  public tickDistanceToSec(tickStart: number, tickEnd: number): number {
    return this.tickToSec(tickEnd) - this.tickToSec(tickStart);
  }

  public tickDistanceToMilliSec(tickStart: number, tickEnd: number): number {
    return this.tickDistanceToSec(tickStart, tickEnd) * 1000;
  }

  public secToTick(sec: number): number {
    let segment = this.segments[0];
    for (const current of this.segments) {
      if (current.offset <= sec) {
        segment = current;
      }
    }
    return Math.trunc((sec - segment.offset) / segment.secPerTick) + segment.rangeStart;
  }

  public milliSecToTick(milliSec: number): number {
    return this.secToTick(milliSec / 1000.0);
  }
}
