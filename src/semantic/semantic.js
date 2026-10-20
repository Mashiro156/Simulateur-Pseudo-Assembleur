/* Analyse sémantique : vérifie le sens du programme entier (erreurs E3xx) :
   mots réservés, étiquettes, variables, mode. */
(function (root) {
  'use strict';
  const V = (root.V8086 = root.V8086 || {});
  const isNode = typeof module === 'object' && module.exports;
  const E = isNode ? require('../errors/errors.js') : V.errors;
  const L = isNode ? require('../language.js') : V.language;

  /* Noms lus et noms qui reçoivent une valeur par une instruction (hors branchements).
     SUB X, X met X (ou la destination) à 0 sans lire son contenu. */
  function readsAndInits(ins) {
    const n = ins.name, o = ins.ops.map((t) => t.text);
    const reads = [], inits = [];
    if (L.isArith(n)) {
      if (o.length === 3) {
        if (n === 'SUB' && o[0] === o[1]) inits.push(o[2]);
        else {
          reads.push(o[0], o[1]);
          if (o[2] !== o[0] && o[2] !== o[1]) inits.push(o[2]);
        }
      } else if (o.length === 2) {
        if (n === 'SUB' && o[0] === o[1]) inits.push(o[0]);
        else reads.push(...o);
      } else if (o.length === 1) reads.push(o[0]);
    } else if (n === 'LOAD' || n === 'PUSH' || n === 'WRITE') reads.push(o[0]);
    else if (n === 'STORE' || n === 'READ' || (n === 'POP' && o.length)) inits.push(o[0]);
    return { reads, inits };
  }

  function analyze(prog, collector) {
    const D = E.Diagnostic;
    const fail = (d) => { collector.add(d); };
    const reserved = (name, what, line, col) =>
      fail(new D('E305', line, col, `mot réservé « ${name} » utilisé comme nom ${what}`,
        'choisissez un autre nom : les mnémoniques et directives sont réservés.', name.length));

    for (const l of prog.labelDefs) if (L.RESERVED.has(l.name)) reserved(l.name, "d'étiquette", l.line, l.col);
    for (const d of prog.datas) if (L.RESERVED.has(d.name)) reserved(d.name, 'de variable', d.line, d.col);
    for (const ins of prog.instrs) {
      for (const o of ins.ops) if (L.RESERVED.has(o.text)) reserved(o.text, '', ins.line, o.col);
    }

    let seen = new Map();
    for (const l of prog.labelDefs) {
      if (seen.has(l.name)) {
        fail(new D('E303', l.line, l.col, `étiquette « ${l.name} » déjà définie`,
          `première définition à la ligne ${seen.get(l.name)}.`, l.name.length));
      } else seen.set(l.name, l.line);
    }
    seen = new Map();
    for (const d of prog.datas) {
      if (seen.has(d.name)) {
        fail(new D('E304', d.line, d.col, `variable « ${d.name} » déjà déclarée`,
          `première déclaration à la ligne ${seen.get(d.name)}.`, d.name.length));
      } else seen.set(d.name, d.line);
    }

    const labels = new Set(prog.labelDefs.map((l) => l.name));
    const varnames = new Set(prog.datas.map((d) => d.name));
    for (const ins of prog.instrs) {
      if (!L.isBranch(ins.name)) ins.ops.forEach((o) => varnames.add(o.text));
    }

    for (const l of prog.labelDefs) {
      if (varnames.has(l.name)) {
        fail(new D('E307', l.line, l.col, `« ${l.name} » est utilisé à la fois comme étiquette et comme variable`,
          'une étiquette et une variable ne peuvent pas porter le même nom.', l.name.length));
      }
    }
    for (const l of prog.labelDefs) {
      if (l.target === null) {
        fail(new D('E308', l.line, l.col, `étiquette « ${l.name} » sans instruction`,
          "une étiquette désigne l'instruction qui la suit ; il n'y en a pas.", l.name.length));
      }
    }

    if (prog.mode !== null) {
      for (const ins of prog.instrs) {
        const f = L.family(ins);
        if (f !== null && f !== prog.mode) {
          fail(new D('E306', ins.line, ins.col, `${ins.raw} n'est pas autorisée en mode ${prog.mode}`,
            `cette forme appartient au mode ${f}. Le programme déclare MODE ${prog.mode}.`, ins.raw.length));
        }
      }
    }

    for (const ins of prog.instrs) {
      if (!L.isBranch(ins.name)) continue;
      const o = ins.ops[0];
      if (labels.has(o.text)) continue;
      const s = E.closeMatch(o.text, labels);
      let aide;
      if (varnames.has(o.text)) aide = `« ${o.text} » est une variable, pas une étiquette.`;
      else if (s) aide = `vouliez-vous dire « ${s} » ?`;
      else if (labels.size) aide = `étiquettes définies : ${[...labels].sort().join(', ')}.`;
      else aide = "aucune étiquette n'est définie dans ce programme.";
      fail(new D('E301', ins.line, o.col, `étiquette inconnue « ${o.text} »`, aide, o.text.length));
    }

    // Une variable lue mais écrite nulle part ne peut jamais avoir de valeur.
    const written = new Set(prog.datas.map((d) => d.name));
    for (const p of prog.permanent || []) written.add(p.name);
    for (const ins of prog.instrs) {
      if (!L.isBranch(ins.name)) readsAndInits(ins).inits.forEach((n) => written.add(n));
    }
    for (const ins of prog.instrs) {
      if (L.isBranch(ins.name)) continue;
      const { reads } = readsAndInits(ins);
      for (const o of ins.ops) {
        if (!reads.includes(o.text) || written.has(o.text)) continue;
        const s = E.closeMatch(o.text, written);
        fail(new D('E302', ins.line, o.col, `variable jamais initialisée « ${o.text} »`,
          `« ${o.text} » n'est écrite nulle part (ni DATA, ni READ, ni résultat d'une instruction).` +
          (s ? ` Vouliez-vous dire « ${s} » ?` : ''), o.text.length));
      }
    }
  }

  const api = { analyze };
  if (isNode) module.exports = api;
  else V.semantic = api;
})(typeof window !== 'undefined' ? window : globalThis);
