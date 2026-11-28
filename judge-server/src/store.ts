import fs from 'node:fs';
import path from 'node:path';
import {z} from 'zod';
import {env} from './env.js';
import type {LoadedProblem, ProblemMeta, TestCase, TestFlags} from './types.js';

const metaSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  platform: z.string().min(1),
  url: z.string().optional(),
  mode: z.enum(['stdin', 'function', 'script']),
  entry: z.string().optional(),
  languages: z.array(z.string()).default(['python']),
  timeLimitMs: z.number().int().positive().default(2000),
  memoryLimitMb: z.number().int().positive().default(256),
  compare: z.enum(['text', 'json', 'float', 'unordered']).default('text'),
  numpyRepr: z.boolean().optional(),
  activeTestCount: z.number().int().nonnegative().default(0),
  fullTestCount: z.number().int().nonnegative().default(0),
  provenance: z.record(z.unknown()).default({}),
});

const caseSchema = z.object({
  args: z.array(z.string()).optional(),
  stdin: z.string().optional(),
  expected: z.string(),
  flags: z
    .object({
      orderAgnostic: z.boolean().optional(),
      multiAnswer: z.boolean().optional(),
      textCompare: z.boolean().optional(),
    })
    .optional(),
});

function seqOf(name: string): number {
  const m = /(\d+)/.exec(name);
  return m ? Number(m[1]) : 0;
}

function readFlags(raw: unknown): TestFlags | undefined {
  return raw as TestFlags | undefined;
}

export function readProblemDir(dir: string): LoadedProblem {
  const metaRaw = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const meta = metaSchema.parse(metaRaw) as ProblemMeta;

  const testsDir = path.join(dir, 'tests');
  if (!fs.existsSync(testsDir)) {
    throw new Error(`${meta.id}: tests/ 不存在`);
  }

  const files = fs
    .readdirSync(testsDir)
    .filter((f) => /^\d+\.(json|in|out)$/.test(f))
    .sort((a, b) => seqOf(a) - seqOf(b));

  const tests: TestCase[] = [];
  const seen = new Set<number>();
  for (const file of files) {
    const full = path.join(testsDir, file);
    const seq = seqOf(file);
    if (seen.has(seq)) continue;
    if (file.endsWith('.json')) {
      const parsed = caseSchema.parse(JSON.parse(fs.readFileSync(full, 'utf8')));
      tests.push({seq, ...parsed, flags: readFlags(parsed.flags)});
      seen.add(seq);
      continue;
    }
    if (file.endsWith('.in')) {
      const outFile = path.join(testsDir, file.replace(/\.in$/, '.out'));
      if (!fs.existsSync(outFile)) {
        throw new Error(`${meta.id}: ${file} 缺少同名 .out`);
      }
      tests.push({
        seq,
        stdin: fs.readFileSync(full, 'utf8'),
        expected: fs.readFileSync(outFile, 'utf8'),
      });
      seen.add(seq);
    }
  }

  tests.sort((a, b) => a.seq - b.seq);
  if (tests.length === 0) {
    throw new Error(`${meta.id}: 没有测试点`);
  }

  const harnessFile = path.join(dir, 'harness.py');
  const harness = fs.existsSync(harnessFile)
    ? fs.readFileSync(harnessFile, 'utf8')
    : undefined;

  if ((meta.mode === 'function' || meta.mode === 'script') && !harness) {
    throw new Error(`${meta.id}: ${meta.mode} 模式缺少 harness.py`);
  }

  const activeCount =
    meta.activeTestCount > 0 ? Math.min(meta.activeTestCount, tests.length) : tests.length;

  meta.fullTestCount = tests.length;
  meta.activeTestCount = activeCount;

  return {meta, tests: tests.slice(0, activeCount), harness};
}

export function problemDir(id: string): string {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    throw new Error(`非法 problem id: ${id}`);
  }
  const dir = path.resolve(env.dataDir, id);
  if (!dir.startsWith(path.resolve(env.dataDir) + path.sep)) {
    throw new Error('problem path escapes data dir');
  }
  return dir;
}

export function loadProblem(id: string): LoadedProblem {
  return readProblemDir(problemDir(id));
}

export function listProblemDirs(): string[] {
  if (!fs.existsSync(env.dataDir)) return [];
  return fs
    .readdirSync(env.dataDir, {withFileTypes: true})
    .filter((d) => d.isDirectory())
    .map((d) => path.join(env.dataDir, d.name))
    .filter((d) => fs.existsSync(path.join(d, 'meta.json')));
}
