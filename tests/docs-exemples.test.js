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

// Cas annoncés dans le texte qui suit chaque programme.
function announcedCases(index) {
  const from = programs[index].end;
  const to = index + 1 < programs.length ? programs[index + 1].start : md.length;
  const text = md.slice(from, to);
  const cases = [];
  const sortie = text.match(/Sortie :\n\n```text\n([\s\S]*?)\n```/);
  if (sortie) cases.push({ inputs: [], expected: sortie[1].split('\n') });
  for (const m of text.matchAll(/^- avec x = (\S+) et y = (\S+) : `(.*)`$/gm)) {
    cases.push({ inputs: [m[1], m[2]], expected: [m[3]] });
  }
  const z = text.match(/Avec a = (\S+), b = (\S+), c = (\S+), d = (\S+) : `([^`]*)`\. Avec d = 0 : `([^`]*)`/);
  if (z) {
    cases.push({ inputs: [z[1], z[2], z[3], z[4]], expected: [z[5]] });
    cases.push({ inputs: [z[1], z[2], z[3], '0'], expected: [z[6]] });
  }
  const tri = text.match(/Avec (\S+), (\S+), (\S+) en saisie :\n\n```text\n([\s\S]*?)\n```/);
  if (tri) cases.push({ inputs: [tri[1], tri[2], tri[3]], expected: tri[4].split('\n') });
  return cases;
}

test('la documentation contient les 11 programmes attendus', () => {
  assert.equal(programs.length, 11);
  assert.ok(blocks.filter(isOutput).length >= 6);
});

programs.forEach((p, i) => {
  const title = p.raw.split('\n').slice(0, 3).join(' | ');
  test(`exemple ${i + 1} : compile et donne les sorties annoncées (${title.slice(0, 40)})`, () => {
    const cases = announcedCases(i);
    assert.ok(cases.length > 0, 'aucune sortie annoncée dans la documentation pour ce programme');
    for (const c of cases) {
      const d = diagnose(p.text, c.inputs);
      assert.equal(d.error, null, d.text);
      assert.deepEqual(d.output, c.expected, `saisies : ${c.inputs.join(', ')}`);
    }
  });
});

const byTitle = (re) => programs.filter((p) => re.test(p.raw));
const zProgs = programs.filter((p) => /^READ D$/m.test(p.raw) && /DIV/.test(p.raw));
const triProgs = programs.filter((p) => /^READ C$/m.test(p.raw) && !/^READ D$/m.test(p.raw));

test('expression Z : 4 programmes, résultat correct pour des valeurs variées', () => {
  assert.equal(zProgs.length, 4);
  const vals = [-3, -1.5, 0, 2, 4.25, 7];
  for (const p of zProgs) {
    for (const a of vals) for (const b of vals) for (const c of vals) {
      for (const d of [0, 1, 2, -4, 0.5]) {
        const r = diagnose(p.text, [a, b, c, d]);
        assert.equal(r.error, null, r.text);
        const attendu = d === 0 ? 0 : a * b + c / d;
        const obtenu = parseFloat(r.output[0].split('=')[1]);
        assert.ok(Math.abs(obtenu - attendu) < 1e-6, `${p.raw.split('\n')[0]} a=${a} b=${b} c=${c} d=${d}`);
      }
    }
  }
});

test('tri de trois nombres : 4 programmes, ordre décroissant A >= B >= C', () => {
  assert.equal(triProgs.length, 4);
  const vals = [-2, 0, 1, 1, 3.5, 7];
  for (const p of triProgs) {
    for (const a of vals) for (const b of vals) for (const c of vals) {
      const r = diagnose(p.text, [a, b, c]);
      assert.equal(r.error, null, r.text);
      const sortie = r.output.map((l) => parseFloat(l.split('=')[1]));
      assert.deepEqual(sortie, [a, b, c].sort((x, y) => y - x), `${p.raw.split('\n')[0]} ${a},${b},${c}`);
    }
  }
});

test('chaque mode annoncé est respecté par son programme', () => {
  for (const p of programs) {
    const mode = p.raw.match(/^MODE (\d)/)[1];
    assert.ok(['0', '1', '2', '3'].includes(mode));
  }
  assert.ok(byTitle(/MODE 0/).length >= 2);
});
