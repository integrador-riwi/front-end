const loadExcelJs = async () => (await import("exceljs/dist/exceljs.min.js")).default;

const cellValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value !== "object") return value;
  if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("");
  return value.result ?? value.text ?? "";
};

const rowValues = (row, columns) => Array.from(
  { length: columns },
  (_, index) => cellValue(row.getCell(index + 1).value),
);

export const readWorkbookRows = async (buffer) => {
  const ExcelJS = await loadExcelJs();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook.worksheets.map((worksheet) => {
    const columns = Math.max(worksheet.actualColumnCount, 1);
    return Array.from({ length: worksheet.rowCount }, (_, index) =>
      rowValues(worksheet.getRow(index + 1), columns));
  });
};

export const readFirstWorksheetObjects = async (buffer) => {
  const [rows = []] = await readWorkbookRows(buffer);
  const [headers = [], ...dataRows] = rows;
  const keys = headers.map((header) => String(header || "").trim()).filter(Boolean);
  return dataRows
    .filter((row) => row.some((cell) => String(cell ?? "").trim()))
    .map((row) => Object.fromEntries(keys.map((key, index) => [key, row[index] ?? ""])));
};

export const downloadWorkbook = async ({ rows, sheetName, fileName, widths, properties = {} }) => {
  const ExcelJS = await loadExcelJs();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = properties.author || "TeamUp";
  workbook.company = properties.company || "TeamUp";
  workbook.created = properties.createdAt || new Date();
  workbook.title = properties.title || fileName;
  workbook.subject = properties.subject || "Reporte TeamUp";

  const worksheet = workbook.addWorksheet(sheetName);
  const keys = Object.keys(rows[0] || {});
  worksheet.columns = keys.map((key, index) => ({
    header: key,
    key,
    width: widths?.[index] || 18,
  }));
  rows.forEach((row) => worksheet.addRow(row));
  worksheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};
