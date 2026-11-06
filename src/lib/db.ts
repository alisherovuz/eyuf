import { Pool, type QueryResultRow } from "pg";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS attempts (
  id SERIAL PRIMARY KEY,
  question_id TEXT NOT NULL,
  family TEXT NOT NULL,
  rule TEXT NOT NULL,
  level INT NOT NULL,
  fingerprint TEXT NOT NULL,
  source TEXT NOT NULL,
  mode TEXT NOT NULL,
  correct BOOLEAN NOT NULL,
  chosen INT,
  time_ms INT NOT NULL,
  review_key TEXT,
  exam_id INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS attempts_created ON attempts (created_at DESC);
CREATE TABLE IF NOT EXISTS reviews (
  key TEXT PRIMARY KEY,
  family TEXT NOT NULL,
  rule TEXT NOT NULL,
  level INT NOT NULL,
  question_id TEXT NOT NULL,
  step INT NOT NULL DEFAULT 0,
  due_at TIMESTAMPTZ NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  wrong_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL,
  duration_s INT NOT NULL,
  question_ids JSONB NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  score INT
);
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  question_id TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

const g = globalThis as unknown as { __pool?: Pool; __ready?: Promise<void> };

function pool(): Pool {
  if (!g.__pool) {
    const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    g.__pool = new Pool({ connectionString: url, max: 5 });
  }
  return g.__pool;
}

async function ready() {
  g.__ready ??= pool().query(SCHEMA).then(() => undefined).catch((e) => { g.__ready = undefined; throw e; });
  return g.__ready;
}

export async function q<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  await ready();
  const r = await pool().query<T>(sql, params);
  return r.rows;
}
