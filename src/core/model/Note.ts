export interface Note {
  id: number;
  key: number;
  lyric: string;
  tickOn: number;
  tickOff: number;
  phoneme?: string | null;
  extras?: Record<string, unknown>;
}

export function getNoteLength(note: Note): number {
  return note.tickOff - note.tickOn;
}
