import type { Note } from "../../model/Note";
import type { Pitch } from "../../model/Pitch";
import type { Tempo } from "../../model/Tempo";
import {
  interpolateCosineEaseInOut,
  interpolateLinear,
} from "../Interpolation";
import { getAbsoluteData } from "./PitchCalculation";
import { TickTimeTransformer } from "./TickTimeTransformation";

const SAMPLING_INTERVAL_TICK = 4;
const PORTAMENTO_LENGTH_MAX_SEC = 0.3125;
const BEND_DOWN_LENGTH_FIXED_SEC = 0.09375;
const BEND_LENGTH_MIN_SEC = 0.375;
const BEND_LENGTH_MAX_SEC = 0.6875;
const BEND_VALUE_MAX = 3.0;
const DV_NOTE_KEY_SUM = 115.5;

function convertDvNoteKey(key: number): number {
  return DV_NOTE_KEY_SUM - key;
}

function tickHalfStart(note: Note): number {
  return note.tickOn + Math.trunc((note.tickOff - note.tickOn + 1) / 2);
}

export interface DvSegmentPitchRawData {
  tickOffset: number;
  data: Array<[number, number]>;
}

export interface DvNoteWithPitch {
  note: Note;
  porHead: number;
  porTail: number;
  benLen: number;
  benDep: number;
  vibrato: Array<[number, number]>;
}

function mergeSameTickPoints(points: Array<[number, number | null]>): Array<[number, number | null]> | null {
  const grouped = new Map<number, Array<number | null>>();
  points.forEach(([tick, value]) => {
    const values = grouped.get(tick) ?? [];
    values.push(value);
    grouped.set(tick, values);
  });
  const merged = Array.from(grouped.entries())
    .map(([tick, values]) => {
      if (values.length > 1) {
        if (values.some((it) => it == null)) return [tick, null] as [number, number | null];
        const only = values.filter((it): it is number => it != null);
        return [tick, only.reduce((a, b) => a + b, 0) / only.length] as [number, number | null];
      }
      return [tick, values[0]] as [number, number | null];
    })
    .sort((a, b) => a[0] - b[0]);
  return merged.some((it) => it[1] != null) ? merged : null;
}

function mergeSameValuePoints(points: Array<[number, number | null]>): Array<[number, number | null]> {
  return points
    .slice()
    .sort((a, b) => a[0] - b[0])
    .reduce<Array<[number, number | null]>>((acc, point) => {
      const last = acc[acc.length - 1];
      return !last || point[1] !== last[1] ? [...acc, point] : acc;
    }, []);
}

function getPortamento(lastNote: DvNoteWithPitch, transformer: TickTimeTransformer, thisNote: DvNoteWithPitch): Array<[number, number]> {
  const tailLengthSec = (PORTAMENTO_LENGTH_MAX_SEC * lastNote.porTail) / 100;
  const startSec = transformer.tickToSec(lastNote.note.tickOff) - tailLengthSec;
  const startTick = Math.max(transformer.secToTick(startSec), tickHalfStart(lastNote.note));
  const headLengthSec = (PORTAMENTO_LENGTH_MAX_SEC * thisNote.porHead) / 100;
  const endSec = transformer.tickToSec(thisNote.note.tickOn) + headLengthSec;
  const endTick = Math.min(transformer.secToTick(endSec), tickHalfStart(thisNote.note) - 1);
  return interpolateCosineEaseInOut(
    [
      [startTick, lastNote.note.key],
      [endTick, thisNote.note.key],
    ],
    1,
  ) ?? [];
}

function getBasePitch(notes: DvNoteWithPitch[], transformer: TickTimeTransformer): Map<number, number> {
  const noteWithNull: Array<DvNoteWithPitch | null> = [null, ...notes, null];
  const merged = noteWithNull.slice(0, -1).flatMap((lastNote, i) => {
    const thisNote = noteWithNull[i + 1];
    const result: Array<[number, number]> = [];
    const portamento = lastNote && thisNote ? getPortamento(lastNote, transformer, thisNote) : [];
    result.push(...portamento);
    if (lastNote) {
      for (let t = tickHalfStart(lastNote.note); t < (portamento[0]?.[0] ?? lastNote.note.tickOff); t += 1) {
        result.push([t, lastNote.note.key]);
      }
    }
    if (thisNote) {
      const start = !lastNote ? 0 : portamento[portamento.length - 1]?.[0] ?? thisNote.note.tickOn;
      for (let t = start; t < tickHalfStart(thisNote.note); t += 1) {
        result.push([t, thisNote.note.key]);
      }
    }
    return result;
  });
  return new Map((mergeSameTickPoints(merged.map(([t, v]) => [t, v])) ?? []).map(([t, v]) => [t, v ?? 0]));
}

