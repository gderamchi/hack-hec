// ─── Compliance Agent File-based DB (Hackathon Ready) ─────────────────────
import fs from "fs";
import path from "path";

const DB_FILE = path.join(process.cwd(), "data", "agent-db.json");

type DBState = {
  compliance_profiles: any[];
  regulation_change_events: any[];
  remediation_plans: any[];
  agent_activity_log: any[];
};

function readDB(): DBState {
  if (!fs.existsSync(DB_FILE)) {
    if (!fs.existsSync(path.dirname(DB_FILE))) {
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    }
    const initial: DBState = {
      compliance_profiles: [],
      regulation_change_events: [],
      remediation_plans: [],
      agent_activity_log: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function writeDB(state: DBState) {
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
}

export function hasSupabase(): boolean {
  return true; // Mock true to maintain app logic
}

export async function dbInsert<T>(table: keyof DBState, rows: T[]): Promise<void> {
  if (rows.length === 0) return;
  const db = readDB();
  const now = new Date().toISOString();
  
  const enrichedRows = rows.map((row: any) => ({
    created_at: now,
    updated_at: now,
    detected_at: table === "regulation_change_events" ? now : undefined,
    ...row
  }));

  db[table].push(...enrichedRows);
  writeDB(db);
}

// Simple filter logic for mock db
function applyFilters(rows: any[], filters: Record<string, string>) {
  return rows.filter(row => {
    for (const [key, value] of Object.entries(filters)) {
      if (value.startsWith("eq.")) {
        const val = value.slice(3);
        if (String(row[key]) !== val) return false;
      }
    }
    return true;
  });
}

export async function dbSelect<T>(
  table: keyof DBState,
  filters: Record<string, string> = {},
  select = "*",
  order?: string,
  limit?: number
): Promise<T[]> {
  const db = readDB();
  let rows = applyFilters(db[table], filters);

  if (order) {
    const [field, dir] = order.split(".");
    rows.sort((a, b) => {
      if (a[field] < b[field]) return dir === "desc" ? 1 : -1;
      if (a[field] > b[field]) return dir === "desc" ? -1 : 1;
      return 0;
    });
  }

  if (limit) {
    rows = rows.slice(0, limit);
  }

  return rows as T[];
}

export async function dbSelectOne<T>(
  table: keyof DBState,
  filters: Record<string, string>,
  select = "*"
): Promise<T | null> {
  const rows = await dbSelect<T>(table, filters, select, undefined, 1);
  return rows[0] ?? null;
}

export async function dbUpdate(
  table: keyof DBState,
  filters: Record<string, string>,
  data: Record<string, unknown>
): Promise<void> {
  const db = readDB();
  const rows = db[table];
  let updated = false;

  for (let i = 0; i < rows.length; i++) {
    let match = true;
    for (const [key, value] of Object.entries(filters)) {
      if (value.startsWith("eq.") && String(rows[i][key]) !== value.slice(3)) {
        match = false;
        break;
      }
    }
    if (match) {
      rows[i] = { ...rows[i], ...data };
      updated = true;
    }
  }

  if (updated) {
    writeDB(db);
  }
}
