import type { ExportNotification } from "./ExportNotification";

export interface ExportResult {
  blob: unknown;
  fileName: string;
  notifications: ExportNotification[];
}
