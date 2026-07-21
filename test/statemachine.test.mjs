import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFSM } from '../src/renderer/game/statemachine.js';

test('enters initial state and runs enter hook', () => {
  const log = [];
  const fsm = createFSM({
    initial: 'a',
    ctx: {},
    states: { a: { enter: () => log.push('enter-a') } },
  });
  assert.equal(fsm.state, 'a');
  assert.deepEqual(log, ['enter-a']);
});

test('update return value drives transition with exit/enter order', () => {
  const log = [];
  const fsm = createFSM({
    initial: 'a',
    ctx: {},
    states: {
      a: { update: () => 'b', exit: () => log.push('exit-a') },
      b: { enter: () => log.push('enter-b') },
    },
  });
  fsm.update(0.1);
  assert.equal(fsm.state, 'b');
  assert.deepEqual(log, ['exit-a', 'enter-b']);
});

test('elapsed accumulates within a state and resets on transition', () => {
  const fsm = createFSM({
    initial: 'a',
    ctx: {},
    states: {
      a: { update: (_c, _dt, f) => (f.elapsed > 1 ? 'b' : null) },
      b: {},
    },
  });
  fsm.update(0.5);
  assert.equal(fsm.state, 'a');
  assert.ok(Math.abs(fsm.elapsed - 0.5) < 1e-9);
  fsm.update(0.6);
  assert.equal(fsm.state, 'b');
  assert.equal(fsm.elapsed, 0);
});

test('manual transition to same state is a no-op', () => {
  let enters = 0;
  const fsm = createFSM({
    initial: 'a',
    ctx: {},
    states: { a: { enter: () => enters++ } },
  });
  fsm.transition('a');
  assert.equal(enters, 1);
});

test('unknown states throw', () => {
  assert.throws(() => createFSM({ initial: 'nope', ctx: {}, states: {} }));
  const fsm = createFSM({ initial: 'a', ctx: {}, states: { a: {} } });
  assert.throws(() => fsm.transition('nope'));
});
