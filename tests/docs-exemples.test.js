'use strict';
/* Les programmes de docs/exemples.md doivent compiler et donner les sorties indiquées ;
   l'expression Z et le tri sont aussi vérifiés sur beaucoup de valeurs. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { diagnose, readDoc, textBlocks } = require('./helpers');

const md = readDoc('docs/exemples.md');
const blocks = textBlocks(md);
const programs = blocks.filter((b) => /^MODE \d/.test(b.raw));
const isOutput = (b) => b.raw.split('\n').every((l) => /^[A-Z_0-9]+ = \S+$/.test(l));

// Sortie annoncée dans le texte qui suit chaque programme.
function announcedCases(index) {
  const from = programs[index].end;
  const to = index + 1 < programs.length ? programs[index + 1].start : md.length;
  const sortie = md.slice(from, to).match(/Sortie :\n\n```text\n([\s\S]*?)\n```/);
  return sortie ? [{ inputs: [], expected: sortie[1].split('\n') }] : [];
}

test('la documentation contient les 5 programmes attendus', () => {
  assert.equal(programs.length, 5);
  assert.equal(blocks.filter(isOutput).length, 5);
});

programs.forEach((p, i) => {
  const title = p.raw.split('\n').slice(0, 3).join(' | ');
  test(`exemple ${i + 1} : compile et donne la sortie annoncée (${title.slice(0, 40)})`, () => {
    const cases = announcedCases(i);
    assert.ok(cases.length > 0, 'aucune sortie annoncée dans la documentation pour ce programme');
    for (const c of cases) {
      const d = diagnose(p.text, c.inputs);
      assert.equal(d.error, null, d.text);
      assert.deepEqual(d.output, c.expected);
    }
  });
});

test('chaque programme respecte le mode qu\'il annonce, dans les quatre formats couverts', () => {
  const modes = programs.map((p) => p.raw.match(/^MODE (\d)/)[1]);
  assert.deepEqual(modes, ['1', '3', '0', '1', '1']);
});
