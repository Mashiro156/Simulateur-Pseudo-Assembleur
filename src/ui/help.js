/* Aide au survol des instructions : définitions du cours, telles qu'elles sont dans docs/instructions.md. */
(function (root) {
  'use strict';
  const V = (root.V8086 = root.V8086 || {});

  const arith = (name, word, sym) => ({
    title: `${name} — ${word}`,
    forms: [
      [`${name} OP1, OP2, OP3`, `OP3 ← op1 ${sym} op2`],
      [`${name} OP1, OP2`, `OP1 ← op1 ${sym} op2`],
      [`${name} OP`, `AC ← ac ${sym} op`],
      [`${name}`, `sl ${sym} tl remplace sl et tl dans la pile`],
    ],
    note: 'Met à jour le registre drapeau.',
  });

  const branch = (name, cond) => ({
    title: `${name} — branchement${name === 'BR' ? ' inconditionnel' : ' conditionnel'}`,
    forms: [[`${name} ÉTIQ`, name === 'BR' ? 'saute toujours à ÉTIQ' : `saute à ÉTIQ si le résultat du registre drapeau est ${cond}`]],
    note: name === 'BR' ? '' : 'Sinon, on continue à l\'instruction suivante.',
  });

  const HELP = {
    ADD: arith('ADD', 'addition', '+'),
    SUB: arith('SUB', 'soustraction', '−'),
    MPY: arith('MPY', 'multiplication', '×'),
    DIV: arith('DIV', 'division', '÷'),
    LOAD: { title: 'LOAD — chargement', forms: [['LOAD X', 'AC ← x']], note: 'Ne modifie pas le registre drapeau.' },
    STORE: { title: 'STORE — rangement', forms: [['STORE X', 'X ← ac']], note: 'Ne modifie pas le registre drapeau.' },
    PUSH: { title: 'PUSH — empiler', forms: [['PUSH X', 'x devient TL, l\'ancien TL devient SL']], note: 'Ne modifie pas le registre drapeau.' },
    POP: { title: 'POP — dépiler', forms: [['POP', 'TL est retiré de la pile'], ['POP X', 'X ← tl, TL est retiré de la pile']], note: 'Ne modifie pas le registre drapeau.' },
    BR: branch('BR'),
    BGT: branch('BGT', '> 0'),
    BGE: branch('BGE', '≥ 0'),
    BLT: branch('BLT', '< 0'),
    BLE: branch('BLE', '≤ 0'),
    BEZ: branch('BEZ', '= 0'),
    READ: { title: 'READ — lecture', forms: [['READ X', 'X ← nombre réel saisi dans la console']], note: '' },
    WRITE: { title: 'WRITE — écriture', forms: [['WRITE X', 'affiche « X = valeur » dans la console']], note: 'PRINT est un synonyme.' },
    PRINT: { title: 'PRINT — écriture', forms: [['PRINT X', 'affiche « X = valeur » dans la console']], note: 'Synonyme de WRITE.' },
    END: { title: 'END — fin du programme', forms: [['END', 'arrête le programme']], note: 'STOP est un synonyme. Obligatoire.' },
    STOP: { title: 'STOP — fin du programme', forms: [['STOP', 'arrête le programme']], note: 'Synonyme de END.' },
    DATA: { title: 'DATA — déclaration', forms: [['DATA NOM, valeur', 'crée la variable NOM avec cette valeur']], note: 'Lue avant l\'exécution, ne s\'exécute pas.' },
    MODE: { title: 'MODE — format de l\'exercice', forms: [['MODE n', 'n = 0, 1, 2 ou 3 adresses ; refuse les instructions d\'un autre format']], note: 'Facultatif, une seule fois, avant la première instruction.' },
  };

  if (typeof module === 'object' && module.exports) module.exports = HELP;
  else V.help = HELP;
})(typeof window !== 'undefined' ? window : globalThis);
