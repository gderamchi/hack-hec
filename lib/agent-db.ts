import fs from "node:fs";
import path from "node:path";

type TableName =
  | "compliance_profiles"
  | "regulation_change_events"
  | "remediation_plans"
  | "agent_activity_log";

type JsonRow = Record<string, unknown>;

type DBState = Record<TableName, JsonRow[]>;

const LOCAL_DB_FILE = path.join(process.cwd(), "data", "agent-db.local.json");

function supabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return url && serviceRoleKey ? { url, serviceRoleKey } : null;
}

export function hasSupabase(): boolean {
  return Boolean(supabaseConfig());
}

export async function dbInsert<T>(table: TableName, rows: T[]): Promise<void> {
  if (rows.length === 0) return;

  const normalizedRows = rows.map((row) =>
    withTableDefaults(table, sanitizeRow(row as JsonRow))
  );
  const config = supabaseConfig();

  if (!config) {
    insertLocalRows(table, normalizedRows);
    return;
  }

  const response = await fetch(`${config.url}/rest/v1/${table}`, {
    method: "POST",
    headers: restHeaders(config.serviceRoleKey, { Prefer: "return=minimal" }),
    body: JSON.stringify(normalizedRows)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (shouldUseLocalFallback(response.status, detail)) {
      warnLocalFallback(`Supabase insert failed for ${table}: ${response.status}`);
      insertLocalRows(table, normalizedRows);
      return;
    }
    throw new Error(formatRestError(`Supabase insert failed for ${table}`, response.status, detail));
  }
}

export async function dbSelect<T>(
  table: TableName,
  filters: Record<string, string> = {},
  select = "*",
  order?: string,
  limit?: number
): Promise<T[]> {
  const config = supabaseConfig();

  if (!config) {
    return selectLocalRows<T>(table, filters, order, limit);
  }

  const url = new URL(`${config.url}/rest/v1/${table}`);
  url.searchParams.set("select", select);
  for (const [key, value] of Object.entries(filters)) {
    url.searchParams.set(key, value);
  }
  if (order) url.searchParams.set("order", order);
  if (limit) url.searchParams.set("limit", String(limit));

  const response = await fetch(url, {
    headers: restHeaders(config.serviceRoleKey)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (shouldUseLocalFallback(response.status, detail)) {
      warnLocalFallback(`Supabase select failed for ${table}: ${response.status}`);
      return selectLocalRows<T>(table, filters, order, limit);
    }
    throw new Error(formatRestError(`Supabase select failed for ${table}`, response.status, detail));
  }

  return (await response.json()) as T[];
}

export async function dbSelectOne<T>(
  table: TableName,
  filters: Record<string, string>,
  select = "*"
): Promise<T | null> {
  const rows = await dbSelect<T>(table, filters, select, undefined, 1);
  return rows[0] ?? null;
}

export async function dbUpdate(
  table: TableName,
  filters: Record<string, string>,
  data: Record<string, unknown>
): Promise<void> {
  const patch = sanitizeRow(data);
  const config = supabaseConfig();

  if (!config) {
    updateLocalRows(table, filters, patch);
    return;
  }

  const url = new URL(`${config.url}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(filters)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: "PATCH",
    headers: restHeaders(config.serviceRoleKey, { Prefer: "return=minimal" }),
    body: JSON.stringify(patch)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (shouldUseLocalFallback(response.status, detail)) {
      warnLocalFallback(`Supabase update failed for ${table}: ${response.status}`);
      updateLocalRows(table, filters, patch);
      return;
    }
    throw new Error(formatRestError(`Supabase update failed for ${table}`, response.status, detail));
  }
}

function readLocalDB(): DBState {
  if (!fs.existsSync(LOCAL_DB_FILE)) {
    const initial: DBState = {
      compliance_profiles: [],
      regulation_change_events: [],
      remediation_plans: [],
      agent_activity_log: []
    };
    fs.mkdirSync(path.dirname(LOCAL_DB_FILE), { recursive: true });
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }

  return JSON.parse(fs.readFileSync(LOCAL_DB_FILE, "utf-8")) as DBState;
}

function writeLocalDB(state: DBState) {
  fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(state, null, 2));
}

function insertLocalRows(table: TableName, rows: JsonRow[]) {
  const db = readLocalDB();
  db[table].push(...rows);
  writeLocalDB(db);
}

function selectLocalRows<T>(
  table: TableName,
  filters: Record<string, string>,
  order?: string,
  limit?: number
): T[] {
  const db = readLocalDB();
  return queryLocalRows(db[table], filters, order, limit) as T[];
}

function updateLocalRows(
  table: TableName,
  filters: Record<string, string>,
  patch: JsonRow
) {
  const db = readLocalDB();
  db[table] = db[table].map((row) =>
    matchesFilters(row, filters) ? { ...row, ...patch } : row
  );
  writeLocalDB(db);
}

function queryLocalRows(
  rows: JsonRow[],
  filters: Record<string, string>,
  order?: string,
  limit?: number
) {
  let result = rows.filter((row) => matchesFilters(row, filters));

  if (order) {
    const [field, direction] = order.split(".");
    result = [...result].sort((a, b) => {
      const left = String(a[field] ?? "");
      const right = String(b[field] ?? "");
      if (left < right) return direction === "desc" ? 1 : -1;
      if (left > right) return direction === "desc" ? -1 : 1;
      return 0;
    });
  }

  return limit ? result.slice(0, limit) : result;
}

function matchesFilters(row: JsonRow, filters: Record<string, string>) {
  return Object.entries(filters).every(([key, value]) => {
    if (!value.startsWith("eq.")) return true;
    return String(row[key]) === value.slice(3);
  });
}

function withTableDefaults(table: TableName, row: JsonRow): JsonRow {
  const now = new Date().toISOString();

  if (table === "compliance_profiles") {
    return {
      created_at: now,
      updated_at: now,
      ...row
    };
  }

  if (table === "regulation_change_events") {
    return {
      detected_at: now,
      ...row
    };
  }

  if (table === "remediation_plans" || table === "agent_activity_log") {
    return {
      created_at: now,
      ...row
    };
  }

  return row;
}

function sanitizeRow(row: JsonRow): JsonRow {
  return Object.fromEntries(
    Object.entries(row).filter(([, value]) => value !== undefined)
  );
}

function restHeaders(
  serviceRoleKey: string,
  extraHeaders: Record<string, string> = {}
) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    ...extraHeaders
  };
}

function shouldUseLocalFallback(status: number, detail: string): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    (status === 404 || detail.includes("PGRST205"))
  );
}

function warnLocalFallback(message: string) {
  console.warn(`${message}; using local development fallback at ${LOCAL_DB_FILE}.`);
}

function formatRestError(message: string, status: number, detail: string): string {
  return `${message}: ${status}${detail ? ` ${detail}` : ""}`;
}
