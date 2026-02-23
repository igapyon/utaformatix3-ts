import { Format } from "./Format";
import type { Project } from "./Project";

export enum Feature {
  ConvertPitch = "ConvertPitch",
  SplitProject = "SplitProject",
  ConvertPhonemes = "ConvertPhonemes",
}

export function isFeatureAvailable(feature: Feature, project: Project): boolean {
  switch (feature) {
    case Feature.ConvertPitch:
      return project.tracks.some((track) => track.pitch != null);
    case Feature.SplitProject:
      return true;
    case Feature.ConvertPhonemes:
      return project.tracks.some((track) =>
        track.notes.some((note) => note.phoneme !== undefined && note.phoneme !== null),
      );
  }
}

export type FeatureConfig =
  | { kind: "ConvertPitch"; type: Feature.ConvertPitch }
  | { kind: "SplitProject"; type: Feature.SplitProject; maxTrackCount: number };

export function getDefaultSplitProjectFeatureConfig(format: Format): FeatureConfig {
  return {
    kind: "SplitProject",
    type: Feature.SplitProject,
    maxTrackCount: format === Format.Svp ? 3 : 1,
  };
}

export function containsFeatureConfig(featureConfigs: FeatureConfig[], feature: Feature): boolean {
  return featureConfigs.some((featureConfig) => featureConfig.type === feature);
}
