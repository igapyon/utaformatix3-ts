import type { Note } from "../model/Note";
import type { Track } from "../model/Track";

function noteLength(note: Note): number {
  return note.tickOff - note.tickOn;
}

export function validateNotes(notes: Note[]): Note[] {
  if (notes.length === 0) {
    return notes;
  }

  const sorted = [...notes].sort((a, b) => a.tickOn - b.tickOn);
  const validated: Note[] = [];

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const clipped: Note = {
      ...current,
      tickOff: Math.min(current.tickOff, next.tickOn),
    };
    if (noteLength(clipped) > 0) {
      validated.push(clipped);
    }
  }

  validated.push(sorted[sorted.length - 1]);

  return validated.map((note, index) => ({
    ...note,
    id: index,
  }));
}

export function validateTrackNotes(track: Track): Track {
  return {
    ...track,
    notes: validateNotes(track.notes),
  };
}
