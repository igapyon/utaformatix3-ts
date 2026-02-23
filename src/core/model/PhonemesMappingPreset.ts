import type { Format } from "./Format";
import type { PhonemesMappingRequest } from "../process/phonemes/PhonemesMapping";

export interface PhonemesMappingPreset {
  sourceFormats: Format[];
  targetFormats: Format[];
  name: string;
  phonemesMap: PhonemesMappingRequest;
}
