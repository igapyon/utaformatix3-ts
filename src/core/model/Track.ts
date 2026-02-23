import type { Note } from "./Note";
import type { Pitch } from "./Pitch";

export interface Track {
  id: number;
  name: string;
  notes: Note[];
  pitch?: Pitch | null;
  extras?: Record<string, unknown>;
}
