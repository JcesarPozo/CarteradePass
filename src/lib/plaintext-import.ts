import type { Credential } from "./vault-crypto";

export type PlaintextImport = {
  entries: Credential[];
  mapping: string[];
};

type Field = "title" | "username" | "password" | "url" | "category" | "notes";
const aliases: Record<Field, string[]> = {
  title: ["servicio", "nombre del servicio", "nombre de sitio", "aplicacion", "nombre de aplicacion", "sitio", "cuenta", "nombre", "account", "service", "site", "app", "application", "platform", "plataforma"],
  username: ["usuario", "nombre de usuario", "user", "user name", "username", "login", "correo", "email", "e mail", "correo electronico", "usuario correo", "identificador"],
  password: ["clave", "clave de acceso", "contrasena", "password", "pass", "pwd", "pin"],
  url: ["url", "sitio web", "website", "web address", "link", "enlace"],
  category: ["categoria", "category", "grupo", "group", "etiqueta", "tag"],
  notes: ["nota", "notas", "notes", "comentario", "comments", "observaciones"]
};

const cleanHeader = (value: string) => value.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ");
const fieldFor = (value: string): Field | undefined => {
  const header = cleanHeader(value);
  return (Object.keys(aliases) as Field[]).find((field) => aliases[field].includes(header));
};

function detectDelimiter(line: string): string | null {
  let quote = false;
  const counts = { "\t": 0, ";": 0, ",": 0 };
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (quote && line[i + 1] === '"') i++;
      else quote = !quote;
    } else if (!quote && line[i] in counts) counts[line[i] as keyof typeof counts]++;
  }
  const [delimiter, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return count > 0 ? delimiter : null;
}

function parseWhitespaceRows(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    const row: string[] = [];
    let cell = "", quoted = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') { cell += '"'; i++; }
        else quoted = !quoted;
      } else if (/\s/.test(char) && !quoted) {
        if (cell) { row.push(cell); cell = ""; }
      } else cell += char;
    }
    if (quoted) throw new Error("El archivo termina dentro de un campo entre comillas.");
    if (cell) row.push(cell);
    if (row.length) rows.push(row);
  }
  return rows;
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && char === delimiter) { row.push(cell); cell = ""; }
    else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  if (quoted) throw new Error("El archivo termina dentro de un campo entre comillas.");
  return rows;
}

function makeEntry(values: Partial<Record<Field, string>>, index: number): Credential {
  const url = values.url?.trim() ?? "";
  const title = values.title?.trim() || (url ? (() => { try { return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname; } catch { return ""; } })() : "") || `Cuenta importada ${index + 1}`;
  return {
    id: crypto.randomUUID(), title, username: values.username?.trim() ?? "", password: values.password ?? "", url,
    category: values.category?.trim() || "Personal", notes: values.notes?.trim() ?? "", favorite: false, updatedAt: new Date().toISOString()
  };
}

function parseKeyValue(text: string) {
  const records: Partial<Record<Field, string>>[] = [];
  let current: Partial<Record<Field, string>> = {};
  let recognized = 0;
  const labels = new Map<Field, string>();
  const commit = () => { if (Object.keys(current).length) records.push(current); current = {}; };
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([^:=]{2,40})\s*[:=]\s*(.*)$/);
    if (!match) { if (!line.trim()) commit(); continue; }
    const field = fieldFor(match[1]);
    if (!field) continue;
    if (!labels.has(field)) labels.set(field, match[1].trim());
    if (field === "title" && current.title) commit();
    current[field] = match[2]; recognized++;
  }
  commit();
  return { records, recognized, mapping: [...labels].map(([field, label]) => `${label} → ${field}`) };
}

