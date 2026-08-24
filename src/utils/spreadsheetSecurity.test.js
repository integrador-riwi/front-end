import { describe, expect, it } from "vitest";
import {
  MAX_SPREADSHEET_BYTES,
  assertSafeSpreadsheetFile,
  sanitizeSpreadsheetRows,
} from "./spreadsheetSecurity.js";

describe("spreadsheetSecurity", () => {
  it("accepts supported spreadsheet files within the size limit", () => {
    expect(() =>
      assertSafeSpreadsheetFile({
        name: "usuarios.xlsx",
        size: MAX_SPREADSHEET_BYTES,
      }),
    ).not.toThrow();
  });

  it("rejects unsupported spreadsheet extensions", () => {
    expect(() =>
      assertSafeSpreadsheetFile({
        name: "usuarios.csv",
        size: 128,
      }),
    ).toThrow("Unsupported spreadsheet file type");
  });

  it("rejects spreadsheets over the size limit before parsing", () => {
    expect(() =>
      assertSafeSpreadsheetFile({
        name: "usuarios.xlsx",
        size: MAX_SPREADSHEET_BYTES + 1,
      }),
    ).toThrow("Spreadsheet file is too large");
  });

  it("drops prototype pollution keys from object rows", () => {
    const row = {
      email: "coder@example.com",
      constructor: "polluted",
      prototype: "polluted",
    };
    Object.defineProperty(row, "__proto__", {
      value: "polluted",
      enumerable: true,
    });

    const [safeRow] = sanitizeSpreadsheetRows([row]);

    expect(safeRow.email).toBe("coder@example.com");
    expect(Object.keys(safeRow)).toEqual(["email"]);
    expect(Object.getPrototypeOf(safeRow)).toBeNull();
  });

  it("preserves array rows used by rubric imports", () => {
    const rows = [["area", "criterio"]];

    expect(sanitizeSpreadsheetRows(rows)).toEqual(rows);
  });
});
