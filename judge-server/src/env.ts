import path from 'node:path';

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  port: int('PORT', 5051),
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgres://judge:judge@127.0.0.1:5433/judge',
  goJudgeUrl: process.env.GO_JUDGE_URL ?? 'http://127.0.0.1:5050',
  goJudgeToken: process.env.GO_JUDGE_TOKEN ?? '',
  adminToken: process.env.ADMIN_TOKEN ?? '',
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3001')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  maxQueue: int('MAX_QUEUE', 30),
  maxSourceBytes: int('MAX_SOURCE_BYTES', 65536),
  maxStdinBytes: int('MAX_STDIN_BYTES', 65536),
  maxOutputBytes: int('MAX_OUTPUT_BYTES', 65536),
  submissionsPerMinute: int('SUBMISSIONS_PER_MINUTE', 3),
  submissionsPerDay: int('SUBMISSIONS_PER_DAY', 30),
  runsPerMinute: int('RUNS_PER_MINUTE', 6),
  sourceRetentionDays: int('SOURCE_RETENTION_DAYS', 7),
  dataDir: path.resolve(process.cwd(), process.env.DATA_DIR ?? './data/problems'),
};
