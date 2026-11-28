import {query} from './db.js';
import {env} from './env.js';
import {loadProblem} from './store.js';
import {runCase} from './runner.js';
import type {CaseResult, Verdict} from './types.js';

interface SubmissionRow {
  id: string;
  problem_id: string;
  language: string;
  source: string;
}

const queue: string[] = [];
let working = false;
let stopping = false;

export function queueLength(): number {
  return queue.length;
}

export function isWorking(): boolean {
  return working;
}

export function enqueue(submissionId: string): boolean {
  queue.push(submissionId);
  void drain();
  return true;
}

async function markInterrupted(): Promise<void> {
  await query(
    `UPDATE submissions
        SET status='done', verdict='IE',
            message=COALESCE(message, '服务重启，提交被中断'),
            finished_at=now()
      WHERE status IN ('queued', 'running')`,
  );
}

export async function startWorker(): Promise<void> {
  await markInterrupted();
  if (env.sourceRetentionDays > 0) {
    const prune = (): void => {
      void query(
        `UPDATE submissions
            SET source=''
          WHERE source <> ''
            AND created_at < now() - ($1 || ' days')::interval`,
        [env.sourceRetentionDays],
      ).catch((e) => console.error('[worker] source prune failed:', e));
    };
    prune();
    const timer = setInterval(prune, 6 * 60 * 60 * 1000);
    timer.unref();
  }
  void drain();
}

export async function stopWorker(): Promise<void> {
  stopping = true;
  while (working) {
    await new Promise((r) => setTimeout(r, 50));
  }
}

async function drain(): Promise<void> {
  if (working || stopping) return;
  working = true;
  try {
    while (!stopping && queue.length > 0) {
      const id = queue.shift() as string;
      await processSubmission(id).catch(async (e) => {
        console.error(`[worker] submission ${id} failed:`, e);
        await query(
          `UPDATE submissions
              SET status='done', verdict='IE', message=$2, finished_at=now()
            WHERE id=$1`,
          [id, String((e as Error)?.message ?? e).slice(0, 1000)],
        );
      });
    }
  } finally {
    working = false;
  }
}

async function processSubmission(id: string): Promise<void> {
  const {rows} = await query<SubmissionRow>(
    `SELECT id, problem_id, language, source FROM submissions WHERE id=$1`,
    [id],
  );
  const row = rows[0];
  if (!row) return;

  await query(
    `UPDATE submissions SET status='running', started_at=now() WHERE id=$1`,
    [id],
  );

  let loaded;
  try {
    loaded = loadProblem(row.problem_id);
  } catch (e) {
    await finish(id, 'IE', 0, 0, 0, 0, `题目不可用：${(e as Error).message}`);
    return;
  }

  const cases: CaseResult[] = [];
  let firstFailure: CaseResult | undefined;

  for (const test of loaded.tests) {
    const result = await runCase(loaded.meta, row.source, test, loaded.harness);
    cases.push(result);
    await query(
      `INSERT INTO submission_cases
         (submission_id, seq, verdict, time_ms, memory_kb, message,
          input_excerpt, expected_excerpt, actual_excerpt)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (submission_id, seq) DO UPDATE SET
         verdict=EXCLUDED.verdict, time_ms=EXCLUDED.time_ms,
         memory_kb=EXCLUDED.memory_kb, message=EXCLUDED.message,
         input_excerpt=EXCLUDED.input_excerpt,
         expected_excerpt=EXCLUDED.expected_excerpt,
         actual_excerpt=EXCLUDED.actual_excerpt`,
      [
        id,
        result.seq,
        result.verdict,
        result.timeMs,
        result.memoryKb,
        result.message ?? null,
        result.inputExcerpt ?? null,
        result.expectedExcerpt ?? null,
        result.actualExcerpt ?? null,
      ],
    );
    if (result.verdict !== 'AC') {
      firstFailure = result;
      break;
    }
  }

  const passed = cases.filter((c) => c.verdict === 'AC').length;
  const total = loaded.tests.length;
  const verdict: Verdict = firstFailure ? firstFailure.verdict : 'AC';
  const timeMs = cases.reduce((m, c) => Math.max(m, c.timeMs), 0);
  const memoryKb = cases.reduce((m, c) => Math.max(m, c.memoryKb), 0);
  const message = firstFailure
    ? `测试点 ${firstFailure.seq}：${firstFailure.message ?? firstFailure.verdict}`
    : undefined;

  await finish(id, verdict, passed, total, timeMs, memoryKb, message);
}

async function finish(
  id: string,
  verdict: Verdict,
  passed: number,
  total: number,
  timeMs: number,
  memoryKb: number,
  message?: string,
): Promise<void> {
  await query(
    `UPDATE submissions
        SET status='done', verdict=$2, passed=$3, total=$4,
            time_ms=$5, memory_kb=$6, message=$7, finished_at=now()
      WHERE id=$1`,
    [id, verdict, passed, total, timeMs, memoryKb, message ?? null],
  );
}
