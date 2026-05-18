import { App, Notice, TFile } from "obsidian";
import { normalizeCreatedDate } from "./date-utils";
import { makeDailyNotePath, normalizeVaultFolder, shouldSkipFile } from "./path-utils";
import {
  CreatedDailyNoteSyncSettings,
  DailyNotesJsonConfig,
  DEFAULT_SETTINGS,
  EffectiveDailyNoteConfig,
  parseDailyNotesJson,
} from "./settings";

export type EnsureStatus = "created" | "exists" | "missing-created" | "invalid-created" | "skipped" | "error";

export interface EnsureResult {
  status: EnsureStatus;
  filePath: string;
  dateText?: string;
  dailyNotePath?: string;
  message: string;
}

export interface ScanSummary {
  scanned: number;
  created: number;
  existed: number;
  missingCreated: number;
  invalidCreated: number;
  skipped: number;
  errors: number;
  createdPaths: string[];
}

export interface ScanProgressReporter {
  update(message: string): void;
}

const DAILY_NOTES_CONFIG_FILE = "daily-notes.json";

export class DailyNoteService {
  public constructor(
    private readonly app: App,
    private readonly getSettings: () => CreatedDailyNoteSyncSettings,
  ) {}

  public async getEffectiveConfig(): Promise<EffectiveDailyNoteConfig> {
    const settings = this.getSettings();
    const dailyNotesConfig = await this.readDailyNotesConfig();

    const folder = normalizeVaultFolder(dailyNotesConfig?.folder ?? settings.fallbackDailyFolder);
    const templatePath = ensureMarkdownExtension(
      normalizeVaultFolder(dailyNotesConfig?.template ?? settings.fallbackTemplatePath),
    );

    return {
      folder: folder || DEFAULT_SETTINGS.fallbackDailyFolder,
      templatePath: templatePath || DEFAULT_SETTINGS.fallbackTemplatePath,
    };
  }

  public async ensureDailyNoteForFile(file: TFile): Promise<EnsureResult> {
    const config = await this.getEffectiveConfig();
    const excludedFolders = this.getExcludedFolders(config.folder);

    if (shouldSkipFile(file.path, excludedFolders)) {
      return {
        status: "skipped",
        filePath: file.path,
        message: `已跳过：${file.path}`,
      };
    }

    const createdValue = this.getCreatedValue(file);
    if (isBlankCreatedValue(createdValue)) {
      return {
        status: "missing-created",
        filePath: file.path,
        message: `未发现 created：${file.path}`,
      };
    }

    const dateText = normalizeCreatedDate(createdValue);
    if (!dateText) {
      return {
        status: "invalid-created",
        filePath: file.path,
        message: `created 日期无效：${file.path}`,
      };
    }

    return this.ensureDailyNote(dateText, file.path, config);
  }

  public async scanAll(progress?: ScanProgressReporter): Promise<ScanSummary> {
    const summary: ScanSummary = {
      scanned: 0,
      created: 0,
      existed: 0,
      missingCreated: 0,
      invalidCreated: 0,
      skipped: 0,
      errors: 0,
      createdPaths: [],
    };

    const files = this.app.vault.getMarkdownFiles();
    for (const file of files) {
      summary.scanned += 1;
      progress?.update(`正在扫描：${file.path}`);

      const result = await this.ensureDailyNoteForFile(file);
      this.applyResultToSummary(summary, result);

      if (result.status === "created" && result.dailyNotePath) {
        progress?.update(`已创建日记：${result.dailyNotePath}`);
      }
    }

    return summary;
  }

  public summarizeScan(summary: ScanSummary): string {
    return [
      "created 日记补全扫描完成。",
      `扫描文件：${summary.scanned} 个`,
      `新建日记：${summary.created} 篇`,
      `已存在：${summary.existed} 篇`,
      `无 created：${summary.missingCreated} 篇`,
      `日期无效：${summary.invalidCreated} 篇`,
      `跳过：${summary.skipped} 篇`,
      `错误：${summary.errors} 个`,
    ].join("\n");
  }

