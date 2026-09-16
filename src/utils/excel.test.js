import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs/dist/exceljs.min.js";
import { readFirstWorksheetObjects, readWorkbookRows } from "./excel.js";

describe("excel adapter", () => {
  it("reads worksheet rows and normalized header objects from a real XLSX buffer", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Usuarios");
    sheet.addRow(["Nombre", "Correo"]);
    sheet.addRow(["Ada", "ada@riwi.io"]);
    const buffer = await workbook.xlsx.writeBuffer();

    await expect(readWorkbookRows(buffer)).resolves.toEqual([
      [["Nombre", "Correo"], ["Ada", "ada@riwi.io"]],
    ]);
    await expect(readFirstWorksheetObjects(buffer)).resolves.toEqual([
      { Nombre: "Ada", Correo: "ada@riwi.io" },
    ]);
  });
});
