import type { Note } from "../../model/Note";
import type { Pitch } from "../../model/Pitch";
import type { Tempo } from "../../model/Tempo";
import {
  interpolateCosineEaseIn,
  interpolateCosineEaseInOut,
  interpolateCosineEaseOut,
  interpolateLinear,
} from "../Interpolation";
import { simplifyShapeTo } from "../RdpSimplification";
import { milliSecFromTick } from "./TimeUnitConversion";
import { TickTimeTransformer } from "./TickTimeTransformation";
import { appendUtauNoteVibrato, type UtauNoteVibratoParams } from "./UtauVibratoConversion";
import { getAbsoluteData } from "./PitchCalculation";

const SAMPLING_INTERVAL_TICK = 4;
const SAFE_SAMPLING_INTERVAL_TICK = 5;
const MODE2_PITCH_MAX_POINT_COUNT = 50;

export interface UtauMode2TrackPitchData {
  notes: Array<UtauMode2NotePitchData | null>;
}

export interface UtauMode2NotePitchData {
  bpm: number | null;
  start: number | null;
  startShift: number | null;
  widths: number[];
  shifts: number[];
  curveTypes: string[];
  vibratoParams: UtauNoteVibratoParams | null;
}

export function pitchToUtauMode2Track(
  pitch: Pitch | null | undefined,
  notes: Note[],
  tempos: Tempo[],
): UtauMode2TrackPitchData | null {
  if (!pitch) {
    return null;
  }
  const absolutePitch = getAbsoluteData(pitch, notes);
  if (!absolutePitch) {
    return null;
  }

  type NotePitchData = { pitch: Array<[number, number]>; offset: number; bpm: number };
  const toRelative = (from: Array<[number, number | null]>, key: number): Array<[number, number]> =>
    from.map(([tick, value]) => [tick, (value ?? key) - key]);

  const first: NotePitchData = {
    pitch: toRelative(absolutePitch.filter((it) => it[0] < notes[0].tickOff), notes[0].key),
    offset: -Math.min(...absolutePitch.filter((it) => it[0] < 0).map((it) => it[0]), 0),
    bpm: bpmForNote(tempos, notes[0]),
  };

  const following = notes.slice(1).map<NotePitchData>((note) => ({
    pitch: toRelative(
      absolutePitch.filter((it) => it[0] >= note.tickOn && it[0] < note.tickOff),
      note.key,
    ),
    offset: (absolutePitch.find((it) => it[0] >= note.tickOn)?.[0] ?? note.tickOn) - note.tickOn,
    bpm: bpmForNote(tempos, note),
  }));

  const simplified = [first, ...following].map((it) => ({
    ...it,
    pitch: simplifyShapeTo(it.pitch, MODE2_PITCH_MAX_POINT_COUNT),
  }));

  return {
    notes: simplified.map((currNote) => {
      if (currNote.pitch.length === 0) {
        return null;
      }
      return {
        bpm: currNote.bpm,
        start: milliSecFromTick(currNote.offset, currNote.bpm),
        startShift: currNote.pitch[0][1] * 10,
        widths: currNote.pitch.slice(0, -1).map((point, index) => milliSecFromTick(currNote.pitch[index + 1][0] - point[0], currNote.bpm)),
        shifts: currNote.pitch.slice(1).map((it) => it[1] * 10),
        curveTypes: Array(currNote.pitch.length - 1).fill(""),
        vibratoParams: null,
      };
    }),
  };
}

