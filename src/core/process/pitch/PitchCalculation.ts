import { KEY_CENTER_C, LOG_FRQ_CENTER_C, LOG_FRQ_DIFF_ONE_KEY } from "../../model/Constants";
import type { Note } from "../../model/Note";
import type { Pitch } from "../../model/Pitch";

export function loggedFrequencyToKey(value: number): number {
  return KEY_CENTER_C + (value - LOG_FRQ_CENTER_C) / LOG_FRQ_DIFF_ONE_KEY;
}

export function keyToLoggedFrequency(value: number): number {
  return (value - KEY_CENTER_C) * LOG_FRQ_DIFF_ONE_KEY + LOG_FRQ_CENTER_C;
}

function getBorders(notes: Note[]): number[] {
  const borders: number[] = [];
  let pos = -1;
  for (const note of notes) {
    if (pos < 0) {
      pos = note.tickOff;
      continue;
    }
    if (pos === note.tickOn) {
      borders.push(pos);
    } else if (pos < note.tickOn) {
      borders.push(Math.trunc((note.tickOn + pos) / 2));
    } else {
      throw new Error("NotesOverlappingException");
    }
    pos = note.tickOff;
  }
  return borders;
}

function appendPointsAtBorders(
  points: Array<[number, number | null]>,
  notes: Note[],
  radius: number,
): Array<[number, number | null]> {
  if (radius <= 0) {
    return points;
  }
  const result = [...points];
  notes.slice(0, -1).forEach((lastNote, index) => {
    const thisNote = notes[index + 1];
    if (thisNote.tickOn - lastNote.tickOff > radius) {
      return;
    }
    const firstPointAtThisNoteIndex = result.findIndex((it) => it[0] >= thisNote.tickOn);
    if (firstPointAtThisNoteIndex < 0) {
      return;
    }
    const firstPointAtThisNote = result[firstPointAtThisNoteIndex];
    if (
      firstPointAtThisNote[0] === thisNote.tickOn ||
      firstPointAtThisNote[0] - thisNote.tickOn > radius
    ) {
      return;
    }
    const postValue = firstPointAtThisNote[1];
    if (postValue == null) {
      return;
    }
    const newPointTick = thisNote.tickOn - radius;
    const newPoint: [number, number | null] = [newPointTick, postValue];
    result.splice(firstPointAtThisNoteIndex, 0, newPoint);
    for (let i = result.length - 1; i >= 0; i -= 1) {
      if (result[i][0] >= newPointTick && result[i][0] < thisNote.tickOn && result[i] !== newPoint) {
        result.splice(i, 1);
      }
    }
  });
  return result;
}

function convertRelativity(
  pitch: Pitch,
  notes: Note[],
  toAbsolute: boolean,
  borderAppendRadius = 0,
): Array<[number, number | null]> | null {
  if (pitch.isAbsolute && toAbsolute) {
    return pitch.data;
  }
  if (!pitch.isAbsolute && !toAbsolute) {
    return pitch.data;
  }
  if (notes.length === 0) {
    return null;
  }
  const borders = getBorders(notes);
  let index = 0;
  let currentNoteKey = notes[0].key;
  let nextBorder = borders[0] ?? Number.MAX_SAFE_INTEGER;
  const converted = pitch.data.map(([pos, value]) => {
    while (pos >= nextBorder) {
      index += 1;
      nextBorder = borders[index] ?? Number.MAX_SAFE_INTEGER;
      currentNoteKey = notes[index].key;
    }
    const convertedValue =
      value != null
        ? pitch.isAbsolute
          ? value - currentNoteKey
          : value === 0.0
          ? null
          : value + currentNoteKey
        : 0.0;
    return [pos, convertedValue] as [number, number | null];
  });
  return !toAbsolute ? appendPointsAtBorders(converted, notes, borderAppendRadius) : converted;
}

export function getAbsoluteData(pitch: Pitch, notes: Note[]): Array<[number, number | null]> | null {
  return convertRelativity(pitch, notes, true);
}

export function getRelativeData(
  pitch: Pitch,
  notes: Note[],
  borderAppendRadius = 0,
): Array<[number, number]> | null {
  return (
    convertRelativity(pitch, notes, false, borderAppendRadius)
    ?.filter((pair): pair is [number, number] => pair[1] != null)
    .map(([pos, value]) => [pos, value]) ?? null
  );
}

export function appendPitchPointsForInterpolation(
  points: Array<[number, number]>,
  intervalTick: number,
): Array<[number, number]> {
  if (points.length === 0) {
    return [];
  }
  return [points[0]].concat(
    points.slice(0, -1).flatMap((lastPoint, index) => {
      const thisPoint = points[index + 1];
      const tickDiff = thisPoint[0] - lastPoint[0];
      const newPoint =
        tickDiff < intervalTick
          ? null
          : tickDiff < 2 * intervalTick
          ? ([Math.trunc((thisPoint[0] + lastPoint[0]) / 2), lastPoint[1]] as [number, number])
          : ([thisPoint[0] - intervalTick, lastPoint[1]] as [number, number]);
      return newPoint ? [newPoint, thisPoint] : [thisPoint];
    }),
  );
}

export function reduceRepeatedPitchPoints(points: Array<[number, number]>): Array<[number, number]> {
  const toBeRemoved = new Set<number>();
  let currentRepeatedValue: number | null = null;
  let prevPoint: [number, number] | null = null;
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    if (prevPoint == null) {
      prevPoint = point;
      continue;
    }
    if (currentRepeatedValue == null) {
      if (prevPoint[1] === point[1]) {
        currentRepeatedValue = point[1];
      }
      prevPoint = point;
      continue;
    }
    if (currentRepeatedValue === point[1]) {
      toBeRemoved.add(i - 1);
    } else {
      currentRepeatedValue = null;
    }
    prevPoint = point;
  }
  return points.filter((_, index) => !toBeRemoved.has(index));
}
