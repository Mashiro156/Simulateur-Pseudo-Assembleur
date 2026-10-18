'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { compile, VM } = require('./helpers');

const load = (src) => {
  const c = compile(src);
  assert.ok(c.ok, c.error && c.error.title);
  return new VM(c.program);
};

test('pas à pas : état initial, effet, changements', () => {
  const vm = load('DATA A, 15\nDATA B, 10\nADD A, B, X\nWRITE X\nEND\n');
  assert.equal(vm.pc, 0);
  assert.equal(vm.flag, null);
  assert.equal(vm.ac, null);
  assert.deepEqual([...vm.mem.keys()], ['A', 'B']);
  const r = vm.step();
  assert.equal(r.status, 'ok');
  assert.equal(r.effect, 'X ← 15 + 10 = 25');
  assert.deepEqual(r.changed, { mem: ['X'], ac: false, stack: false, flag: true });
  assert.equal(vm.flag, 25);
  const w = vm.step();
  assert.equal(w.output, 'X = 25');
  assert.equal(vm.step().status, 'halted');
  assert.equal(vm.step().status, 'halted');
  assert.equal(vm.halted, true);
});

test('retour arrière : mémoire, pile, accumulateur, drapeau, sorties', () => {
  const vm = load('DATA A, 2\nPUSH A\nPUSH A\nADD\nPOP X\nLOAD X\nWRITE X\nEND\n');
  const states = [];
  for (let i = 0; i < 6; i++) {
    states.push(JSON.stringify([vm.pc, [...vm.mem], vm.stack, vm.ac, vm.flag, vm.output]));
    vm.step();
  }
  for (let i = 5; i >= 0; i--) {
    assert.ok(vm.stepBack());
    assert.equal(JSON.stringify([vm.pc, [...vm.mem], vm.stack, vm.ac, vm.flag, vm.output]), states[i], `retour ${i}`);
  }
  assert.equal(vm.stepBack(), false);
});

test('une erreur laisse l\'état tel qu\'avant l\'instruction fautive', () => {
  const vm = load('DATA A, 1\nDATA Z, 0\nPUSH A\nPUSH Z\nDIV\nEND\n');
  vm.step(); vm.step();
  const r = vm.step();
  assert.equal(r.status, 'error');
  assert.equal(r.error.code, 'E401');
  assert.deepEqual(vm.stack, [1, 0]);
  assert.equal(vm.halted, true);
  assert.equal(vm.pc, 2);
  assert.equal(vm.current.line, 5);
  assert.equal(vm.step().status, 'error');
  // le premier retour efface l'erreur, l'état reste celui d'avant l'instruction
  assert.ok(vm.stepBack());
  assert.equal(vm.halted, false);
  assert.equal(vm.error, null);
  assert.equal(vm.pc, 2);
  assert.deepEqual(vm.stack, [1, 0]);
  assert.equal(vm.step().status, 'error');
  // le suivant revient une instruction en arrière
  vm.stepBack(); vm.stepBack();
  assert.equal(vm.pc, 1);
  assert.deepEqual(vm.stack, [1]);
});

test('fin sans END : le retour arrière annule la dernière instruction exécutée', () => {
  const vm = load('DATA A, 1\nBR S\nEND\nS: WRITE A\n');
  vm.step();
  const r = vm.step();
  assert.equal(r.status, 'error');
  assert.equal(r.error.code, 'E407');
  assert.deepEqual(vm.output, ['A = 1']);
  vm.stepBack();
  assert.equal(vm.halted, false);
  assert.equal(vm.error, null);
  assert.deepEqual(vm.output, []);
  assert.equal(vm.pc, 2);
});

test('READ : demande une saisie, la garde pour le retour arrière', () => {
  const vm = load('READ A\nREAD B\nADD A, B, X\nWRITE X\nEND\n');
  let r = vm.step();
  assert.equal(r.status, 'need-input');
  assert.equal(r.variable, 'A');
  assert.equal(vm.pc, 0);
  vm.provideInput('4');
  assert.equal(vm.step().status, 'ok');
  assert.equal(vm.step().status, 'need-input');
  vm.provideInput('5');
  vm.step(); vm.step(); vm.step();
  assert.deepEqual(vm.output, ['X = 9']);
  // retour au second READ : la saisie 5 est réutilisée sans nouvelle demande
  vm.stepBack(); vm.stepBack(); vm.stepBack();
  assert.equal(vm.pc, 1);
  assert.equal(vm.step().status, 'ok');
  assert.equal(vm.mem.get('B'), 5);
});

test('READ : saisie invalide = erreur, la saisie est oubliée', () => {
  const vm = load('READ A\nWRITE A\nEND\n');
  vm.provideInput('abc');
  const r = vm.step();
  assert.equal(r.status, 'error');
  assert.equal(r.error.code, 'E406');
  assert.equal(vm.inputLog.length, 0);
  vm.stepBack();
  assert.equal(vm.step().status, 'need-input');
});

test('modification manuelle d\'une variable existante', () => {
  const vm = load('DATA A, 1\nWRITE A\nEND\n');
  assert.equal(vm.setVariable('A', 7), true);
  assert.equal(vm.setVariable('INCONNUE', 7), false);
  assert.equal(vm.setVariable('A', NaN), false);
  vm.step();
  assert.deepEqual(vm.output, ['A = 7']);
});

test('reset : mémoire, pile, accumulateur, drapeau et saisies repartent à zéro', () => {
  const vm = load('DATA A, 1\nREAD B\nLOAD A\nADD B, A, X\nEND\n');
  vm.provideInput('2');
  while (vm.step().status === 'ok');
  assert.ok(vm.mem.has('X'));
  vm.reset();
  assert.deepEqual([...vm.mem.keys()], ['A']);
  assert.equal(vm.ac, null);
  assert.equal(vm.flag, null);
  assert.equal(vm.inputLog.length, 0);
  assert.equal(vm.history.length, 0);
  assert.equal(vm.step().status, 'need-input');
});

test('boucle : les étiquettes saisies après le saut sont résolues', () => {
  const vm = load('DATA N, 3\nDATA UN, 1\nL: SUB N, UN\nBGT L\nWRITE N\nEND\n');
  let n = 0;
  while (vm.step().status === 'ok') n++;
  assert.deepEqual(vm.output, ['N = 0']);
  assert.ok(n > 3);
});

test('les effets des branchements sont lisibles', () => {
  const vm = load('DATA A, 5\nDATA B, 2\nSUB A, B, T\nBGT S\nEND\nS: END\n');
  vm.step();
  const r = vm.step();
  assert.equal(r.jumped, true);
  assert.equal(r.effect, 'drapeau 3 : 3 > 0 vrai, saut vers S');
});
