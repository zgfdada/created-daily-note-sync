import test from "node:test";
import assert from "node:assert/strict";
import { makeDailyNotePath, normalizeVaultFolder, shouldSkipFile } from "../dist-tests/path-utils.js";

test("生成日记路径并规范化斜杠", () => {
  assert.equal(makeDailyNotePath("日记", "2026-05-18"), "日记/2026-05-18.md");
  assert.equal(makeDailyNotePath("日记/", "2026-05-18"), "日记/2026-05-18.md");
  assert.equal(makeDailyNotePath("", "2026-05-18"), "2026-05-18.md");
});

test("规范化 Vault 文件夹路径", () => {
  assert.equal(normalizeVaultFolder("/日记\\子目录/"), "日记/子目录");
  assert.equal(normalizeVaultFolder("."), "");
});

test("扫描时跳过非 Markdown、日记目录和排除目录", () => {
  assert.equal(shouldSkipFile("日记/2026-05-18.md", ["日记"]), true);
  assert.equal(shouldSkipFile("附件/a.png", ["日记"]), true);
  assert.equal(shouldSkipFile("Wiki/a.md", ["日记", "Clippings"]), false);
  assert.equal(shouldSkipFile("Clippings/a.md", ["日记", "Clippings"]), true);
});
