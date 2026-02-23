import type { Note } from "../../model/Note";
import type { Pitch } from "../../model/Pitch";

export interface VocaloidPartPitchDataEvent {
  pos: number;
  value: number;
}

export interface VocaloidPartPitchData {
  startPos: number;
  pit: VocaloidPartPitchDataEvent[];
  pbs: VocaloidPartPitchDataEvent[];
}

const PITCH_MAX_VALUE = 8191;
const DEFAULT_PITCH_BEND_SENSITIVITY = 2;
const MIN_BREAK_LENGTH_BETWEEN_PITCH_SECTIONS = 480;
const BORDER_APPEND_RADIUS = 5;

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
      throw new Error("Notes overlapping");
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
  for (let i = 0; i < notes.length - 1; i += 1) {
    const lastNote = notes[i];
    const thisNote = notes[i + 1];
    if (thisNote.tickOn - lastNote.tickOff > radius) {
      continue;
    }
    const firstIndex = result.findIndex((it) => it[0] >= thisNote.tickOn);
    if (firstIndex < 0) {
      continue;
    }
    const firstPoint = result[firstIndex];
    if (firstPoint[0] === thisNote.tickOn || firstPoint[0] - thisNote.tickOn > radius) {
      continue;
    }
    const postValue = firstPoint[1];
    if (postValue == null) {
      continue;
    }
    const newPointTick = thisNote.tickOn - radius;
    const newPoint: [number, number | null] = [newPointTick, postValue];
    result.splice(firstIndex, 0, newPoint);
    for (let j = result.length - 1; j >= 0; j -= 1) {
      const point = result[j];
      if (point === newPoint) {
        continue;
      }
      if (point[0] >= newPointTick && point[0] < thisNote.tickOn) {
        result.splice(j, 1);
      }
    }
  }
  return result;
}

export function getRelativePitchData(
  pitch: Pitch,
  notes: Note[],
  borderAppendRadius = 0,
): Array<[number, number]> | null {
  if (!pitch.isAbsolute) {
    return pitch.data
      .map(([pos, value]) => [pos, value] as [number, number | null])
      .filter((it): it is [number, number] => it[1] != null)
      .map(([pos, value]) => [pos, value]);
  }
  if (notes.length === 0) {
    return null;
  }
  const borders = getBorders(notes);
  let index = 0;
  let currentNoteKey = notes[0].key;
  let nextBorder = borders[0] ?? Number.POSITIVE_INFINITY;
  const converted = pitch.data.map(([pos, value]) => {
    while (pos >= nextBorder) {
      index += 1;
      nextBorder = borders[index] ?? Number.POSITIVE_INFINITY;
      currentNoteKey = notes[index].key;
    }
    const convertedValue = value != null ? value - currentNoteKey : 0.0;
    return [pos, convertedValue] as [number, number | null];
  });
  const withBorders = appendPointsAtBorders(converted, notes, borderAppendRadius);
  return withBorders
    .filter((it): it is [number, number] => it[1] != null)
    .map(([pos, value]) => [pos, value]);
}

export function pitchFromVocaloidParts(dataByParts: VocaloidPartPitchData[]): Pitch | null {
  const pitchRawDataByPart = dataByParts.map((part) => {
    const pit = part.pit;
    const pbs = part.pbs;
    const pitMultipliedByPbs = new Map<number, number>();
    let pitIndex = 0;
    let pbsCurrentValue = DEFAULT_PITCH_BEND_SENSITIVITY;
    for (const pbsEvent of pbs) {
      for (let i = pitIndex; i <= pit.length - 1; i += 1) {
        const pitEvent = pit[i];
        if (pitEvent.pos < pbsEvent.pos) {
          pitMultipliedByPbs.set(pitEvent.pos, pitEvent.value * pbsCurrentValue);
          if (i === pit.length - 1) {
            pitIndex = i;
          }
        } else {
          pitIndex = i;
          break;
        }
      }
      pbsCurrentValue = pbsEvent.value;
    }
    if (pitIndex < pit.length - 1) {
      for (let i = pitIndex; i <= pit.length - 1; i += 1) {
        const pitEvent = pit[i];
        pitMultipliedByPbs.set(pitEvent.pos, pitEvent.value * pbsCurrentValue);
      }
    }
    return Array.from(pitMultipliedByPbs.entries()).map(
      ([pos, value]) => [pos + part.startPos, value] as [number, number],
    );
  });

  const pitchRawData = pitchRawDataByPart.reduce<Array<[number, number]>>((accumulator, element) => {
    const firstPos = element[0]?.[0];
    if (firstPos == null) {
      return accumulator;
    }
    const firstInvalidIndexInPrevious = accumulator.findIndex((it) => it[0] >= firstPos);
    if (firstInvalidIndexInPrevious < 0) {
      return accumulator.concat(element);
    }
    return accumulator.slice(0, firstInvalidIndexInPrevious).concat(element);
  }, []);

  const data = pitchRawData.map(([pos, value]) => [pos, value / PITCH_MAX_VALUE] as [number, number | null]);
  if (data.length === 0) {
    return null;
  }
  return {
    data,
    isAbsolute: false,
  };
}

export function generateForVocaloid(pitch: Pitch, notes: Note[]): VocaloidPartPitchData | null {
  const data = getRelativePitchData(pitch, notes, BORDER_APPEND_RADIUS);
  if (!data) {
    return null;
  }
  const pitchSectioned: Array<Array<[number, number]>> = [];
  let currentPos = 0;
  for (const pitchEvent of data) {
    if (pitchSectioned.length === 0) {
      pitchSectioned.push([pitchEvent]);
    } else if (pitchEvent[0] - currentPos >= MIN_BREAK_LENGTH_BETWEEN_PITCH_SECTIONS) {
      pitchSectioned.push([pitchEvent]);
    } else {
      pitchSectioned[pitchSectioned.length - 1].push(pitchEvent);
    }
    currentPos = pitchEvent[0];
  }
  const pit: VocaloidPartPitchDataEvent[] = [];
  const pbs: VocaloidPartPitchDataEvent[] = [];
  for (const section of pitchSectioned) {
    const maxAbsValue = section.reduce((acc, it) => Math.max(acc, Math.abs(it[1])), 0);
    let pbsForThisSection = Math.ceil(Math.abs(maxAbsValue));
    if (pbsForThisSection > DEFAULT_PITCH_BEND_SENSITIVITY) {
      pbs.push({ pos: section[0][0], value: pbsForThisSection });
      pbs.push({
        pos: section[section.length - 1][0] + MIN_BREAK_LENGTH_BETWEEN_PITCH_SECTIONS / 2,
        value: DEFAULT_PITCH_BEND_SENSITIVITY,
      });
    } else {
      pbsForThisSection = DEFAULT_PITCH_BEND_SENSITIVITY;
    }
    for (const [pitchPos, pitchValue] of section) {
      pit.push({
        pos: pitchPos,
        value: Math.max(
          -PITCH_MAX_VALUE,
          Math.min(PITCH_MAX_VALUE, Math.round((pitchValue * PITCH_MAX_VALUE) / pbsForThisSection)),
        ),
      });
    }
  }
  return {
    startPos: 0,
    pit,
    pbs,
  };
}