function getBendPitch(notes: DvNoteWithPitch[], transformer: TickTimeTransformer): Map<number, number> {
  const points = notes.flatMap((note) => {
    const startTick = note.note.tickOn;
    const startSec = transformer.tickToSec(startTick);
    const valleySec = startSec + BEND_DOWN_LENGTH_FIXED_SEC;
    const valleyTick = Math.min(transformer.secToTick(valleySec), note.note.tickOn + Math.trunc((note.note.tickOff - note.note.tickOn) / 2) - 1);
    const lengthSec =
      note.benLen <= 50
        ? BEND_LENGTH_MIN_SEC
        : ((BEND_LENGTH_MAX_SEC - BEND_LENGTH_MIN_SEC) * (note.benLen - 50)) / 50 + BEND_LENGTH_MIN_SEC;
    const endSec = startSec + lengthSec;
    const endTick = Math.min(transformer.secToTick(endSec), note.note.tickOff - 1);
    const valleyValue = (-BEND_VALUE_MAX * note.benDep) / 100;
    const valleyPoint: [number, number] = [valleyTick, valleyValue];
    const bendDown = interpolateLinear([[startTick, 0.0], valleyPoint], 1) ?? [];
    const bendUp = (interpolateCosineEaseInOut([valleyPoint, [endTick, 0.0]], 1) ?? []).slice(1);
    return [...bendDown, ...bendUp];
  });
  return new Map((mergeSameTickPoints(points.map(([t, v]) => [t, v])) ?? []).map(([t, v]) => [t, v ?? 0]));
}

function getVibratoPitch(notes: DvNoteWithPitch[], transformer: TickTimeTransformer): Map<number, number> {
  const points = notes.flatMap((note) => {
    const startTick = note.note.tickOn;
    const startSec = transformer.tickToSec(startTick);
    const raw = note.vibrato
      .map(([mSec, minusCent]) => [transformer.secToTick(startSec + mSec / 1000), -minusCent / 100] as [number, number])
      .filter(([tick]) => tick >= startTick && tick < note.note.tickOff)
      .sort((a, b) => a[0] - b[0]);
    return interpolateLinear(raw, 1) ?? [];
  });
  return new Map((mergeSameTickPoints(points.map(([t, v]) => [t, v])) ?? []).map(([t, v]) => [t, v ?? 0]));
}

function applyDefaultPitch(
  points: Array<[number, number | null]>,
  notes: DvNoteWithPitch[],
  tempos: Tempo[],
): Array<[number, number | null]> {
  if (points.length === 0 || notes.length === 0) return points;
  const transformer = new TickTimeTransformer(tempos);
  const base = getBasePitch(notes, transformer);
  const bend = getBendPitch(notes, transformer);
  const vibrato = getVibratoPitch(notes, transformer);
  const appendingLastPoint =
    points[points.length - 1][0] < notes[notes.length - 1].note.tickOff
      ? ([notes[notes.length - 1].note.tickOff, null] as [number, number | null])
      : null;
  return [...points, ...(appendingLastPoint ? [appendingLastPoint] : [])].reduce<Array<[number, number | null]>>(
    (acc, point) => {
      const last = acc[acc.length - 1];
      const startTick = last?.[0] ?? 0;
      const endTick = point[0];
      if (last?.[1] == null) {
        const interpolated: Array<[number, number]> = [];
        for (let t = startTick; t < endTick; t += SAMPLING_INTERVAL_TICK) {
          interpolated.push([t, (base.get(t) ?? 0) + (bend.get(t) ?? 0) + (vibrato.get(t) ?? 0)]);
        }
        return [...acc, ...interpolated, point];
      }
      return [...acc, point];
    },
    [],
  );
}

export function pitchFromDvTrack(
  segments: DvSegmentPitchRawData[],
  notes: DvNoteWithPitch[],
  tempos: Tempo[],
): Pitch | null {
  const merged = segments.flatMap((segment) =>
    segment.data
      .map(([rawTick, cent]) => {
        if (rawTick < 0) return null;
        const tick = rawTick + segment.tickOffset;
        const value = cent < 0 ? null : convertDvNoteKey(cent / 100);
        return [tick, value] as [number, number | null] | null;
      })
      .filter((it): it is [number, number | null] => it != null),
  );
  const sameTick = mergeSameTickPoints(merged);
  if (!sameTick) return null;
  const sameValue = mergeSameValuePoints(sameTick);
  const applied = applyDefaultPitch(sameValue, notes, tempos);
  return { data: applied, isAbsolute: true };
}

export function generateForDv(pitch: Pitch, notes: Note[]): DvSegmentPitchRawData | null {
  if (notes.length === 0) return null;
  const points = getAbsoluteData(pitch, notes);
  if (!points || points.length === 0) return null;
  const data: Array<[number, number]> = [[-1, -1]];
  appendPoints(points).forEach(([tick, value]) => {
    data.push([tick, value == null ? -1 : Math.round(convertDvNoteKey(value) * 100)]);
  });
  return { tickOffset: 0, data };
}

function appendPoints(points: Array<[number, number | null]>): Array<[number, number | null]> {
  const results: Array<[number, number | null]> = [];
  let lastValue: number | null = null;
  for (const point of points) {
    if (lastValue == null && point[1] != null) results.push([point[0], null]);
    if (lastValue != null && point[1] == null) results.push([point[0], lastValue]);
    results.push(point);
    lastValue = point[1];
  }
  return results;
}

