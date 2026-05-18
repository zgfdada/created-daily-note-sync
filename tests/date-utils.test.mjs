import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCreatedDate } from "../dist-tests/date-utils.js";

test("把常见 created 日期格式归一化为 YYYY-MM-DD", () => {
  assert.equal(normalizeCreatedDate("2026-05-18"), "2026-05-18");
  assert.equal(normalizeCreatedDate("2026/05/18"), "2026-05-18");
  assert.equal(normalizeCreatedDate("2026-05-18T09:30:00+08:00"), "2026-05-18");
});

test("拒绝不存在或非法的 created 日期", () => {
  assert.equal(normalizeCreatedDate(undefined), null);
  assert.equal(normalizeCreatedDate(""), null);
  assert.equal(normalizeCreatedDate("2026-02-30"), null);
  assert.equal(normalizeCreatedDate("not-a-date"), null);
});

test("支持 Date 对象", () => {
  assert.equal(normalizeCreatedDate(new Date("2026-05-18T01:02:03Z")), "2026-05-18");
});
