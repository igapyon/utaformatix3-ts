export type ExportNotification =
  | { kind: "PhonemeResetRequiredVSQ" }
  | { kind: "PhonemeResetRequiredV4" }
  | { kind: "PhonemeResetRequiredV5" }
  | { kind: "TimeSignatureIgnored" }
  | { kind: "PitchDataExported" }
  | { kind: "DataOverLengthLimitIgnored" };
