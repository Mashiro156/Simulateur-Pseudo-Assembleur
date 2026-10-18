/* Analyse lexicale : retire les commentaires, découpe le texte en jetons,
   refuse les caractères, minuscules et nombres invalides (erreurs E1xx). */
(function (root) {
  'use strict';
  const V = (root.V8086 = root.V8086 || {});
  const isNode = typeof module === 'object' && module.exports;
  const E = isNode ? require('../errors/errors.js') : V.errors;

  /* Retire les commentaires en gardant les positions : chaque caractère de
     commentaire devient une espace. `spans` donne, pour chaque ligne, les plages
     [début, fin[ (base 0) occupées par un commentaire ; l'éditeur s'en sert pour la coloration. */
  function stripComments(lines) {
    const clean = [], spans = [];
    let inBlock = false, unclosed = null;
    lines.forEach((text, idx) => {
      const sp = [];
      let out = '', i = 0, spanStart = inBlock ? 0 : -1;
      while (i < text.length) {
        if (inBlock) {
          if (text.startsWith('//', i)) {
            inBlock = false; unclosed = null;
            out += '  '; i += 2;
            sp.push([spanStart, i]); spanStart = -1;
          } else { out += ' '; i++; }
        } else if (text[i] === '#') {
          sp.push([i, text.length]);
          out += ' '.repeat(text.length - i);
          i = text.length;
        } else if (text.startsWith('//', i)) {
          inBlock = true; unclosed = { line: idx + 1, col: i + 1 };
          spanStart = i; out += '  '; i += 2;
        } else { out += text[i]; i++; }
      }
      if (inBlock) sp.push([spanStart < 0 ? 0 : spanStart, text.length]);
      clean.push(out);
      spans.push(sp);
    });
    return { clean, spans, unclosed };
  }

  const TOKEN = /[A-Za-z0-9_.\-]+|[,:]|\S/g;
  const NUMBER = /^-?\d+(\.\d+)?$/;
  const NAME = /^[A-Z][A-Z0-9_]*$/;
  const LOWER_NAME = /^[A-Za-z][A-Za-z0-9_]*$/;
  const BAD_NUMBER = /^-?[0-9.]+$/;
  const WORD = /^[A-Za-z0-9_.\-]+$/;

  /* Jetons : { kind: NAME | NUM | COMMA | COLON, text, col, line }.
     Les erreurs sont signalées au collecteur ; le jeton fautif est alors ignoré. */
  function lex(cleanLines, collector) {
    const D = E.Diagnostic;
    return cleanLines.map((text, idx) => {
      const line = idx + 1, row = [];
      for (const m of text.matchAll(TOKEN)) {
        const s = m[0], col = m.index + 1, n = s.length;
        if (s === ',') row.push({ kind: 'COMMA', text: s, col, line });
        else if (s === ':') row.push({ kind: 'COLON', text: s, col, line });
        else if (WORD.test(s)) {
          if (NUMBER.test(s)) row.push({ kind: 'NUM', text: s, col, line });
          else if (NAME.test(s)) row.push({ kind: 'NAME', text: s, col, line });
          else if (LOWER_NAME.test(s)) {
            collector.add(new D('E102', line, col, `minuscules interdites dans « ${s} »`,
              `les instructions et les adresses s'écrivent en majuscules : « ${s.toUpperCase()} ». ` +
              "La minuscule désigne le contenu d'une adresse, pas l'adresse.", n));
          } else if (BAD_NUMBER.test(s)) {
            collector.add(new D('E103', line, col, `nombre mal formé « ${s} »`,
              'un nombre s\'écrit avec des chiffres et au plus un point décimal : 15, -3, 2.5.', n));
          } else {
            collector.add(new D('E105', line, col, `nom invalide « ${s} »`,
              'un nom commence par une lettre majuscule et ne contient que des majuscules, ' +
              'des chiffres et « _ ».', n));
          }
        } else {
          collector.add(new D('E101', line, col, `caractère invalide « ${s} »`,
            s === ';' ? 'les commentaires commencent par # ou sont entourés de // ... //.' : null, 1));
        }
      }
      return row;
    });
  }

  const api = { stripComments, lex, TOKEN, NAME, NUMBER };
  if (isNode) module.exports = api;
  else V.lexer = api;
})(typeof window !== 'undefined' ? window : globalThis);