export function parsePlaintextCredentials(text: string): PlaintextImport {
  const normalized = text.replace(/^\uFEFF/, "");
  const keyValue = parseKeyValue(normalized);
  if (keyValue.recognized >= 2 && keyValue.records.length) {
    if (keyValue.records.length > 5_000) throw new Error("El archivo supera el límite de 5.000 cuentas.");
    return {
      entries: keyValue.records.map((record, index) => makeEntry(record, index)),
      mapping: keyValue.mapping
    };
  }

  const firstLine = normalized.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows = delimiter ? parseDelimited(normalized, delimiter) : parseWhitespaceRows(normalized);
  if (!rows.length) throw new Error("El archivo no contiene filas con datos.");
  if (rows.length > 5_000) throw new Error("El archivo supera el límite de 5.000 filas.");

  const headerFields = rows[0].map((header) => fieldFor(header));
  const hasHeader = headerFields.filter(Boolean).length >= 2 && headerFields.includes("username") && headerFields.includes("password");
  let mapping: (Field | undefined)[];
  let dataRows: string[][];
  let mappingDescription: string[];
  if (hasHeader) {
    mapping = headerFields;
    dataRows = rows.slice(1);
    mappingDescription = rows[0].map((header, index) => cleanHeader(header) === "id" ? `${header} → ignorada (ID de origen)` : mapping[index] ? `${header.trim() || `Columna ${index + 1}`} → ${mapping[index]}` : `${header.trim() || `Columna ${index + 1}`} → ignorada`);
  } else {
    const width = Math.max(...rows.map((row) => row.length));
    if (width < 2) throw new Error("No encontré columnas. Usa un archivo CSV/TSV con encabezados o líneas «Usuario: …» y «Contraseña: …».");
    mapping = width >= 3 ? ["title", "username", "password", "url", "category", "notes"] : ["username", "password"];
    dataRows = rows;
    mappingDescription = width >= 3
      ? ["Sin encabezados: columna 1 → servicio, columna 2 → usuario, columna 3 → contraseña", ...(width > 3 ? ["Las columnas siguientes → sitio web, categoría y notas"] : [])]
      : ["Sin encabezados: columna 1 → usuario, columna 2 → contraseña"];
    if (width > 6) mappingDescription.push(`Las columnas 7 a ${width} se ignoran`);
  }

  const idIndex = hasHeader ? rows[0].findIndex((header) => cleanHeader(header) === "id") : -1;
  const titleIndex = hasHeader ? headerFields.indexOf("title") : -1;
  const usernameIndex = hasHeader ? headerFields.indexOf("username") : -1;
  const passwordIndex = hasHeader ? headerFields.indexOf("password") : -1;
  const whitespaceServiceSpan = !delimiter && hasHeader && titleIndex >= 0 && usernameIndex > titleIndex && passwordIndex > usernameIndex;
  const whitespaceIdRows = !delimiter && !hasHeader && rows.every((row) => /^\d+$/.test(row[0] ?? ""));
  const whitespaceTrailingFields = !delimiter && (whitespaceServiceSpan || (!hasHeader && !whitespaceIdRows));
  const entries = dataRows.flatMap((row, rowIndex) => {
    const values: Partial<Record<Field, string>> = {};
    if (whitespaceServiceSpan) {
      const appStart = idIndex >= 0 ? idIndex + 1 : titleIndex;
      values.title = row.slice(appStart, -2).join(" ");
      values.username = row.at(-2) ?? "";
      values.password = row.at(-1) ?? "";
    } else if (whitespaceIdRows) {
      values.title = row.slice(1, -2).join(" ");
      values.username = row.at(-2) ?? "";
      values.password = row.at(-1) ?? "";
    } else if (whitespaceTrailingFields) {
      values.title = row.slice(0, -2).join(" ");
      values.username = row.at(-2) ?? "";
      values.password = row.at(-1) ?? "";
    } else mapping.forEach((field, index) => { if (field && row[index] !== undefined) values[field] = row[index]; });
    if (!Object.values(values).some((value) => value?.trim())) return [];
    return [makeEntry(values, rowIndex)];
  });
  if (!entries.length) throw new Error("No encontré credenciales. Revisa los encabezados o el separador de columnas.");
  if (whitespaceServiceSpan) mappingDescription.push("Los nombres de aplicación separados por espacios se agrupan en un solo campo");
  else if (whitespaceIdRows) mappingDescription = ["Sin encabezados: columna 1 → ID ignorado, texto central → servicio, últimos campos → usuario y contraseña"];
  else if (whitespaceTrailingFields) mappingDescription = ["Sin encabezados: texto inicial → servicio, penúltima columna → usuario, última columna → contraseña"];
  return { entries, mapping: mappingDescription };
}
