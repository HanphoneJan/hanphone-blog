import {createHash, randomUUID} from 'node:crypto';
import express, {type NextFunction, type Request, type Response} from 'express';
import {z} from 'zod';
import {env} from './env.js';
import {goJudgeVersion} from './gojudge.js';
import {query} from './db.js';
import {rateLimiter} from './rate-limit.js';
import {runRawStdin} from './runner.js';
import {enqueue, isWorking, queueLength} from './worker.js';

const submitSchema = z.object({
  problemId: z.string().min(1).max(100),
  language: z.enum(['python']).default('python'),
  source: z.string().min(1).max(env.maxSourceBytes),
  clientId: z.string().max(100).optional(),
});

const runSchema = z.object({
  source: z.string().min(1).max(env.maxSourceBytes),
  stdin: z.string().max(env.maxStdinBytes).default(''),
  timeLimitMs: z.number().int().min(200).max(5000).default(2000),
  memoryLimitMb: z.number().int().min(32).max(512).default(256),
});

function clientIp(req: Request): string {
  const forwarded = req.headers['x-real-ip'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.trim();
  const cf = req.headers['cf-connecting-ip'];
  if (typeof cf === 'string' && cf.trim()) return cf.trim();
  return req.ip ?? 'unknown';
}

function admin(req: Request, res: Response, next: NextFunction): void {
  const token = env.adminToken;
  if (!token) {
    res.status(503).json({error: 'admin token not configured'});
    return;
  }
  if (req.headers.authorization !== `Bearer ${token}`) {
    res.status(401).json({error: 'unauthorized'});
    return;
  }
  next();
}

function rowsToProblems(rows: Array<Record<string, unknown>>): unknown[] {
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    platform: r.platform,
    url: r.source_url,
    mode: r.mode,
    languages: r.languages,
    timeLimitMs: r.time_limit_ms,
    memoryLimitMb: r.memory_limit_mb,
    activeTestCount: r.active_test_count,
    fullTestCount: r.full_test_count,
    provenance: r.provenance,
  }));
}

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({limit: `${Math.max(env.maxSourceBytes, env.maxStdinBytes) + 4096}b`}));

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && env.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type,x-judge-client');
    res.setHeader('Access-Control-Max-Age', '600');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.get('/v1/health', async (_req, res) => {
    let sandbox: unknown = null;
    let sandboxOk = false;
    try {
      sandbox = await goJudgeVersion();
      sandboxOk = true;
    } catch (e) {
      sandbox = {error: (e as Error).message};
    }
    let dbOk = false;
    try {
      await query('SELECT 1');
      dbOk = true;
    } catch {
      dbOk = false;
    }
    res.status(sandboxOk && dbOk ? 200 : 503).json({
      ok: sandboxOk && dbOk,
      db: dbOk,
      sandbox,
      queue: {length: queueLength(), working: isWorking(), max: env.maxQueue},
    });
  });

  app.get('/v1/problems', async (_req, res, next) => {
    try {
      const {rows} = await query(
        `SELECT id, title, platform, source_url, mode, languages,
                time_limit_ms, memory_limit_mb, active_test_count,
                full_test_count, provenance
           FROM problems
          WHERE enabled = true
          ORDER BY platform, id`,
      );
      res.json({problems: rowsToProblems(rows as Array<Record<string, unknown>>)});
    } catch (e) {
      next(e);
    }
  });

  app.get('/v1/problems/:id', async (req, res, next) => {
    try {
      const {rows} = await query(
        `SELECT id, title, platform, source_url, mode, languages,
                time_limit_ms, memory_limit_mb, active_test_count,
                full_test_count, provenance
           FROM problems
          WHERE id=$1 AND enabled = true`,
        [req.params.id],
      );
      if (rows.length === 0) {
        res.status(404).json({error: 'problem not found'});
        return;
      }
      res.json({problem: rowsToProblems(rows as Array<Record<string, unknown>>)[0]});
    } catch (e) {
      next(e);
    }
  });

  app.post('/v1/submissions', async (req, res, next) => {
    try {
      const parsed = submitSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({error: 'invalid body', details: parsed.error.flatten()});
        return;
      }
      const {problemId, language, source, clientId} = parsed.data;

      if (queueLength() >= env.maxQueue) {
        res.status(429).json({error: 'queue full', retryAfter: 10});
        return;
      }

      const ip = clientIp(req);
      const limit = rateLimiter.check(ip, 'submit');
      if (!limit.ok) {
        res.setHeader('Retry-After', String(limit.retryAfter));
        res.status(429).json({error: 'rate limited', retryAfter: limit.retryAfter});
        return;
      }

      const problem = await query(
        `SELECT id, languages FROM problems WHERE id=$1 AND enabled = true`,
        [problemId],
      );
      if (problem.rows.length === 0) {
        res.status(404).json({error: 'problem not found'});
        return;
      }
      const languages = problem.rows[0].languages as string[];
      if (!languages.includes(language)) {
        res.status(400).json({error: `language ${language} not supported`});
        return;
      }

      const id = randomUUID();
      const sha1 = createHash('sha1').update(source).digest('hex');
      await query(
        `INSERT INTO submissions
           (id, problem_id, language, source, source_sha1, client_id, ip_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          id,
          problemId,
          language,
          env.sourceRetentionDays === 0 ? '' : source,
          sha1,
          clientId ?? null,
          limit.ipHash,
        ],
      );
      enqueue(id);
      res.status(202).json({id, status: 'queued'});
    } catch (e) {
      next(e);
    }
  });

  app.get('/v1/submissions/:id', async (req, res, next) => {
    try {
      const id = req.params.id;
      if (!/^[0-9a-f-]{36}$/i.test(id)) {
        res.status(400).json({error: 'invalid submission id'});
        return;
      }
      const {rows} = await query(
        `SELECT id, problem_id, language, status, verdict, passed, total,
                time_ms, memory_kb, message, created_at, finished_at
           FROM submissions WHERE id=$1`,
        [id],
      );
      if (rows.length === 0) {
        res.status(404).json({error: 'submission not found'});
        return;
      }
      const {rows: cases} = await query(
        `SELECT seq, verdict, time_ms, memory_kb, message,
                input_excerpt, expected_excerpt, actual_excerpt
           FROM submission_cases
          WHERE submission_id=$1
          ORDER BY seq`,
        [id],
      );
      res.json({submission: rows[0], cases});
    } catch (e) {
      next(e);
    }
  });

  app.post('/v1/run', async (req, res, next) => {
    try {
      const parsed = runSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({error: 'invalid body', details: parsed.error.flatten()});
        return;
      }
      const ip = clientIp(req);
      const limit = rateLimiter.check(ip, 'run');
      if (!limit.ok) {
        res.setHeader('Retry-After', String(limit.retryAfter));
        res.status(429).json({error: 'rate limited', retryAfter: limit.retryAfter});
        return;
      }
      const {source, stdin, timeLimitMs, memoryLimitMb} = parsed.data;
      const result = await runRawStdin(source, stdin, timeLimitMs, memoryLimitMb);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  app.get('/v1/admin/stats', admin, async (_req, res, next) => {
    try {
      const {rows} = await query(
        `SELECT
           (SELECT count(*) FROM problems WHERE enabled) AS problems,
           (SELECT count(*) FROM submissions) AS submissions,
           (SELECT count(*) FROM submissions WHERE status='queued') AS queued,
           (SELECT count(*) FROM submissions WHERE status='running') AS running,
           (SELECT count(*) FROM submissions WHERE verdict='AC') AS accepted`,
      );
      res.json({...rows[0], queue: {length: queueLength(), working: isWorking()}});
    } catch (e) {
      next(e);
    }
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[api]', err);
    res.status(500).json({error: 'internal error'});
  });

  return app;
}
