'use strict';
/* Les exemples de l'éditeur viennent de docs/exemples.md : le fichier généré doit être à jour. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { root, readDoc, codeOf } = require('./helpers');
const { build, render } = require(path.join(root, 'tools/build-samples.js'));

test('src/ui/samples.js est à jour (relancer node tools/build-samples.js sinon)', () => {
  const attendu = render(build(readDoc('docs/exemples.md')));
  const actuel = fs.readFileSync(path.join(root, 'src/ui/samples.js'), 'utf8');
  assert.equal(actuel, attendu);
});

test('chaque exemple de l\'éditeur compile et s\'exécute sans erreur', () => {
  const samples = require(path.join(root, 'src/ui/samples.js'));
  assert.equal(samples.length, 11);
  for (const s of samples) {
    const inputs = ['3', '4', '10', '2'];
    assert.equal(codeOf(s.source, inputs), null, s.label);
  }
});
