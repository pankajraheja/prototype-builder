import * as XLSX from "xlsx";

// ── Types ──────────────────────────────────────────────

export interface ParsedCSV {
  type: "csv";
  headers: string[];
  rows: string[][];
  rowCount: number;
}

export interface ParsedJSON {
  type: "json";
  schema: Record<string, string>;
  sampleData: any;
}

export interface ParsedExcel {
  type: "excel";
  headers: string[];
  rows: string[][];
  sheetName: string;
  rowCount: number;
}

export interface ParsedText {
  type: "text";
  sections: string[];
  wordCount: number;
}

export interface ParsedImage {
  type: "image";
  base64: string;
  mimeType: string;
  sizeKB: number;
}

export type ParsedFile =
  | ParsedCSV
  | ParsedJSON
  | ParsedExcel
  | ParsedText
  | ParsedImage;

// ── CSV ────────────────────────────────────────────────

export function parseCSV(text: string): ParsedCSV {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) {
    return { type: "csv", headers: [], rows: [], rowCount: 0 };
  }

  // Simple CSV split — handles quoted fields with commas
  const splitRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = splitRow(lines[0]);
  const dataLines = lines.slice(1);
  const rows = dataLines.slice(0, 50).map(splitRow);

  return {
    type: "csv",
    headers,
    rows,
    rowCount: dataLines.length,
  };
}

// ── JSON ───────────────────────────────────────────────

export function parseJSON(text: string): ParsedJSON {
  const data = JSON.parse(text);

  // Infer schema from the data
  const inferSchema = (obj: any): Record<string, string> => {
    if (Array.isArray(obj)) {
      if (obj.length === 0) return { _arrayItem: "unknown" };
      return inferSchema(obj[0]);
    }
    if (obj && typeof obj === "object") {
      const schema: Record<string, string> = {};
      for (const [key, val] of Object.entries(obj)) {
        if (Array.isArray(val)) {
          schema[key] = `array(${val.length})`;
        } else if (val && typeof val === "object") {
          schema[key] = "object";
        } else {
          schema[key] = typeof val;
        }
      }
      return schema;
    }
    return { _value: typeof obj };
  };

  // Extract sample: first 5 items if array, otherwise the object itself
  let sampleData: any;
  if (Array.isArray(data)) {
    sampleData = data.slice(0, 5);
  } else {
    sampleData = data;
  }

  return {
    type: "json",
    schema: inferSchema(data),
    sampleData,
  };
}

// ── Excel (XLSX/XLS) ───────────────────────────────────

export function parseExcel(buffer: ArrayBuffer): ParsedExcel {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const raw: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });

  if (raw.length === 0) {
    return { type: "excel", headers: [], rows: [], sheetName, rowCount: 0 };
  }

  const headers = raw[0].map(String);
  const dataRows = raw.slice(1);
  const rows = dataRows.slice(0, 20).map((r) => r.map(String));

  return {
    type: "excel",
    headers,
    rows,
    sheetName,
    rowCount: dataRows.length,
  };
}

// ── Plain Text / Markdown ──────────────────────────────

export function parsePlainText(text: string): ParsedText {
  // Split into sections by blank lines or markdown headings
  const sections = text
    .split(/\n{2,}|(?=^#{1,3}\s)/m)
    .map((s) => s.trim())
    .filter(Boolean);

  const wordCount = text
    .split(/\s+/)
    .filter(Boolean).length;

  return {
    type: "text",
    sections,
    wordCount,
  };
}

// ── Image ──────────────────────────────────────────────

export function parseImage(
  base64: string,
  mimeType: string,
  sizeBytes: number
): ParsedImage {
  return {
    type: "image",
    base64,
    mimeType,
    sizeKB: Math.round(sizeBytes / 1024),
  };
}

// ── Summarize parsed file for LLM context ──────────────

export function summarizeForPrompt(parsed: ParsedFile, fileName: string): string {
  switch (parsed.type) {
    case "csv": {
      const headerLine = parsed.headers.join(", ");
      const sampleRows = parsed.rows
        .slice(0, 5)
        .map((r) => r.join(", "))
        .join("\n");
      return [
        `File: ${fileName} (CSV, ${parsed.rowCount} data rows)`,
        `Headers: ${headerLine}`,
        `Sample data:\n${sampleRows}`,
      ].join("\n");
    }

    case "json": {
      const schemaStr = Object.entries(parsed.schema)
        .map(([k, v]) => `  ${k}: ${v}`)
        .join("\n");
      return [
        `File: ${fileName} (JSON)`,
        `Schema:\n${schemaStr}`,
        `Sample:\n${JSON.stringify(parsed.sampleData, null, 2).slice(0, 2000)}`,
      ].join("\n");
    }

    case "excel": {
      const headerLine = parsed.headers.join(", ");
      const sampleRows = parsed.rows
        .slice(0, 5)
        .map((r) => r.join(", "))
        .join("\n");
      return [
        `File: ${fileName} (Excel, sheet: "${parsed.sheetName}", ${parsed.rowCount} data rows)`,
        `Headers: ${headerLine}`,
        `Sample data:\n${sampleRows}`,
      ].join("\n");
    }

    case "text": {
      const preview = parsed.sections.slice(0, 5).join("\n\n");
      return [
        `File: ${fileName} (Text, ${parsed.wordCount} words, ${parsed.sections.length} sections)`,
        `Content preview:\n${preview.slice(0, 3000)}`,
      ].join("\n");
    }

    case "image":
      return `File: ${fileName} (Image, ${parsed.sizeKB}KB)`;
  }
}

// ── File preview label for UI ──────────────────────────

export function previewLabel(parsed: ParsedFile, fileName: string): string {
  switch (parsed.type) {
    case "csv":
      return `${fileName} — ${parsed.headers.length} columns, ${parsed.rowCount} rows`;
    case "json": {
      const keys = Object.keys(parsed.schema).length;
      const isArray = Array.isArray(parsed.sampleData);
      return `${fileName} — ${keys} fields${isArray ? `, ${parsed.sampleData.length} items (sample)` : ""}`;
    }
    case "excel":
      return `${fileName} — ${parsed.headers.length} columns, ${parsed.rowCount} rows (${parsed.sheetName})`;
    case "text":
      return `${fileName} — ${parsed.wordCount} words, ${parsed.sections.length} sections`;
    case "image":
      return `${fileName} — ${parsed.sizeKB}KB image`;
  }
}
