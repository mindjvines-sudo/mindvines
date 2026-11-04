/**
 * One CSV cell. Values that start with = + - @ are prefixed so a spreadsheet
 * reads them as text rather than running them as a formula.
 */
function cell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  // The BOM lets Excel open ₹ and names in other scripts correctly.
  return "﻿" + [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
