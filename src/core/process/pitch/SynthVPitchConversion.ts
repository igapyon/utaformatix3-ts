import { DEFAULT_BPM } from "../../model/Constants";
import type { Tempo } from "../../model/Tempo";
import { interpolateCosineEaseInOut, interpolateLinear } from "../Interpolation";
import { appendPitchPointsForInterpolation, reduceRepeatedPitchPoints } from "./PitchCalculation";
import { TickTimeTransformer } from "./TickTimeTransformation";

const SAMPLING_INTERVAL_TICK = 4;
const SVP_VIBRATO_DEFAULT_START_SEC = 0.25;
const SVP_VIBRATO_DEFAULT_EASE_IN_SEC = 0.2;
const SVP_VIBRATO_DEFAULT_EASE_OUT_SEC = 0.2;
const SVP_VIBRATO_DEFAULT_DEPTH_SEMITONE = 1.0;
const SVP_VIBRATO_DEFAULT_FREQUENCY_HZ = 5.5;
const SVP_VIBRATO_DEFAULT_PHASE_RAD = 0.0;

export interface SvpDefaultVibratoParameters {
  vibratoStart: number | null;
  easeInLength: number | null;
  easeOutLength: number | null;
  depth: number | null;
  frequency: number | null;
}

export interface SvpNoteWithVibrato {
  noteStartTick: number;
  noteLengthTick: number;
  vibratoStart: number | null;
  easeInLength: number | null;
  easeOutLength: number | null;
  depth: number | null;
  frequency: number | null;
  phase: number | null;
}

export function processSvpInputPitchData(
  points: Array<[number, number]>,
  mode: string | null | undefined,
  notesWithVibrato: SvpNoteWithVibrato[],
  tempos: Tempo[],
  vibratoEnvPoints: Array<[number, number]>,
  vibratoEnvMode: string | null | undefined,
  vibratoDefaultParameters: SvpDefaultVibratoParameters | null | undefined,
): Array<[number, number]> {
  return removeRedundantPoints(
    appendVibrato(
      interpolateByMode(merge(points), mode) ?? [],
      notesWithVibrato,
      vibratoDefaultParameters ?? null,
      tempos,
      extendEveryTick(interpolateByMode(merge(vibratoEnvPoints), vibratoEnvMode) ?? []),
    ),
  );
}

function merge(points: Array<[number, number]>): Array<[number, number]> {
  const grouped = new Map<number, number[]>();
  points.forEach(([tick, value]) => {
    const values = grouped.get(tick) ?? [];
    values.push(value);
    grouped.set(tick, values);
  });
  return Array.from(grouped.entries())
    .map(([tick, values]) => [tick, values.reduce((a, b) => a + b, 0) / values.length] as [number, number])
    .sort((a, b) => a[0] - b[0]);
}

function interpolateByMode(points: Array<[number, number]>, mode: string | null | undefined): Array<[number, number]> | undefined {
  if (mode === "linear") return interpolateLinear(points, SAMPLING_INTERVAL_TICK);
  if (mode === "cosine") return interpolateCosineEaseInOut(points, SAMPLING_INTERVAL_TICK);
  if (mode === "cubic") return interpolateCosineEaseInOut(points, SAMPLING_INTERVAL_TICK);
  return interpolateCosineEaseInOut(points, SAMPLING_INTERVAL_TICK);
}

function extendEveryTick(points: Array<[number, number]>): Map<number, number> {
  const expanded = points.reduce<Array<[number, number]>>((acc, point) => {
    const lastPoint = acc[acc.length - 1];
    if (!lastPoint || lastPoint[1] === 1.0) {
      return [...acc, point];
    }
    const inserted: Array<[number, number]> = [];
    for (let t = lastPoint[0]; t < point[0]; t += 1) {
      inserted.push([t, lastPoint[1]]);
    }
    return [...acc, ...inserted, point];
  }, []);
  return new Map(expanded);
}

function appendVibrato(
  pitchPoints: Array<[number, number]>,
  notes: SvpNoteWithVibrato[],
  vibratoDefaultParameters: SvpDefaultVibratoParameters | null,
  tempos: Tempo[],
  vibratoEnv: Map<number, number>,
): Array<[number, number]> {
  const rangesList: Array<[readonly [number, number], SvpNoteWithVibrato | null]> = [];
  let lastTick = 0;
  for (const note of notes) {
    const noteEndTick = note.noteStartTick + note.noteLengthTick;
    if (lastTick < note.noteStartTick) {
      rangesList.push([[lastTick, note.noteStartTick], null]);
    }
    rangesList.push([[note.noteStartTick, noteEndTick], note]);
    lastTick = noteEndTick;
  }
  rangesList.push([[lastTick, Number.MAX_SAFE_INTEGER], null]);

  const result: Array<[number, number]> = [];
  let pitchIndex = 0;
  for (const [range, note] of rangesList) {
    while (pitchIndex < pitchPoints.length && pitchPoints[pitchIndex][0] < range[0]) {
      pitchIndex += 1;
    }
    const startIndex = pitchIndex;
    while (pitchIndex < pitchPoints.length && pitchPoints[pitchIndex][0] >= range[0] && pitchPoints[pitchIndex][0] < range[1]) {
      pitchIndex += 1;
    }
    if (startIndex < pitchIndex) {
      result.push(
        ...appendVibratoInNote(
          pitchPoints.slice(startIndex, pitchIndex),
          note,
          vibratoDefaultParameters,
          tempos,
          vibratoEnv,
        ),
      );
    }
  }
  return result;
}

