/* Analyse syntaxique : vérifie la forme de chaque ligne (étiquettes, directives,
   nombre d'opérandes, instruction de fin) et construit le programme structuré
   (erreurs E2xx). */
(function (root) {
  'use strict';
  const V = (root.V8086 = root.V8086 || {});
  const isNode = typeof module === 'object' && module.exports;
  const E = isNode ? require('../errors/errors.js') : V.errors;
  const L = isNode ? require('../language.js') : V.language;

  /* programme = {
       instrs:    [{ name, raw, ops:[{kind,text,col}], line, col }],
       datas:     [{ name, value, line, col }],
       labelDefs: [{ name, line, col, target }],   // target : indice dans instrs
       mode:      null | 0 | 1 | 2 | 3,
       lines } */
  function parse(rows, lines, collector) {
    const D = E.Diagnostic;
    const prog = { instrs: [], datas: [], labelDefs: [], mode: null, lines };
    let pending = [], seenInstr = false, modeSeen = false, lastRow = null;
    const fail = (d) => { collector.add(d); };

    function parseLine(row, ln) {
      if (row[0].kind === 'COLON') {
        return fail(new D('E204', ln, row[0].col, 'étiquette mal formée : nom manquant avant « : »',
          "une étiquette s'écrit NOM: devant une instruction.", 1));
      }
      const rowLabels = [];
      let i = 0;
      if (row.length >= 2 && row[1].kind === 'COLON') {
        if (row[0].kind !== 'NAME') {
          return fail(new D('E204', ln, row[0].col, `étiquette mal formée « ${row[0].text} »`,
            "un nom d'étiquette commence par une lettre majuscule.", row[0].text.length));
        }
        rowLabels.push({ name: row[0].text, line: ln, col: row[0].col });
        i = 2;
      }
      if (i >= row.length) { pending.push(...rowLabels); return; }
      for (let k = i; k < row.length; k++) {
        if (row[k].kind === 'COLON') {
          const t = k - 1 >= i ? row[k - 1] : row[k];
          return fail(new D('E204', ln, t.col, 'étiquette mal formée : une seule étiquette par ligne',
            "placez chaque étiquette sur sa propre ligne, devant l'instruction qu'elle désigne.", t.text.length));
        }
      }
      const m = row[i];
      if (m.kind !== 'NAME') {
        return fail(new D('E201', ln, m.col, `instruction attendue, « ${m.text} » reçu`, null, m.text.length));
      }

      // Opérandes : noms ou nombres séparés par des virgules.
      const rest = row.slice(i + 1), ops = [];
      if (rest.length && rest[0].kind === 'COMMA') {
        return fail(new D('E202', ln, rest[0].col, 'opérande manquant avant la virgule', null, 1));
      }
      let k = 0;
      while (k < rest.length) {
        const t = rest[k];
        if (t.kind !== 'NAME' && t.kind !== 'NUM') {
          return fail(new D('E202', ln, t.col, 'opérande manquant entre deux virgules', null, 1));
        }
        ops.push(t);
        k++;
        if (k < rest.length) {
          if (rest[k].kind !== 'COMMA') {
            return fail(new D('E202', ln, rest[k].col, 'virgule manquante entre deux opérandes',
              'séparez les opérandes par des virgules : ADD A, B, X.', rest[k].text.length));
          }
          k++;
          if (k >= rest.length) {
            return fail(new D('E202', ln, rest[k - 1].col, 'opérande manquant après la virgule', null, 1));
          }
        }
      }

      const name = m.text;
      if (L.DIRECTIVES.includes(name)) return parseDirective(name, m, ops, rowLabels, ln);

      if (!L.MNEMONICS.has(name)) {
        const s = E.closeMatch(name, [...L.MNEMONICS, ...L.DIRECTIVES]);
        return fail(new D('E201', ln, m.col, `instruction inconnue « ${name} »`,
          s ? `vouliez-vous dire « ${s} » ?` : 'consultez la liste des instructions.', name.length));
      }
      if (!L.arityOk(name, ops.length)) {
        const n = ops.length;
        const recu = n === 0 ? 'aucun reçu' : `${n} reçu${n > 1 ? 's' : ''}`;
        return fail(new D('E202', ln, m.col, `${name} attend ${L.arityText(name)}, ${recu}`,
          `formes valides : ${L.validForms(name)}.`, name.length));
      }
      for (const o of ops) {
        if (o.kind === 'NUM') {
          const aide = L.isBranch(name)
            ? 'un branchement attend le nom d\'une étiquette.'
            : 'les opérandes sont des adresses. Déclarez la valeur avec DATA ' +
              `(par exemple DATA UN, ${o.text}) puis utilisez son nom.`;
          return fail(new D('E203', ln, o.col, `valeur immédiate interdite « ${o.text} »`, aide, o.text.length));
        }
      }

      seenInstr = true;
      const ins = { name: L.ALIAS[name] || name, raw: name, ops, line: ln, col: m.col };
      for (const lab of [...pending, ...rowLabels]) {
        prog.labelDefs.push({ name: lab.name, line: lab.line, col: lab.col, target: prog.instrs.length });
      }
      pending = [];
      prog.instrs.push(ins);
    }

    function parseDirective(name, m, ops, rowLabels, ln) {
      if (rowLabels.length) {
        return fail(new D('E204', ln, rowLabels[0].col, 'une étiquette ne peut pas précéder une directive',
          null, rowLabels[0].name.length));
      }
      if (name === 'DATA') {
        if (ops.length !== 2 || ops[0].kind !== 'NAME' || ops[1].kind !== 'NUM') {
          return fail(new D('E205', ln, m.col, 'directive DATA mal formée',
            'la forme est DATA NOM, valeur  (par exemple DATA A, 15).', name.length));
        }
        prog.datas.push({ name: ops[0].text, value: parseFloat(ops[1].text), line: ln, col: ops[0].col });
      } else {
        if (ops.length !== 1 || ops[0].kind !== 'NUM' || !['0', '1', '2', '3'].includes(ops[0].text)) {
          return fail(new D('E205', ln, m.col, 'directive MODE mal formée',
            'la forme est MODE n, avec n égal à 0, 1, 2 ou 3.', name.length));
        }
        if (modeSeen || seenInstr) {
          return fail(new D('E207', ln, m.col, 'directive MODE mal placée',
            'MODE apparaît une seule fois, avant la première instruction.', name.length));
        }
        modeSeen = true;
        prog.mode = parseInt(ops[0].text, 10);
      }
    }

    rows.forEach((row, idx) => {
      if (!row.length) return;
      lastRow = row;
      parseLine(row, idx + 1);
    });

    for (const lab of pending) prog.labelDefs.push({ name: lab.name, line: lab.line, col: lab.col, target: null });

    if (!prog.instrs.some((i) => i.name === 'END')) {
      const first = lastRow ? lastRow[0] : null;
      const last = lastRow ? lastRow[lastRow.length - 1] : null;
      const line = first ? first.line : 1;
      const col = first ? first.col : 1;
      const length = first ? last.col + last.text.length - first.col : 1;
      fail(new D('E206', line, col, 'instruction de fin manquante', 'terminez le programme par END ou STOP.', length));
    }
    return prog;
  }

  const api = { parse };
  if (isNode) module.exports = api;
  else V.parser = api;
})(typeof window !== 'undefined' ? window : globalThis);
