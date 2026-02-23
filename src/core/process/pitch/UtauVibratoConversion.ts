import type { Note } from "../../model/Note";
import { TickTimeTransformer } from "./TickTimeTransformation";

export interface UtauNoteVibratoParams {
  length: number;
  period: number;
  depth: number;
  fadeIn: number;
  fadeOut: number;
  phaseShift: number;
  shift: number;
}

export function appendUtauNoteVibrato(
  points: Array<[number, number]>,
  vibratoParams: UtauNoteVibratoParams | null | undefined,
  note: Note,
  tickTimeTransformer: TickTimeTransformer,
  sampleIntervalTick: number,
): Array<[number, number]> {
  if (!vibratoParams) {
    return points;
  }
  const noteLength = tickTimeTransformer.tickDistanceToMilliSec(note.tickOn, note.tickOff);
  const vibratoLength = (noteLength * vibratoParams.length) / 100;
  if (vibratoLength <= 0) {
    return points;
  }
  const frequency = 1.0 / vibratoParams.period;
  if (!Number.isFinite(frequency)) {
    return points;
  }
  const depth = vibratoParams.depth / 100;
  if (depth <= 0) {
    return points;
  }
  const easeInLength = (noteLength * vibratoParams.fadeIn) / 100;
  const easeOutLength = (noteLength * vibratoParams.fadeOut) / 100;
  const phase = vibratoParams.phaseShift / 100;
  const shift = vibratoParams.shift / 100;
  const start = noteLength - vibratoLength;
  const vibrato = (t: number): number => {
    if (t < start) {
      return 0.0;
    }
    const easeInFactor = Number.isFinite((t - start) / easeInLength)
      ? Math.max(0.0, Math.min(1.0, (t - start) / easeInLength))
      : 1.0;
    const easeOutFactor = Number.isFinite((noteLength - t) / easeOutLength)
      ? Math.max(0.0, Math.min(1.0, (noteLength - t) / easeOutLength))
      : 1.0;
    const x = 2 * Math.PI * (frequency * (t - start) - phase);
    return depth * easeInFactor * easeOutFactor * (Math.sin(x) + shift);
  };

  const noteStartInMillis = tickTimeTransformer.tickToMilliSec(note.tickOn);
  const sampleIntervalInMillis = tickTimeTransformer.tickDistanceToMilliSec(
    note.tickOn,
    note.tickOn + sampleIntervalTick,
  );

  return points
    .map(([tick, value]) => [tickTimeTransformer.tickToMilliSec(tick) - noteStartInMillis, value] as [number, number])
    .reduce<Array<[number, number]>>((acc, inputPoint) => {
      const lastPoint = acc[acc.length - 1];
      const newPoint: [number, number] = [inputPoint[0], inputPoint[1] + vibrato(inputPoint[0])];
      if (!lastPoint) {
        return [newPoint];
      }
      const interpolatedPoints: Array<[number, number]> = [];
      for (
        let pos = lastPoint[0] + sampleIntervalInMillis;
        pos < newPoint[0];
        pos += sampleIntervalInMillis
      ) {
        interpolatedPoints.push([pos, lastPoint[1] + vibrato(pos)]);
      }
      return acc.concat(interpolatedPoints, [newPoint]);
    }, [])
    .map(([milliSecFromNoteStart, value]) => [
      tickTimeTransformer.milliSecToTick(milliSecFromNoteStart + noteStartInMillis),
      value,
    ]);
}

