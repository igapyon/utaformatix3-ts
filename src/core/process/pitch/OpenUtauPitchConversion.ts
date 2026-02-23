import type { Note } from "../../model/Note";
import type { Pitch } from "../../model/Pitch";
import type { Tempo } from "../../model/Tempo";
import {
  interpolateCosineEaseIn,
  interpolateCosineEaseInOut,
  interpolateCosineEaseOut,
  interpolateLinear,
} from "../Interpolation";
import { appendPitchPointsForInterpolation, getRelativeData, reduceRepeatedPitchPoints } from "./PitchCalculation";
import { TickTimeTransformer } from "./TickTimeTransformation";
import { appendUtauNoteVibrato, type UtauNoteVibratoParams } from "./UtauVibratoConversion";

const SAMPLING_INTERVAL_TICK = 5;
const SAFE_SAMPLING_INTERVAL_TICK = 5;

export interface OpenUtauNotePitchData {
  points: OpenUtauNotePitchPoint[];
  vibrato: UtauNoteVibratoParams;
}

export interface OpenUtauNotePitchPoint {
  x: number;
  y: number;
  shape: OpenUtauPitchShape;
}

export enum OpenUtauPitchShape {
  EaseIn = "i",
  EaseOut = "o",
  EaseInOut = "io",
  Linear = "l",
}

export interface OpenUtauPartPitchData {
  points: Array<{ x: number; y: number }>;
  notes: OpenUtauNotePitchData[];
}

