export function normalizeVaultFolder(folder: string): string {
  const normalized = folder.trim().replace(/\\/gu, "/").replace(/^\/+|\/+$/gu, "");
  if (normalized === ".") {
    return "";
  }
  return normalized;
}

export function makeDailyNotePath(folder: string, dateText: string): string {
  const normalizedFolder = normalizeVaultFolder(folder);
  const fileName = `${dateText}.md`;
  return normalizedFolder ? `${normalizedFolder}/${fileName}` : fileName;
}

export function shouldSkipFile(path: string, excludedFolders: string[]): boolean {
  if (!path.toLowerCase().endsWith(".md")) {
    return true;
  }

  const normalizedPath = path.replace(/\\/gu, "/");
  return excludedFolders
    .map(normalizeVaultFolder)
    .filter((folder) => folder.length > 0)
    .some((folder) => normalizedPath === `${folder}.md` || normalizedPath.startsWith(`${folder}/`));
}
