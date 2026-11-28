import 'dotenv/config';
import {loadProblem} from '../src/store.js';
import {runCase, runRawStdin} from '../src/runner.js';
import type {Verdict} from '../src/types.js';

interface Check {
  name: string;
  verdict: Verdict;
  source: string;
  stdin?: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
}

const checks: Check[] = [
  {
    name: 'A+B',
    verdict: 'AC',
    source: 'a, b = map(int, input().split())\nprint(a + b)\n',
    stdin: '2 3\n',
  },
  {
    name: 'TLE',
    verdict: 'TLE',
    source: 'while True:\n    pass\n',
    timeLimitMs: 300,
  },
  {
    name: 'MLE',
    verdict: 'MLE',
    source: 'x = bytearray(400 * 1024 * 1024)\n',
    timeLimitMs: 3000,
  },
  {
    name: 'RE',
    verdict: 'RE',
    source: 'raise RuntimeError("boom")\n',
  },
  {
    name: 'CE',
    verdict: 'RE',
    source: 'def f(:\n    pass\n',
  },
  {
    name: 'network blocked',
    verdict: 'RE',
    source:
      'import socket\nsocket.create_connection(("1.1.1.1", 53), timeout=1)\n',
    timeLimitMs: 2000,
  },
  {
    name: 'file blocked',
    verdict: 'RE',
    source: 'open("/etc/shadow").read()\n',
  },
  {
    name: 'output limit',
    verdict: 'OLE',
    source: 'import sys\nsys.stdout.write("x" * 200000)\n',
  },
];

async function main(): Promise<void> {
  let failed = 0;

  for (const check of checks) {
    const result = await runRawStdin(
      check.source,
      check.stdin ?? '',
      check.timeLimitMs ?? 2000,
      check.memoryLimitMb ?? 256,
    );
    const ok = result.verdict === check.verdict;
    console.log(
      `${ok ? '✓' : '✗'} ${check.name}: ${result.verdict}${ok ? '' : ` (expected ${check.verdict})`}${result.message ? ` — ${result.message.split('\n').slice(-1)[0]}` : ''}`,
    );
    if (!ok) failed += 1;
  }

  const twoSum = loadProblem('leetcode-1');
  const good = `from typing import List

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, n in enumerate(nums):
            if target - n in seen:
                return [seen[target - n], i]
            seen[n] = i
        return []
`;
  for (const test of twoSum.tests) {
    const result = await runCase(twoSum.meta, good, test, twoSum.harness);
    const ok = result.verdict === 'AC';
    console.log(`${ok ? '✓' : '✗'} two-sum case ${test.seq}: ${result.verdict}`);
    if (!ok) {
      console.log(result.message);
      failed += 1;
    }
  }

  const bad = `from typing import List
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        return [0, 0]
`;
  const badResult = await runCase(twoSum.meta, bad, twoSum.tests[0], twoSum.harness);
  const badOk = badResult.verdict === 'WA';
  console.log(`${badOk ? '✓' : '✗'} two-sum wrong answer: ${badResult.verdict}`);
  if (!badOk) failed += 1;

  const hj80 = loadProblem('nowcoder-hj80');
  const stdinCode = `import sys

data = sys.stdin.read().split()
if not data:
    raise SystemExit
i = 0
n1 = int(data[i]); i += 1
a = list(map(int, data[i:i + n1])); i += n1
n2 = int(data[i]); i += 1
b = list(map(int, data[i:i + n2]))
print("".join(map(str, sorted(set(a + b)))))
`;
  for (const test of hj80.tests) {
    const result = await runCase(hj80.meta, stdinCode, test, hj80.harness);
    const ok = result.verdict === 'AC';
    console.log(`${ok ? '✓' : '✗'} HJ80 case ${test.seq}: ${result.verdict}`);
    if (!ok) {
      console.log(result.message);
      failed += 1;
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} smoke check(s) failed`);
    process.exit(1);
  }
  console.log('\nall smoke checks passed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
