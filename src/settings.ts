export interface CreatedDailyNoteSyncSettings {
  fallbackDailyFolder: string;
  fallbackTemplatePath: string;
  excludedFolders: string[];
  showFileProgress: boolean;
}

export const DEFAULT_SETTINGS: CreatedDailyNoteSyncSettings = {
  fallbackDailyFolder: "日记",
  fallbackTemplatePath: "文章模板/日记模板.md",
  excludedFolders: ["日记"],
  showFileProgress: true,
};

export interface EffectiveDailyNoteConfig {
  folder: string;
  templatePath: string;
}

export interface DailyNotesJsonConfig {
  folder?: string;
  template?: string;
}

export function readStringProperty(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function parseDailyNotesJson(text: string): DailyNotesJsonConfig | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  return {
    folder: readStringProperty(record, "folder"),
    template: readStringProperty(record, "template"),
  };
}
