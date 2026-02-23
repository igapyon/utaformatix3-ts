import type { Project } from "./Project";
import { getNoteLength } from "./Note";

function assertSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${label} must be a safe integer: ${value}`);
  }
}

export function assertProjectInvariants(project: Project): void {
  if (project.ppq <= 0) {
    throw new Error(`ppq must be > 0: ${project.ppq}`);
  }
  assertSafeInteger(project.ppq, "ppq");

  for (const tempo of project.tempos) {
    if (tempo.bpm <= 0) {
      throw new Error(`tempo.bpm must be > 0: ${tempo.bpm}`);
    }
    assertSafeInteger(tempo.tickPosition, "tempo.tickPosition");
  }

  for (const track of project.tracks) {
    for (const note of track.notes) {
      assertSafeInteger(note.tickOn, "note.tickOn");
      assertSafeInteger(note.tickOff, "note.tickOff");
      if (note.tickOn < 0) {
        throw new Error(`note.tickOn must be >= 0: ${note.tickOn}`);
      }
      if (note.tickOn >= note.tickOff) {
        throw new Error(
          `note.tickOn must be < note.tickOff: tickOn=${note.tickOn}, tickOff=${note.tickOff}`,
        );
      }
      const length = getNoteLength(note);
      if (length <= 0) {
        throw new Error(`note length must be > 0: ${length}`);
      }
    }
  }
}