  private async readDailyNotesConfig(): Promise<DailyNotesJsonConfig | null> {
    try {
      const configPath = `${this.app.vault.configDir}/${DAILY_NOTES_CONFIG_FILE}`;
      const exists = await this.app.vault.adapter.exists(configPath, true);
      if (!exists) {
        return null;
      }
      const text = await this.app.vault.adapter.read(configPath);
      return parseDailyNotesJson(text);
    } catch {
      return null;
    }
  }

  private getCreatedValue(file: TFile): unknown {
    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter;
    return frontmatter?.created;
  }

  private async ensureDailyNote(
    dateText: string,
    sourcePath: string,
    config: EffectiveDailyNoteConfig,
  ): Promise<EnsureResult> {
    const dailyNotePath = makeDailyNotePath(config.folder, dateText);
    const existing = this.app.vault.getAbstractFileByPath(dailyNotePath);
    if (existing) {
      return {
        status: "exists",
        filePath: sourcePath,
        dateText,
        dailyNotePath,
        message: `日记已存在：${dailyNotePath}`,
      };
    }

    try {
      await this.ensureParentFolder(dailyNotePath);
      const content = await this.getDailyNoteContent(dateText, config.templatePath);
      await this.app.vault.create(dailyNotePath, content);
      return {
        status: "created",
        filePath: sourcePath,
        dateText,
        dailyNotePath,
        message: `已创建日记：${dailyNotePath}`,
      };
    } catch (error) {
      return {
        status: "error",
        filePath: sourcePath,
        dateText,
        dailyNotePath,
        message: `创建日记失败：${dailyNotePath}；${formatError(error)}`,
      };
    }
  }

  private async getDailyNoteContent(dateText: string, templatePath: string): Promise<string> {
    const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
    if (templateFile instanceof TFile) {
      const templateContent = await this.app.vault.read(templateFile);
      return ensureTrailingNewline(renderTemplate(templateContent, dateText));
    }

    return ensureTrailingNewline([
      "---",
      "tags:",
      "  - 日记",
      "---",
      "",
      `# ${dateText}`,
      "",
      "此日记由 Created Daily Note Sync 根据文章 created 字段自动创建。",
      "",
    ].join("\n"));
  }

  private async ensureParentFolder(filePath: string): Promise<void> {
    const parts = filePath.split("/").slice(0, -1);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(current)) {
        await this.app.vault.createFolder(current);
      }
    }
  }

  private getExcludedFolders(dailyFolder: string): string[] {
    const settings = this.getSettings();
    return Array.from(new Set([dailyFolder, ...settings.excludedFolders])).filter((folder) => folder.trim().length > 0);
  }

  private applyResultToSummary(summary: ScanSummary, result: EnsureResult): void {
    switch (result.status) {
      case "created":
        summary.created += 1;
        if (result.dailyNotePath) {
          summary.createdPaths.push(result.dailyNotePath);
        }
        break;
      case "exists":
        summary.existed += 1;
        break;
      case "missing-created":
        summary.missingCreated += 1;
        break;
      case "invalid-created":
        summary.invalidCreated += 1;
        break;
      case "skipped":
        summary.skipped += 1;
        break;
      case "error":
        summary.errors += 1;
        break;
    }
  }
}

export function isBlankCreatedValue(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

export function ensureMarkdownExtension(path: string): string {
  if (!path) {
    return "";
  }
  return path.toLowerCase().endsWith(".md") ? path : `${path}.md`;
}

export function ensureTrailingNewline(content: string): string {
  return content.endsWith("\n") ? content : `${content}\n`;
}

export function renderTemplate(content: string, dateText: string): string {
  return content
    .replace(/\{\{\s*date\s*\}\}/giu, dateText)
    .replace(/\{\{\s*title\s*\}\}/giu, dateText);
}

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function showResultNotice(result: EnsureResult): void {
  if (result.status === "created") {
    new Notice(result.message, 6000);
  } else if (result.status === "invalid-created" || result.status === "error") {
    new Notice(result.message, 8000);
  }
}





