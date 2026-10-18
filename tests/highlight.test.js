'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { root } = require('./helpers');
const H = require(path.join(root, 'src/ui/highlight.js'));

const classes = (line) => {
  const { lines } = H.analyzeText([line]);
  const out = [];
  for (const t of lines[0].tokens) out.push(`${t.text}:${t.role}`);
  return out;
};

test('rôles : étiquette, instruction, variables, nombres', () => {
  assert.deepEqual(classes('L1: ADD A, B, X'),
    ['L1:label-def', '::punct', 'ADD:ins', 'A:var', ',:punct', 'B:var', ',:punct', 'X:var']);
  assert.deepEqual(classes('DATA A, 15'), ['DATA:ins', 'A:var', ',:punct', '15:num']);
});

test('l\'opérande d\'un branchement est une étiquette', () => {
  assert.deepEqual(classes('BGT BOUCLE'), ['BGT:ins', 'BOUCLE:label-ref']);
});

test('minuscules et caractères invalides sont signalés', () => {
  assert.deepEqual(classes('add a, A'), ['add:bad', 'a:bad', ',:punct', 'A:var']);
  assert.deepEqual(classes('ADD A ; x').filter((t) => t.endsWith(':bad')), [';:bad', 'x:bad']);
});

test('commentaires : # et // sur plusieurs lignes', () => {
  const { lines, labelLines } = H.analyzeText(['ADD A # note', '// début', 'fin //', 'SUB B', 'FIN: END']);
  assert.equal(lines[0].base[7], 't-comment');
  assert.equal(lines[0].base[0], 't-ins');
  assert.ok(lines[1].base.every((c) => c === 't-comment'));
  assert.equal(lines[2].base[0], 't-comment');
  assert.equal(lines[3].base[0], 't-ins');
  assert.deepEqual(labelLines, { FIN: 5 });
});

test('HTML d\'une ligne : échappement et soulignement', () => {
  const { lines } = H.analyzeText(['WRITE <X>']);
  const html = H.lineToHtml(lines[0], [{ start: 6, end: 9, cls: 'err-u' }]);
  assert.ok(html.includes('&lt;'));
  assert.ok(html.includes('err-u'));
  assert.ok(!html.includes('<X>'));
});

test('tokenAt trouve le jeton sous une colonne', () => {
  const { lines } = H.analyzeText(['ADD A, B']);
  assert.equal(H.tokenAt(lines[0], 1).text, 'ADD');
  assert.equal(H.tokenAt(lines[0], 3), null);
  assert.equal(H.tokenAt(lines[0], 4).text, 'A');
});
