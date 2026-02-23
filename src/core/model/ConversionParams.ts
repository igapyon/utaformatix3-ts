export interface ConversionParams {
  convertPitch: boolean;
}

export function getDefaultConversionParams(): ConversionParams {
  return {
    convertPitch: false,
  };
}
