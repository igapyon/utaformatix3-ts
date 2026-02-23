import { DEFAULT_LYRIC } from "./Constants";

export interface ImportParams {
  simpleImport: boolean;
  multipleMode: boolean;
  defaultLyric: string;
}

export function getDefaultImportParams(): ImportParams {
  return {
    simpleImport: false,
    multipleMode: false,
    defaultLyric: DEFAULT_LYRIC,
  };
}
