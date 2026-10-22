'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { root, compile, runToEnd, E } = require('./helpers');
const P = require(path.join(root, 'src/permanent.js'));

const run = (src, permanent) => {
  const c = compile(src, { permanent });
  if (!c.ok) return { error: c.error, output: [], vm: null };
  const r = runToEnd(c.program, []);
  return { error: r.error, output: r.output, vm: r.vm };
};

test('noms et valeurs : mêmes règles que le langage', () => {
  assert.equal(P.checkName('UN'), null);
  assert.equal(P.checkName('MA_VAR2'), null);
  assert.ok(P.checkName('un'));
  assert.ok(P.checkName('2A'));
  assert.ok(P.checkName('ADD'));
  assert.ok(P.checkName('DATA'));
  assert.equal(P.parseValue('12'), 12);
  assert.equal(P.parseValue(' -2.5 '), -2.5);
  assert.equal(P.parseValue('2,5'), null);
  assert.equal(P.parseValue('abc'), null);
  assert.equal(P.parseValue(''), null);
});

test('ajout, remplacement et suppression conservent l\'ordre', () => {
  let l = P.upsert([], 'UN', 1);
  l = P.upsert(l, 'ZERO', 0);
  l = P.upsert(l, 'UN', 5);
  assert.deepEqual(l, [{ name: 'UN', value: 5 }, { name: 'ZERO', value: 0 }]);
  assert.deepEqual(P.remove(l, 'UN'), [{ name: 'ZERO', value: 0 }]);
});

test('export puis import redonnent la même liste ; les entrées invalides sont écartées', () => {
  const l = [{ name: 'UN', value: 1 }, { name: 'PI', value: 3.14 }];
  assert.deepEqual(P.parse(P.serialize(l)), { variables: l, rejected: [], fatal: null });
  const bad = JSON.stringify({ format: P.FORMAT, version: 1, variables: [
    { name: 'OK', value: 2 }, { name: 'minuscule', value: 1 }, { name: 'ADD', value: 1 }, { name: 'X', value: 'a' }] });
  const r = P.parse(bad);
  assert.deepEqual(r.variables, [{ name: 'OK', value: 2 }]);
  assert.deepEqual(r.rejected.map((x) => x.name), ['minuscule', 'ADD', 'X']);
  assert.ok(P.parse('pas du json').fatal);
  assert.ok(P.parse('{"format":"autre","variables":[]}').fatal);
});

test('une variable permanente est lisible sans DATA ; sans elle, E302', () => {
  const src = 'ADD A, UN, X\nWRITE X\nEND\n'.replace('ADD A, UN, X', 'READ A\nADD A, UN, X');
  assert.equal(run(src, []).error.code, 'E302');
  const r = compile(src.replace('READ A', 'DATA A, 4'), { permanent: [{ name: 'UN', value: 1 }] });
  assert.ok(r.ok);
  assert.deepEqual(runToEnd(r.program, []).output, ['X = 5']);
});

test('une DATA de même nom écrase la valeur permanente', () => {
  const l = [{ name: 'UN', value: 1 }];
  const src = 'DATA UN, 10\nDATA A, 4\nADD A, UN, X\nWRITE X\nEND\n';
  const r = run(src, l);
  assert.deepEqual(r.output, ['X = 14']);
  assert.equal(r.vm.mem.get('UN'), 10);
  assert.equal(r.vm.origin('UN'), 'data');
});

test('origine des cases : permanente, DATA, ou créée par le programme', () => {
  const r = run('DATA A, 4\nADD A, UN, X\nEND\n', [{ name: 'UN', value: 1 }, { name: 'INUTILE', value: 7 }]);
  assert.equal(r.vm.origin('UN'), 'permanent');
  assert.equal(r.vm.origin('A'), 'data');
  assert.equal(r.vm.origin('X'), null);
  assert.equal(r.vm.mem.get('INUTILE'), 7); // présente en mémoire même si le programme ne l'utilise pas
});

test('une variable permanente ne crée pas de conflit avec une étiquette inutilisée', () => {
  const r = run('DATA A, 1\nWRITE A\nEND\n', [{ name: 'UN', value: 1 }]);
  assert.equal(r.error, null);
});

test('la machine repartie à zéro retrouve la valeur permanente', () => {
  const c = compile('LOAD UN\nADD UN\nSTORE UN\nEND\n', { permanent: [{ name: 'UN', value: 1 }] });
  assert.ok(c.ok, c.error && E.format(c.error, c.lines));
  const r = runToEnd(c.program, []);
  assert.equal(r.vm.mem.get('UN'), 2);
  r.vm.reset();
  assert.equal(r.vm.mem.get('UN'), 1);
});

test('fichier de projet : code et variables font l\'aller-retour', () => {
  const vars = [{ name: 'UN', value: 1 }, { name: 'PI', value: 3.14 }, { name: 'PETIT', value: 1e-7 }];
  const code = 'LOAD UN\nWRITE UN\nEND\n';
  const r = P.parseProjectFile(P.serializeProject(code, vars));
  assert.equal(r.kind, 'project');
  assert.equal(r.code, code);
  assert.deepEqual(r.variables, vars);
  assert.deepEqual(r.rejected, []);
});

test('fichier de projet : reste un programme valable ouvert tel quel', () => {
  const code = 'DATA A, 2\nLOAD A\nEND\n';
  const txt = P.serializeProject(code, [{ name: 'UN', value: 1 }]);
  assert.equal(compile(txt).ok, compile(code).ok);
});

test('fichier de projet : fins de ligne Windows, BOM et lignes invalides', () => {
  const txt = '\uFEFF# V8086 projet\r\n# VARIABLES\r\n# un = 1\r\n# X = abc\r\n# ???\r\n# Z = 2\r\n# CODE\r\nEND';
  const r = P.parseProjectFile(txt);
  assert.equal(r.kind, 'project');
  assert.equal(r.code, 'END');
  assert.deepEqual(r.variables, [{ name: 'Z', value: 2 }]);
  assert.equal(r.rejected.length, 3);
});

test('import : programme simple, ancien export de variables, fichiers inutilisables', () => {
  assert.deepEqual(P.parseProjectFile('LOAD X\nEND'), { kind: 'code', code: 'LOAD X\nEND' });
  const old = P.parseProjectFile(P.serialize([{ name: 'UN', value: 1 }]));
  assert.equal(old.kind, 'variables');
  assert.deepEqual(old.variables, [{ name: 'UN', value: 1 }]);
  assert.equal(P.parseProjectFile('# V8086 projet\n# UN = 1').kind, 'invalid');
  assert.equal(P.parseProjectFile('{pas du json').kind, 'invalid');
});
