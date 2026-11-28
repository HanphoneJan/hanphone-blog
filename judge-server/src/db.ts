import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {env} from './env.js';

const {Pool} = pg;

export const pool = new Pool({connectionString: env.databaseUrl});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, values);
}

export function schemaPath(): string {
  return fileURLToPath(new URL('../sql/schema.sql', import.meta.url));
}

export async function initDb(): Promise<void> {
  const sql = fs.readFileSync(schemaPath(), 'utf8');
  await pool.query(sql);
}

export async function closeDb(): Promise<void> {
  await pool.end();
}
