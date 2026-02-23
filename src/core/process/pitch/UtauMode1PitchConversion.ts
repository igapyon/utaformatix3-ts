import type { Note } from "../../model/Note";
import type { Pitch } from "../../model/Pitch";
import { dotResampled } from "../Resampling";
import { getAbsoluteData } from "./PitchCalculation";

export interface UtauMode1TrackPitchData {
  notes: Array<UtauMode1NotePitchData | null>;
}

export interface UtauMode1NotePitchData {
  pitchPoints: number[] | null;
}

const MODE1_PITCH_SAMPLING_INTERVAL_TICK = 5;

export function pitchFromUtauMode1Track(
  pitchData: UtauMode1TrackPitchData | null | undefined,
  notes: Note[],
): Pitch | null {
  if (!pitchData) {
    return null;
  }
  const pitchPoints: Array<[number, number]> = [];
  notes.forEach((note, index) => {
    const data = pitchData.notes[index];
    if (!data?.pitchPoints) {
      return;
    }
    data.pitchPoints.forEach((value, pointIndex) => {
      pitchPoints.push([note.tickOn + pointIndex * MODE1_PITCH_SAMPLING_INTERVAL_TICK, value / 100]);
    });
  });
  const absolute = getAbsoluteData({ data: pitchPoints.map(([t, v]) => [t, v]), isAbsolute: false }, notes);
  return absolute ? { data: absolute, isAbsolute: true } : null;
}

export function pitchToUtauMode1Track(
  pitch: Pitch | null | undefined,
  notes: Note[],
): UtauMode1TrackPitchData | null {
  if (!pitch) {
    return null;
  }
  const absolute = getAbsoluteData(pitch, notes);
  return {
    notes: notes.map((note) => {
      const inRange = (absolute ?? []).filter((it) => it[0] >= note.tickOn && it[0] < note.tickOff);
      const resampled = dotResampled(inRange, MODE1_PITCH_SAMPLING_INTERVAL_TICK);
      return {
        pitchPoints: resampled.map(([, value]) => ((value ?? note.key) - note.key) * 100),
      };
    }),
  };
}

