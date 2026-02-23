import type { Tempo } from "./Tempo";
import type { TimeSignature } from "./TimeSignature";
import type { Track } from "./Track";

export type ImportWarning =
  | { kind: "TempoNotFound" }
  | { kind: "TempoIgnoredInFile"; tempo: Tempo; fileName: string }
  | { kind: "TempoIgnoredInTrack"; tempo: Tempo; track: Track }
  | { kind: "TempoIgnoredInPreMeasure"; tempo: Tempo }
  | { kind: "DefaultTempoFixed"; originalBpm: number }
  | { kind: "TimeSignatureNotFound" }
  | { kind: "TimeSignatureIgnoredInTrack"; timeSignature: TimeSignature; track: Track }
  | { kind: "TimeSignatureIgnoredInPreMeasure"; timeSignature: TimeSignature }
  | {
      kind: "IncompatibleFormatSerializationVersion";
      currentVersion: string;
      dataVersion: string;
    };
