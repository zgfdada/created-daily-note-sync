import { Menu, Notice, Plugin, TAbstractFile, TFile } from "obsidian";
import { DailyNoteService, ScanProgressReporter, showResultNotice } from "./daily-note-service";
import { CreatedDailyNoteSyncSettingTab } from "./settings-tab";
import { CreatedDailyNoteSyncSettings, DEFAULT_SETTINGS } from "./settings";

const MODIFY_DEBOUNCE_MS = 1200;

class NoticeProgressReporter implements ScanProgressReporter {
  private readonly notice: Notice;
  private readonly showFileProgress: boolean;

  public constructor(initialMessage: string, showFileProgress: boolean) {
    this.notice = new Notice(initialMessage, 0);
    this.showFileProgress = showFileProgress;
  }

  public update(message: string): void {
    if (this.showFileProgress || message.startsWith("已创建日记")) {
      this.notice.setMessage(message);
    }
  }

  public finish(message: string): void {
    this.notice.setMessage(message);
    window.setTimeout(() => {
      this.notice.hide();
    }, 8000);
  }
}

export default class CreatedDailyNoteSyncPlugin extends Plugin {
  public settings: CreatedDailyNoteSyncSettings = { ...DEFAULT_SETTINGS };
  private service!: DailyNoteService;
  private readonly modifyTimers = new Map<string, number>();

  public async onload(): Promise<void> {
    await this.loadSettings();
    this.service = new DailyNoteService(this.app, () => this.settings);

    this.addSettingTab(new CreatedDailyNoteSyncSettingTab(this.app, this));

    this.addCommand({
      id: "scan-and-create-missing-daily-notes",
      name: "全盘扫描并补全缺失日记",
      callback: () => {
        void this.scanAllWithNotice();
      },
    });

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu: Menu, file: TAbstractFile) => {
        menu.addItem((item) => {
          item
            .setTitle("全盘扫描并补全缺失日记")
            .setIcon("calendar-plus")
            .onClick(() => {
              void this.scanAllWithNotice();
            });
        });

        if (file instanceof TFile && file.extension === "md") {
          menu.addItem((item) => {
            item
              .setTitle("根据当前笔记 created 补建日记")
              .setIcon("calendar-check")
              .onClick(() => {
                void this.ensureForFileWithNotice(file);
              });
          });
        }
      }),
    );

    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file instanceof TFile && file.extension === "md") {
          this.scheduleEnsureForFile(file);
        }
      }),
    );

    this.register(() => {
      for (const timer of this.modifyTimers.values()) {
        window.clearTimeout(timer);
      }
      this.modifyTimers.clear();
    });

    new Notice("Created daily note sync 已启动，正在监听 created 字段。", 5000);
  }

  public onunload(): void {
    for (const timer of this.modifyTimers.values()) {
      window.clearTimeout(timer);
    }
    this.modifyTimers.clear();
  }

  public async loadSettings(): Promise<void> {
    const loaded = (await this.loadData()) as Partial<CreatedDailyNoteSyncSettings> | null;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loaded,
      excludedFolders: Array.isArray(loaded?.excludedFolders)
        ? loaded.excludedFolders.filter((item): item is string => typeof item === "string")
        : DEFAULT_SETTINGS.excludedFolders,
    };
  }

  public async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private scheduleEnsureForFile(file: TFile): void {
    const existingTimer = this.modifyTimers.get(file.path);
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
    }

    const timer = window.setTimeout(() => {
      this.modifyTimers.delete(file.path);
      void this.ensureForFileWithNotice(file);
    }, MODIFY_DEBOUNCE_MS);

    this.modifyTimers.set(file.path, timer);
  }

  private async ensureForFileWithNotice(file: TFile): Promise<void> {
    const result = await this.service.ensureDailyNoteForFile(file);
    showResultNotice(result);
  }

  private async scanAllWithNotice(): Promise<void> {
    const reporter = new NoticeProgressReporter("开始全盘扫描 created 日期……", this.settings.showFileProgress);
    const summary = await this.service.scanAll(reporter);
    reporter.finish(this.service.summarizeScan(summary));
  }
}

