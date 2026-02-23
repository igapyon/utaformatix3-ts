export interface EncodingLike {
  convert(bytes: number[], toEncoding: string, fromEncoding?: string): number[];
}

export const Encoding: EncodingLike = {
  convert(bytes: number[]): number[] {
    return bytes;
  },
};
