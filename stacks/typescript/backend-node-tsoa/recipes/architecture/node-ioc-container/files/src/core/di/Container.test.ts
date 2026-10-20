import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Container } from './Container';

test('a singleton binding resolves to one instance and an override replaces it', () => {
  const container = new Container().register('clock', () => ({ now: () => 1 }), { singleton: true });
  assert.equal(container.resolve('clock'), container.resolve('clock'));
  const fake = { now: () => 2 };
  container.override('clock', fake);
  assert.equal(container.resolve('clock'), fake);
});
