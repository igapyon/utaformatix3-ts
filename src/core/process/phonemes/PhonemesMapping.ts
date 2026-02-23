export interface PhonemesMappingRequest {
  mapText: string;
}

export function getDefaultPhonemesMappingRequest(): PhonemesMappingRequest {
  return {
    mapText: "",
  };
}
