# Created Daily Note Sync

Created Daily Note Sync 是一个 Obsidian 插件，用于根据 Markdown frontmatter 中的 `created` 日期自动补建缺失的日记。

[English README](./README.md)

## 功能

- 插件在 Obsidian 中启用后，会随 Obsidian 启动。
- 自动监听 Markdown 文件修改。
- 读取 frontmatter 中的 `created` 字段。
- 如果对应日期的日记不存在，就自动创建。
- 命令面板提供：`全盘扫描并补全缺失日记`。
- 文件管理器右键菜单提供：
  - `全盘扫描并补全缺失日记`
  - 对 Markdown 文件提供 `根据当前笔记 created 补建日记`
- 插件内命令、菜单、设置页和 Notice 通知均使用中文交互。
- 优先复用 Obsidian 自带“每日笔记”配置，读取失败时再使用插件自己的后备设置。

## 示例

当某篇文章包含：

```yaml
---
created: 2026-05-18
---
```

插件会检查这个日记是否存在：

```text
日记/2026-05-18.md
```

如果不存在，就自动创建。

## 支持的日期格式

支持示例：

```yaml
created: 2026-05-18
created: 2026/05/18
created: 2026-05-18T09:30:00+08:00
```

非法日期会被跳过。

## 配置逻辑

插件会优先读取当前库的 Obsidian 每日笔记核心插件配置：

- 日记目录
- 日记模板

如果每日笔记配置不存在或读取失败，则使用插件设置页中的后备配置：

- 后备日记目录：`日记`
- 后备日记模板：`文章模板/日记模板.md`
- 排除目录：`日记`
- 全盘扫描时显示当前文件：默认开启

## 使用方式

### 自动模式

启用插件后，编辑或保存带有合法 `created` 字段的 Markdown 文件，插件会自动补建对应日期的日记。

### 全盘扫描

打开命令面板，运行：

```text
全盘扫描并补全缺失日记
```

插件会扫描全库 Markdown 文件，并根据合法的 `created` 日期补建缺失日记。

### 右键菜单

在文件管理器中右键，可以执行全盘扫描。对 Markdown 文件右键时，还可以只处理当前文件。

## 本地开发

```bash
npm install
npm test
npm run lint
npm run build
npm run check:bundle
npm audit --omit=dev
```

## 发布资产

创建 GitHub Release 或提交 Obsidian 社区插件时，至少上传：

- `main.js`
- `manifest.json`

当前插件没有自定义样式，因此不需要上传 `styles.css`。

## 审核友好说明

- 源码使用 TypeScript，位于 `src/`。
- 测试位于 `tests/`。
- `main.js` 由 esbuild 生成，不包含 inline sourcemap。
- 运行时代码不依赖 Node 专属模块，例如 `fs`、`path`、`stream`、`Buffer`。
- Vault 文件操作使用 Obsidian Vault API。
- 使用 `Vault#configDir`，不硬编码 `.obsidian`。
- 提交 `package-lock.json`，方便复现依赖安装。

## 许可证

MIT
