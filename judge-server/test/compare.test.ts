import test from 'node:test';
import assert from 'node:assert/strict';
import {compare} from '../src/compare.js';

test('JSON arrays ignore whitespace', () => {
  assert.equal(compare('[0, 1]', '[0,1]').ok, true);
});

test('float tolerance covers LeetCode formatting', () => {
  assert.equal(compare('2.0', '2.00000').ok, true);
});

test('order agnostic arrays', () => {
  assert.equal(
    compare('[["eat","tea"],["bat"]]', '[["bat"],["tea","eat"]]', {
      orderAgnostic: true,
    }).ok,
    true,
  );
});

test('string digit and number', () => {
  assert.equal(compare('"0"', '0').ok, true);
});

test('python bool text', () => {
  assert.equal(compare('True', 'true').ok, true);
});

test('wrong answer', () => {
  assert.equal(compare('[0,0]', '[0,1]').ok, false);
});
