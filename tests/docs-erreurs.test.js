'use strict';
/* Chaque erreur de docs/erreurs.md a un exemple et un message : le code doit les reproduire à l'identique. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { diagnose, readDoc, E } = require('./helpers');

const md = readDoc('docs/erreurs.md');
const sections = md.split(/^### (E\d{3})\n/m).slice(1);
const entries = [];
for (let i = 0; i < sections.length; i += 2) entries.push({ code: sections[i], body: sections[i + 1] });

test('le catalogue du code et celui de la documentation ont les mêmes codes', () => {
  const documented = entries.map((e) => e.code).sort();
  assert.deepEqual(documented, Object.keys(E.CATALOG).sort());
});

for (const { code, body } of entries) {
  test(`${code} : exemple et message de la documentation`, () => {
    const blocks = [...body.matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]);
    assert.equal(blocks.length, 2, `${code} doit avoir un exemple et un message`);
    const source = blocks[0] + '\n';
    const saisie = body.match(/saisie à `READ` : `([^`]*)`/);
    const d = diagnose(source, saisie ? [saisie[1]] : []);
    assert.ok(d.error, `${code} : le programme de l'exemple ne produit aucune erreur`);
    assert.equal(d.error.code, code);
    assert.equal(d.text, blocks[1]);
    const titre = body.match(/^\*\*(.+?)\.\*\*/m);
    assert.equal(titre && titre[1], E.CATALOG[code], `${code} : titre du catalogue`);
  });
}