function appendVibratoInNote(
  points: Array<[number, number]>,
  note: SvpNoteWithVibrato | null,
  defaults: SvpDefaultVibratoParameters | null,
  tempos: Tempo[],
  vibratoEnv: Map<number, number>,
): Array<[number, number]> {
  if (!note || note.noteStartTick < 0) {
    return points;
  }
  const noteEndTick = note.noteStartTick + note.noteLengthTick;
  const tickTimeTransformer = new TickTimeTransformer(tempos);
  const noteStartSec = tickTimeTransformer.tickToSec(note.noteStartTick);
  const noteEndSec = tickTimeTransformer.tickToSec(noteEndTick);
  const vibratoStartSec = (note.vibratoStart ?? defaults?.vibratoStart ?? SVP_VIBRATO_DEFAULT_START_SEC) + noteStartSec;
  const vibratoStartTick = tickTimeTransformer.secToTick(vibratoStartSec);
  const easeInLength = note.easeInLength ?? defaults?.easeInLength ?? SVP_VIBRATO_DEFAULT_EASE_IN_SEC;
  const easeOutLength = note.easeOutLength ?? defaults?.easeOutLength ?? SVP_VIBRATO_DEFAULT_EASE_OUT_SEC;
  const depth = (note.depth ?? defaults?.depth ?? SVP_VIBRATO_DEFAULT_DEPTH_SEMITONE) * 0.5;
  if (depth === 0.0) return points;
  const phase = note.phase ?? SVP_VIBRATO_DEFAULT_PHASE_RAD;
  const frequency = note.frequency ?? defaults?.frequency ?? SVP_VIBRATO_DEFAULT_FREQUENCY_HZ;
  const bpm = tempos.filter((it) => it.tickPosition <= note.noteStartTick).pop()?.bpm ?? DEFAULT_BPM;
  const secPerTick = bpmToSecPerTick(bpm);
  const vibrato = (tick: number): number => {
    const sec = tickTimeTransformer.tickToSec(tick);
    if (sec < vibratoStartSec) return 0.0;
    const easeInFactor = Math.max(0.0, Math.min(1.0, (sec - vibratoStartSec) / easeInLength));
    const easeOutFactor = Math.max(0.0, Math.min(1.0, (noteEndSec - sec) / easeOutLength));
    const rad = 2 * Math.PI * frequency * secPerTick * (tick - vibratoStartTick) + phase;
    const envelope = vibratoEnv.get(tick) ?? 1.0;
    return envelope * depth * easeInFactor * easeOutFactor * Math.sin(rad);
  };
  const basePoints: Array<[number, number]> =
    points.length === 0 ? [[note.noteStartTick, 0.0], [noteEndTick, 0.0]] : points;
  const fixed: Array<[number, number]> =
    basePoints[basePoints.length - 1][0] !== noteEndTick
      ? [...basePoints, [noteEndTick, basePoints[basePoints.length - 1][1]] as [number, number]]
      : basePoints;

  const out: Array<[number, number]> = [];
  let prev: [number, number] | undefined;
  for (const point of fixed) {
    if (!prev) {
      out.push([point[0], point[1] + vibrato(point[0])]);
    } else {
      for (let tick = prev[0] + SAMPLING_INTERVAL_TICK; tick < point[0]; tick += SAMPLING_INTERVAL_TICK) {
        out.push([tick, prev[1] + vibrato(tick)]);
      }
      out.push([point[0], point[1] + vibrato(point[0])]);
    }
    prev = point;
  }
  return out;
}

function removeRedundantPoints(points: Array<[number, number]>): Array<[number, number]> {
  return points.reduce<Array<[number, number]>>((acc, point) => {
    const previousValue = acc[acc.length - 1]?.[1];
    return point[1] !== previousValue ? [...acc, point] : acc;
  }, []);
}

function bpmToSecPerTick(bpm: number): number {
  return 60.0 / 480 / bpm;
}

export function appendPitchPointsForSvpOutput(points: Array<[number, number]>): Array<[number, number]> {
  return reduceRepeatedPitchPoints(appendPitchPointsForInterpolation(points, SAMPLING_INTERVAL_TICK));
}
