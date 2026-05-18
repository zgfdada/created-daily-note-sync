import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { CreatedDailyNoteSyncSettings } from "./settings";

export interface SettingsPluginHost extends Plugin {
  settings: CreatedDailyNoteSyncSettings;
  saveSettings(): Promise<void>;
}

export class CreatedDailyNoteSyncSettingTab extends PluginSettingTab {
  public constructor(app: App, private readonly plugin: SettingsPluginHost) {
    super(app, plugin);
  }

  public display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("常规设置").setHeading();
    containerEl.createEl("p", {
      text: "插件会优先读取 Obsidian 每日笔记配置；读取失败时使用下面的后备配置。",
    });

    new Setting(containerEl)
      .setName("后备日记目录")
      .setDesc("当无法读取每日笔记配置时，使用这个目录创建日记。")
      .addText((text) => {
        text
          .setPlaceholder("日记")
          .setValue(this.plugin.settings.fallbackDailyFolder)
          .onChange(async (value) => {
            this.plugin.settings.fallbackDailyFolder = value.trim() || "日记";
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("后备日记模板")
      .setDesc("当无法读取每日笔记模板配置时，使用这个模板路径。可以不写 .md。")
      .addText((text) => {
        text
          .setPlaceholder("文章模板/日记模板.md")
          .setValue(this.plugin.settings.fallbackTemplatePath)
          .onChange(async (value) => {
            this.plugin.settings.fallbackTemplatePath = value.trim() || "文章模板/日记模板.md";
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("扫描排除目录")
      .setDesc("逗号分隔。插件会自动排除日记目录，这里可额外排除附件、归档等目录。")
      .addTextArea((text) => {
        text
          .setPlaceholder("日记, 附件")
          .setValue(this.plugin.settings.excludedFolders.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.excludedFolders = value
              .split(",")
              .map((item) => item.trim())
              .filter((item) => item.length > 0);
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("全盘扫描时显示当前文件")
      .setDesc("开启后，全盘扫描会在右上角通知里实时显示当前扫描到的文件。")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.showFileProgress).onChange(async (value) => {
          this.plugin.settings.showFileProgress = value;
          await this.plugin.saveSettings();
        });
      });
  }
}