export function pitchFromUtauMode2Track(
  pitchData: UtauMode2TrackPitchData | null | undefined,
  notes: Note[],
  tempos: Tempo[],
): Pitch | null {
  if (!pitchData) {
    return null;
  }
  const notePitches = notes.map((note, index) => [note, pitchData.notes[index]] as const);
  const tickTimeTransformer = new TickTimeTransformer(tempos);
  const pitchPoints: Array<[number, number]> = [];
  let lastNote: Note | null = null;
  let pendingPitchPoints: Array<[number, number]> = [];
  let lastKeyPos = -SAFE_SAMPLING_INTERVAL_TICK;
  for (const [note, notePitch] of notePitches) {
    const points: Array<[number, number]> = [];
    const noteStartInMillis = tickTimeTransformer.tickToMilliSec(note.tickOn);
    if (notePitch?.start != null) {
      let posInMillis = noteStartInMillis + notePitch.start;
      let tickPos = Math.max(tickTimeTransformer.milliSecToTick(posInMillis), lastKeyPos + SAFE_SAMPLING_INTERVAL_TICK);
      lastKeyPos = tickPos;
      const startShift =
        note.tickOn === lastNote?.tickOff
          ? lastNote.key - note.key
          : (notePitch.startShift ?? 0.0) / 10;
      points.push([tickPos, startShift]);
      for (let index = 0; index < notePitch.widths.length; index += 1) {
        const width = notePitch.widths[index];
        const shift = notePitch.shifts[index] ?? 0.0;
        const curveType = notePitch.curveTypes[index] ?? "";
        posInMillis += width;
        tickPos = Math.max(tickTimeTransformer.milliSecToTick(posInMillis), lastKeyPos + SAFE_SAMPLING_INTERVAL_TICK);
        lastKeyPos = tickPos;
        const thisPoint: [number, number] = [tickPos, shift / 10];
        const lastPoint = points[points.length - 1];
        if (thisPoint[1] !== lastPoint[1]) {
          points.push(...interpolate(lastPoint, thisPoint, curveType).slice(1));
        } else {
          points.push(thisPoint);
        }
      }
    }
    pitchPoints.push(...pendingPitchPoints.filter((it) => it[0] < (points[0]?.[0] ?? Number.MAX_SAFE_INTEGER)));
    pendingPitchPoints = shape(
      appendUtauNoteVibrato(
        appendEndPoint(appendStartPoint(fixPointsAtLastNote(points, note, lastNote), note), note),
        notePitch?.vibratoParams,
        note,
        tickTimeTransformer,
        SAMPLING_INTERVAL_TICK,
      ),
    );
    lastNote = note;
  }
  pitchPoints.push(...pendingPitchPoints);
  return { data: pitchPoints.map(([t, v]) => [t, v]), isAbsolute: false };
}

function fixPointsAtLastNote(points: Array<[number, number]>, thisNote: Note, lastNote: Note | null): Array<[number, number]> {
  if (!lastNote || lastNote.tickOff !== thisNote.tickOn) {
    return points;
  }
  const fixed = points.map(([tick, value]) =>
    tick < thisNote.tickOn ? ([tick, value + thisNote.key - lastNote.key] as [number, number]) : ([tick, value] as [number, number]),
  );
  const lastPoint = fixed[fixed.length - 1];
  if (lastPoint && lastPoint[0] < thisNote.tickOn) {
    return [...fixed, [thisNote.tickOn, 0.0]];
  }
  return fixed;
}

function appendStartPoint(points: Array<[number, number]>, note: Note): Array<[number, number]> {
  const firstPoint = points[0];
  if (!firstPoint) return [[note.tickOn, 0.0]];
  if (firstPoint[0] > note.tickOn) return [[note.tickOn, firstPoint[1]], ...points];
  return points;
}

function appendEndPoint(points: Array<[number, number]>, note: Note): Array<[number, number]> {
  const lastPoint = points[points.length - 1];
  if (!lastPoint) return [[note.tickOff, 0.0]];
  if (lastPoint[0] < note.tickOff) return [...points, [note.tickOff, lastPoint[1]]];
  return points;
}

function shape(points: Array<[number, number]>): Array<[number, number]> {
  return points
    .slice()
    .sort((a, b) => a[0] - b[0])
    .reduce<Array<[number, number]>>((acc, point) => {
      const last = acc[acc.length - 1];
      if (last && last[0] === point[0]) {
        acc[acc.length - 1] = [last[0], (last[1] + point[1]) / 2];
        return acc;
      }
      return [...acc, point];
    }, []);
}

function interpolate(
  lastPoint: [number, number],
  thisPoint: [number, number],
  curveType: string,
): Array<[number, number]> {
  const input: Array<[number, number]> = [lastPoint, thisPoint];
  if (curveType === "s") return interpolateLinear(input, SAMPLING_INTERVAL_TICK) ?? [];
  if (curveType === "j") return interpolateCosineEaseIn(input, SAMPLING_INTERVAL_TICK) ?? [];
  if (curveType === "r") return interpolateCosineEaseOut(input, SAMPLING_INTERVAL_TICK) ?? [];
  return interpolateCosineEaseInOut(input, SAMPLING_INTERVAL_TICK) ?? [];
}

function bpmForNote(tempos: Tempo[], note: Note): number {
  const sorted = tempos.slice().sort((a, b) => a.tickPosition - b.tickPosition);
  return sorted.filter((it) => it.tickPosition <= note.tickOn).pop()?.bpm ?? sorted[0]?.bpm ?? 120;
}

