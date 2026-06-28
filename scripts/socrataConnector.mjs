import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_HEADERS = {
  Accept: "application/json",
  "User-Agent": "JobRadarDataPack/0.1 (public data beta)",
};

export function metadataUrl(source) {
  assertSource(source);
  return `https://${source.socrata_domain}/api/views/${source.dataset_id}`;
}

export function resourceUrl(source) {
  assertSource(source);
  return `https://${source.socrata_domain}/resource/${source.dataset_id}.json`;
}

export async function fetchMetadata(source) {
  const response = await fetch(metadataUrl(source), { headers: DEFAULT_HEADERS });
  if (!response.ok) {
    throw new Error(`Metadata fetch failed for ${source.dataset_id}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export function columnsFromMetadata(metadata) {
  return (metadata.columns ?? [])
    .filter((column) => column.fieldName)
    .map((column) => ({
      name: column.name,
      fieldName: column.fieldName,
      dataTypeName: column.dataTypeName,
      description: column.description,
    }));
}

export async function fetchSampleRows(source, { limit = 5 } = {}) {
  return fetchRows(source, { limit });
}

export async function fetchRows(source, options = {}) {
  const {
    dateField,
    limit = 1000,
    offset = 0,
    order,
    select,
    since,
    until,
    where,
  } = options;

  const params = new URLSearchParams();
  params.set("$limit", String(limit));
  params.set("$offset", String(offset));

  if (select) params.set("$select", select);
  if (order) params.set("$order", order);

  const dateWhere = buildDateWhere({ dateField, since, until });
  const combinedWhere = combineWhere([where, dateWhere]);
  if (combinedWhere) params.set("$where", combinedWhere);

  const url = `${resourceUrl(source)}?${params.toString()}`;
  const response = await fetch(url, { headers: DEFAULT_HEADERS });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Rows fetch failed for ${source.dataset_id}: ${response.status} ${response.statusText} ${body.slice(0, 300)}`);
  }
  return response.json();
}

export async function paginateRecords(source, options = {}) {
  const {
    maxRecords = 5000,
    pageSize = 1000,
    ...query
  } = options;
  const records = [];
  let offset = query.offset ?? 0;

  while (records.length < maxRecords) {
    const limit = Math.min(pageSize, maxRecords - records.length);
    const page = await fetchRows(source, { ...query, limit, offset });
    records.push(...page);
    if (page.length < limit) break;
    offset += limit;
  }

  return records;
}

export async function exportRawJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function exportRawCsv(filePath, rows) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, rowsToCsv(rows), "utf8");
}

export function rowsToCsv(rows) {
  if (!rows.length) return "";
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set()));

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row[header])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export function buildDateWhere({ dateField, since, until }) {
  if (!dateField || (!since && !until)) return "";
  const clauses = [];
  if (since) clauses.push(`${dateField} >= '${toSocrataDate(since)}'`);
  if (until) clauses.push(`${dateField} < '${toSocrataDate(until)}'`);
  return clauses.join(" AND ");
}

export function combineWhere(clauses) {
  return clauses.filter(Boolean).map((clause) => `(${clause})`).join(" AND ");
}

function toSocrataDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 19);
  return String(value).length === 10 ? `${value}T00:00:00` : String(value);
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll("\"", "\"\"")}"`;
  return stringValue;
}

function assertSource(source) {
  if (!source?.socrata_domain || !source?.dataset_id) {
    throw new Error(`Invalid Socrata source: ${JSON.stringify(source)}`);
  }
}
