export interface Pitch {
  data: Array<[number, number | null]>;
  isAbsolute: boolean;
  extras?: Record<string, unknown>;
}
