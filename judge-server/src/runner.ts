import {env} from './env.js';
import {compare} from './compare.js';
import {goJudgeRun} from './gojudge.js';
import type {
  CaseResult,
  GoJudgeCmd,
  GoJudgeResult,
  ProblemMeta,
  TestCase,
  Verdict,
} from './types.js';

const PY_ENV = [
  'PATH=/usr/local/bin:/usr/bin:/bin',
  'PYTHONIOENCODING=utf-8',
  'PYTHONDONTWRITEBYTECODE=1',
  'PYTHONHASHSEED=0',
  'TMPDIR=/tmp',
  'LANG=C.UTF-8',
];

/** numpy 2.x 的 repr：np.float64(1.0) -> 1.0 */
function normalizeNumpy(text: string): string {
  return text.replace(/np\.(?:float|int|bool)\w*\(([^()]*)\)/g, '$1');
}

function truncate(text: string | undefined, max = 2000): string {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}\n…（已截断）` : text;
}

function baseCmd(meta: ProblemMeta): GoJudgeCmd {
  return {
    args: ['python3', '/w/main.py'],
    env: PY_ENV,
    files: [
      {content: ''},
      {name: 'stdout', max: env.maxOutputBytes},
      {name: 'stderr', max: env.maxOutputBytes},
    ],
    cpuLimit: meta.timeLimitMs * 1_000_000,
    clockLimit: Math.max(meta.timeLimitMs * 4, 5_000) * 1_000_000,
    memoryLimit: meta.memoryLimitMb * 1024 * 1024,
    stackLimit: 64 * 1024 * 1024,
    procLimit: 32,
    copyIn: {
      'main.py': {content: ''},
    },
  };
}

function statusToVerdict(status: string, exitStatus?: number): Verdict | null {
  switch (status) {
    case 'Accepted':
      return exitStatus === 0 || exitStatus === undefined ? null : 'RE';
    case 'Time Limit Exceeded':
      return 'TLE';
    case 'Memory Limit Exceeded':
      return 'MLE';
    case 'Output Limit Exceeded':
      return 'OLE';
    case 'Nonzero Exit Status':
    case 'Signalled':
    case 'Dangerous Syscall':
      return 'RE';
    case 'Internal Error':
    case 'File Error':
      return 'IE';
    default:
      return 'IE';
  }
}

function toResult(
  test: TestCase,
  result: GoJudgeResult | undefined,
  actual: string,
  verdict: Verdict,
  message?: string,
  expected = test.expected,
): CaseResult {
  return {
    seq: test.seq,
    verdict,
    timeMs: Math.max(0, Math.round((result?.time ?? 0) / 1_000_000)),
    memoryKb: Math.max(0, Math.round((result?.memory ?? 0) / 1024)),
    message,
    inputExcerpt: truncate(test.stdin ?? (test.args ? `args: ${test.args.join(', ')}` : '')),
    expectedExcerpt: truncate(expected),
    actualExcerpt: truncate(actual),
  };
}

export async function runCase(
  meta: ProblemMeta,
  source: string,
  test: TestCase,
  harness?: string,
): Promise<CaseResult> {
  const cmd = baseCmd(meta);
  cmd.copyIn = {'main.py': {content: source}};

  if (meta.mode === 'function' || meta.mode === 'script') {
    if (!harness) {
      return toResult(test, undefined, '', 'IE', '题目缺少 harness.py');
    }
    cmd.args = ['python3', '/w/harness.py'];
    cmd.copyIn = {
      'main.py': {content: source},
      'harness.py': {content: harness},
      'case.json': {content: JSON.stringify({args: test.args ?? []})},
    };
    cmd.copyOut = ['result.json'];
  } else {
    cmd.files = [
      {content: test.stdin ?? ''},
      {name: 'stdout', max: env.maxOutputBytes},
      {name: 'stderr', max: env.maxOutputBytes},
    ];
  }

  let results: GoJudgeResult[];
  try {
    results = await goJudgeRun({cmd: [cmd]});
  } catch (e) {
    return toResult(test, undefined, '', 'IE', (e as Error).message);
  }

  const result = results[0];
  if (!result) {
    return toResult(test, undefined, '', 'IE', 'go-judge 没有返回结果');
  }

  const early = statusToVerdict(result.status, result.exitStatus);
  const stderr = result.files?.stderr ?? '';
  const stdout = result.files?.stdout ?? '';

  if (early) {
    return toResult(
      test,
      result,
      early === 'TLE' || early === 'MLE' || early === 'OLE' ? stderr || stdout : stderr || stdout,
      early,
      early === 'TLE'
        ? `超过时间限制 ${meta.timeLimitMs}ms`
        : early === 'MLE'
          ? `超过内存限制 ${meta.memoryLimitMb}MB`
          : early === 'OLE'
            ? `输出超过限制 ${env.maxOutputBytes} 字节`
            : stderr || stdout || result.status,
    );
  }

  if (meta.mode === 'function' || meta.mode === 'script') {
    const raw = result.files?.['result.json'];
    if (!raw) {
      return toResult(
        test,
        result,
        stderr || stdout,
        'RE',
        stderr || '程序没有写出 result.json（可能崩溃或被 kill）',
      );
    }
    let parsed: {v?: string; e?: string; m?: boolean};
    try {
      parsed = JSON.parse(raw) as {v?: string; e?: string; m?: boolean};
    } catch {
      return toResult(test, result, raw, 'IE', 'result.json 不是合法 JSON');
    }
    if (parsed.e !== undefined) {
      return toResult(test, result, parsed.e, 'RE', parsed.e.split('\n').slice(-1)[0]);
    }
    const actual = meta.numpyRepr
      ? normalizeNumpy(parsed.v ?? 'null')
      : (parsed.v ?? 'null');
    const expected = meta.numpyRepr
      ? normalizeNumpy(test.expected)
      : test.expected;
    const verdict = compare(actual, expected, test.flags);
    return toResult(
      test,
      result,
      actual,
      verdict.ok ? 'AC' : 'WA',
      parsed.m ? '函数返回 None，比较的是被修改的入参' : verdict.reason,
    );
  }

  if (test.expected === '') {
    return toResult(test, result, stdout || '（无输出）', 'AC');
  }
  const actual = meta.numpyRepr ? normalizeNumpy(stdout) : stdout;
  const expected = meta.numpyRepr
    ? normalizeNumpy(test.expected)
    : test.expected;
  const verdict = compare(actual, expected, test.flags);
  return toResult(
    test,
    result,
    actual || '（无输出）',
    verdict.ok ? 'AC' : 'WA',
    verdict.reason,
  );
}

/** /v1/run 用：不判题，只返回 stdout/stderr。 */
export async function runRawStdin(
  source: string,
  stdin: string,
  timeLimitMs = 2000,
  memoryLimitMb = 256,
): Promise<{
  verdict: Verdict;
  stdout: string;
  stderr: string;
  timeMs: number;
  memoryKb: number;
  message?: string;
}> {
  const meta: ProblemMeta = {
    id: '__run__',
    title: 'run',
    platform: 'custom',
    mode: 'stdin',
    languages: ['python'],
    timeLimitMs,
    memoryLimitMb,
    compare: 'text',
    activeTestCount: 1,
    fullTestCount: 1,
  };
  const result = await runCase(meta, source, {seq: 1, stdin, expected: ''});
  return {
    verdict: result.verdict,
    stdout: result.actualExcerpt ?? '',
    stderr: result.verdict === 'AC' ? '' : (result.message ?? ''),
    timeMs: result.timeMs,
    memoryKb: result.memoryKb,
    message: result.message,
  };
}
