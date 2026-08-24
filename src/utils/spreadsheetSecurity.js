const SPREADSHEET_EXTENSIONS = [".xlsx", ".xls"];
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export const MAX_SPREADSHEET_BYTES = 5 * 1024 * 1024;

export function assertSafeSpreadsheetFile(file) {
  const fileName = String(file?.name || "").toLowerCase();
  const hasAllowedExtension = SPREADSHEET_EXTENSIONS.some((extension) =>
    fileName.endsWith(extension),
  );

  if (!file || !hasAllowedExtension) {
    throw new Error("Unsupported spreadsheet file type");
  }

  if (file.size > MAX_SPREADSHEET_BYTES) {
    throw new Error("Spreadsheet file is too large");
  }
}

export function sanitizeSpreadsheetRows(rows) {
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    if (Array.isArray(row)) return row;
    if (!row || typeof row !== "object") return row;

    const safeRow = Object.create(null);
    for (const key of Object.keys(row)) {
      if (DANGEROUS_KEYS.has(key)) continue;
      safeRow[key] = row[key];
    }

    return safeRow;
  });
}
