import type { Project } from "./Project";

export interface ProjectContainer {
  project: Project;
}

export function createProjectContainer(project: Project): ProjectContainer {
  return { project };
}
