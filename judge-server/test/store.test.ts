import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {readProblemDir} from '../src/store.js';

const fixture = (id: string): string =>
  path.join(process.cwd(), 'test', 'fixtures', id);

test('loads function problem with harness', () => {
  const p = readProblemDir(fixture('leetcode-1'));
  assert.equal(p.meta.mode, 'function');
  assert.equal(p.meta.id, 'leetcode-1');
  assert.ok(p.tests.length > 0);
  assert.ok(p.harness?.includes('twoSum'));
});

test('loads stdin problem', () => {
  const p = readProblemDir(fixture('nowcoder-hj80'));
  assert.equal(p.meta.mode, 'stdin');
  assert.equal(p.tests[0].stdin?.includes('1 2 5'), true);
  assert.equal(p.tests[0].expected.trim(), '-101235');
});