export function pitchFromUstxPart(
  notes: Note[],
  pitchData: OpenUtauPartPitchData,
  tempos: Tempo[],
): Pitch | null {
  const notePointsList: Array<Array<[number, number]>> = [];
  const tickTimeTransformer = new TickTimeTransformer(tempos);
  let lastKeyPos = -SAFE_SAMPLING_INTERVAL_TICK;
  for (let idx = 0; idx < Math.min(notes.length, pitchData.notes.length); idx += 1) {
    const note = notes[idx];
    const notePitch = pitchData.notes[idx];
    const points: Array<[number, number]> = [];
    let lastPointShape = OpenUtauPitchShape.EaseInOut;
    const noteStartInMillis = tickTimeTransformer.tickToMilliSec(note.tickOn);
    const keyPointPositions: number[] = [];
    for (const rawPoint of notePitch.points) {
      const x = Math.max(
        tickTimeTransformer.milliSecToTick(noteStartInMillis + rawPoint.x),
        lastKeyPos + SAFE_SAMPLING_INTERVAL_TICK,
      );
      lastKeyPos = x;
      keyPointPositions.push(x);
      const y = rawPoint.y / 10;
      const thisPoint: [number, number] = [x, y];
      const lastPoint = points[points.length - 1];
      if (lastPoint && thisPoint[1] !== lastPoint[1]) {
        points.push(...interpolate(lastPoint, thisPoint, lastPointShape).slice(1));
      } else {
        points.push(thisPoint);
      }
      lastPointShape = rawPoint.shape;
    }
    appendStartAndEndPoint(points, note);
    const pointsBefore = points.filter((it) => it[0] < note.tickOn);
    const pointsAfter = points.filter((it) => it[0] > note.tickOff);
    const pointsIn = points.filter((it) => it[0] >= note.tickOn && it[0] <= note.tickOff);
    const pointsInNoteWithVibrato = appendUtauNoteVibrato(
      pointsIn,
      notePitch.vibrato,
      note,
      tickTimeTransformer,
      SAMPLING_INTERVAL_TICK,
    );
    const pointsWithVibrato = [...pointsBefore, ...pointsInNoteWithVibrato, ...pointsAfter];
    notePointsList.push(resampled(pointsWithVibrato, SAMPLING_INTERVAL_TICK, keyPointPositions));
  }

  let currentSection: Array<[Note, Array<[number, number]>]> = [];
  const notePitchSections: Array<Array<[Note, Array<[number, number]>]>> = [currentSection];
  for (let i = 0; i < Math.min(notes.length, notePointsList.length); i += 1) {
    const pair: [Note, Array<[number, number]>] = [notes[i], notePointsList[i]];
    if (currentSection.length === 0) {
      currentSection.push(pair);
      continue;
    }
    const lastNote = currentSection[currentSection.length - 1][0];
    if (lastNote.tickOff < pair[0].tickOn) {
      currentSection = [pair];
      notePitchSections.push(currentSection);
    } else {
      currentSection.push(pair);
    }
  }

  let sectionBorder = 0;
  const allPointsFromNote: Array<[number, number]> = [];
  for (const section of notePitchSections) {
    if (section.length === 0) continue;
    let lastNote: Note | null = null;
    const pointsByNote: Array<Array<[number, number]>> = [];
    for (const [note, notePoints] of section) {
      const prevNote = lastNote;
      const adjusted = notePoints.map(([x, y]) => {
        const baseY = prevNote && x < note.tickOn ? prevNote.key - note.key : 0;
        return [x, y - baseY] as [number, number];
      });
      pointsByNote.push(adjusted);
      lastNote = note;
    }
    const nextSectionBorder = section[section.length - 1][0].tickOff;
    const pointsInSection = new Map<number, number[]>();
    pointsByNote.flat().forEach(([tick, value]) => {
      if (tick < sectionBorder || tick > nextSectionBorder) return;
      const list = pointsInSection.get(tick) ?? [];
      list.push(value);
      pointsInSection.set(tick, list);
    });
    Array.from(pointsInSection.entries())
      .map(([tick, values]) => [tick, values.reduce((a, b) => a + b, 0)] as [number, number])
      .sort((a, b) => a[0] - b[0])
      .forEach((it) => allPointsFromNote.push(it));
    sectionBorder = nextSectionBorder;
  }

  const curvePoints = resampled(
    pitchData.points.map((it) => [it.x, it.y / 100] as [number, number]),
    SAMPLING_INTERVAL_TICK,
  );
  const grouped = new Map<number, number[]>();
  [...allPointsFromNote, ...curvePoints].forEach(([tick, value]) => {
    const list = grouped.get(tick) ?? [];
    list.push(value);
    grouped.set(tick, list);
  });
  const merged = Array.from(grouped.entries())
    .map(([tick, values]) => [tick, values.reduce((a, b) => a + b, 0)] as [number, number])
    .sort((a, b) => a[0] - b[0])
    .filter(([tick]) => tick >= 0);
  return merged.length === 0 ? null : { data: merged.map(([t, v]) => [t, v]), isAbsolute: false };
}

export function mergePitchFromUstxParts(first: Pitch | null | undefined, second: Pitch | null | undefined): Pitch | null {
  if (!first) return second ?? null;
  if (!second) return first;
  const grouped = new Map<number, number[]>();
  [...first.data, ...second.data].forEach(([tick, value]) => {
    if (value == null) return;
    const list = grouped.get(tick) ?? [];
    list.push(value);
    grouped.set(tick, list);
  });
  const data = Array.from(grouped.entries())
    .map(([tick, values]) => [tick, values.reduce((a, b) => a + b, 0)] as [number, number | null])
    .sort((a, b) => a[0] - b[0]);
  return { ...first, data };
}

export function reduceRepeatedPitchPointsFromUstxTrack(pitch: Pitch | null | undefined): Pitch | null {
  if (!pitch) return null;
  return { ...pitch, data: reduceRepeatedPitchPoints(pitch.data.map(([t, v]) => [t, v ?? 0])) };
}

export function toOpenUtauPitchData(pitch: Pitch | null | undefined, notes: Note[]): Array<[number, number]> {
  const data = pitch ? getRelativeData(pitch, notes) : null;
  if (!data) return [];
  return reduceRepeatedPitchPoints(
    appendPitchPointsForInterpolation(
      data.map(([tick, value]) => [tick, Math.round(value * 100)]),
      SAMPLING_INTERVAL_TICK,
    ),
  );
}

