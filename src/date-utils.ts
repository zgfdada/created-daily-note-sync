export function normalizeCreatedDate(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return value.toISOString().slice(0, 10);
  }

  const text = valueToDateText(value);
  if (!text) {
    return null;
  }

  const match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/u);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  const monthText = String(month).padStart(2, "0");
  const dayText = String(day).padStart(2, "0");
  return `${year}-${monthText}-${dayText}`;
}

function valueToDateText(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  if (hasToISODate(value)) {
    return value.toISODate().trim();
  }

  return null;
}

function hasToISODate(value: unknown): value is { toISODate: () => string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "toISODate" in value &&
    typeof value.toISODate === "function"
  );
}
