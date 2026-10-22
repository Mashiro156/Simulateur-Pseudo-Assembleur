'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { root } = require('./helpers');
const { STEPS } = require(path.join(root, 'src/ui/tour.js'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('visite guidée : 15 étapes au plus, chacune avec un titre et un texte', () => {
  assert.ok(STEPS.length >= 1 && STEPS.length <= 15);
  for (const s of STEPS) {
    assert.ok(s.title && s.text, 'titre et texte attendus');
    assert.ok(['editor', 'console', 'machine'].includes(s.tab), `onglet inconnu : ${s.tab}`);
  }
});

test('visite guidée : chaque élément éclairé existe dans index.html', () => {
  for (const s of STEPS) {
    if (s.target) assert.ok(html.includes(`id="${s.target}"`), `id introuvable : ${s.target}`);
  }
  for (const id of ['btnTour', 'btnSaveCode', 'btnOpenCode', 'fileCode', 'projectTools']) {
    assert.ok(html.includes(`id="${id}"`), `id introuvable : ${id}`);
  }
});