function interpolate(
  lastPoint: [number, number],
  thisPoint: [number, number],
  shape: OpenUtauPitchShape,
): Array<[number, number]> {
  const input: Array<[number, number]> = [lastPoint, thisPoint];
  if (shape === OpenUtauPitchShape.EaseIn) return interpolateCosineEaseIn(input, SAMPLING_INTERVAL_TICK) ?? [];
  if (shape === OpenUtauPitchShape.EaseOut) return interpolateCosineEaseOut(input, SAMPLING_INTERVAL_TICK) ?? [];
  if (shape === OpenUtauPitchShape.Linear) return interpolateLinear(input, SAMPLING_INTERVAL_TICK) ?? [];
  return interpolateCosineEaseInOut(input, SAMPLING_INTERVAL_TICK) ?? [];
}

function appendStartAndEndPoint(points: Array<[number, number]>, note: Note): void {
  const start = note.tickOn;
  const end = note.tickOff;
  const hasStartPoint = points.some((it) => it[0] === start);
  const hasEndPoint = points.some((it) => it[0] === end);
  if (points.length <= 1) {
    if (!hasStartPoint) points.unshift([start, points[0]?.[1] ?? 0.0]);
    if (!hasEndPoint) points.push([end, points[0]?.[1] ?? 0.0]);
    return;
  }
  const firstTick = points[0][0];
  const lastTick = points[points.length - 1][0];
  if (!hasStartPoint) {
    if (firstTick > start) {
      points.unshift([start, points[0][1]]);
    } else if (lastTick < start) {
      points.push([start, 0.0]);
    } else {
      const lastPointBefore = [...points].reverse().find((it) => it[0] < start)!;
      const firstPointAfter = points.find((it) => it[0] > start)!;
      const k = (firstPointAfter[1] - lastPointBefore[1]) / (firstPointAfter[0] - lastPointBefore[0]);
      const y = lastPointBefore[1] + (start - lastPointBefore[0]) * k;
      points.splice(points.indexOf(firstPointAfter), 0, [start, y]);
    }
  }
  if (!hasEndPoint) {
    if (firstTick > end) {
      points.unshift([end, points[0][1]]);
    } else if (lastTick < end) {
      points.push([end, 0.0]);
    } else {
      const lastPointBefore = [...points].reverse().find((it) => it[0] < end)!;
      const firstPointAfter = points.find((it) => it[0] > end)!;
      const k = (firstPointAfter[1] - lastPointBefore[1]) / (firstPointAfter[0] - lastPointBefore[0]);
      const y = lastPointBefore[1] + (end - lastPointBefore[0]) * k;
      points.splice(points.indexOf(firstPointAfter), 0, [end, y]);
    }
  }
}

function resampled(
  points: Array<[number, number]>,
  interval: number,
  keyPointPositions: number[] = [],
): Array<[number, number]> {
  const grouped = new Map<number, Array<[number, number]>>();
  points.forEach((point) => {
    const mergedTick = Math.trunc(point[0] / interval) * interval;
    const list = grouped.get(mergedTick) ?? [];
    list.push(point);
    grouped.set(mergedTick, list);
  });
  const merged = Array.from(grouped.entries())
    .map(([mergedTick, pts]) => {
      const keyPoint = pts.find((it) => keyPointPositions.includes(it[0]));
      return [mergedTick, keyPoint ? keyPoint[1] : pts.reduce((acc, it) => acc + it[1], 0) / pts.length] as [number, number];
    })
    .sort((a, b) => a[0] - b[0]);
  return merged.reduce<Array<[number, number]>>((acc, point) => {
    const lastPoint = acc[acc.length - 1];
    if (!lastPoint) return [point];
    return [...acc, ...(interpolateLinear([lastPoint, point], interval) ?? []).slice(1)];
  }, []);
}

