/* Définition du langage : mots réservés, formats, nombre d'opérandes.
   Ce fichier ne contient aucune logique d'analyse ni d'exécution. */
(function (root) {
  'use strict';
  const V = (root.V8086 = root.V8086 || {});

  const ARITH = ['ADD', 'SUB', 'MPY', 'DIV'];
  const BRANCH = ['BR', 'BGT', 'BGE', 'BLT', 'BLE', 'BEZ'];
  const ONE_OPERAND = ['LOAD', 'STORE', 'PUSH', 'POP', 'READ', 'WRITE', 'PRINT'];
  const ENDS = ['END', 'STOP'];
  const DIRECTIVES = ['DATA', 'MODE'];

  const MNEMONICS = new Set([...ARITH, ...BRANCH, ...ONE_OPERAND, ...ENDS]);
  const RESERVED = new Set([...MNEMONICS, ...DIRECTIVES]);

  // Synonymes : le programme analysé ne contient que les formes canoniques.
  const ALIAS = { PRINT: 'WRITE', STOP: 'END' };

  const isArith = (n) => ARITH.includes(n);
  const isBranch = (n) => BRANCH.includes(n);
  const isEnd = (n) => ENDS.includes(n);

  function arityOk(name, n) {
    if (isArith(name)) return n >= 0 && n <= 3;
    if (isEnd(name)) return n === 0;
    return n === 1;
  }

  function arityText(name) {
    if (isArith(name)) return '0, 1, 2 ou 3 opérandes';
    if (isEnd(name)) return 'aucun opérande';
    return '1 opérande';
  }

  function validForms(name) {
    if (isArith(name)) return `${name}, ${name} X, ${name} X, Y ou ${name} X, Y, Z`;
    if (isEnd(name)) return name;
    if (isBranch(name)) return `${name} ÉTIQUETTE`;
    return `${name} X`;
  }

  // Format (nombre d'adresses) d'une instruction, ou null si elle est valable dans tous les modes.
  function family(ins) {
    if (isArith(ins.name)) return ins.ops.length;
    if (ins.name === 'LOAD' || ins.name === 'STORE') return 1;
    if (ins.name === 'PUSH' || ins.name === 'POP') return 0;
    return null;
  }

  const api = {
    ARITH, BRANCH, ONE_OPERAND, ENDS, DIRECTIVES, MNEMONICS, RESERVED, ALIAS,
    isArith, isBranch, isEnd, arityOk, arityText, validForms, family,
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else V.language = api;
})(typeof window !== 'undefined' ? window : globalThis);
