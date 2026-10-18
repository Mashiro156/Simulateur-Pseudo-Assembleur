/* Chaîne d'analyse : lexique -> syntaxe -> sens.
   compile(source) renvoie { ok, program, error, errors, lines }. */
(function (root) {
  'use strict';
  const V = (root.V8086 = root.V8086 || {});
  const isNode = typeof module === 'object' && module.exports;
  const E = isNode ? require('./errors/errors.js') : V.errors;
  const Lexer = isNode ? require('./lexer/lexer.js') : V.lexer;
  const Parser = isNode ? require('./parser/parser.js') : V.parser;
  const Semantic = isNode ? require('./semantic/semantic.js') : V.semantic;

  function splitLines(source) {
    return String(source).split(/\r\n|\r|\n/);
  }

  function compile(source, options) {
    const lines = splitLines(source);
    const collector = E.createCollector(options);
    let program = null;
    try {
      const { clean, spans, unclosed } = Lexer.stripComments(lines);
      const rows = Lexer.lex(clean, collector);
      if (unclosed) {
        collector.add(new E.Diagnostic('E104', unclosed.line, unclosed.col, 'commentaire « // » jamais fermé',
          'un commentaire sur plusieurs lignes s\'écrit // ... // ; il manque le second //.', 2));
      }
      // Une étape ne s'exécute que si les précédentes n'ont signalé aucune erreur :
      // cela évite les erreurs en cascade (une ligne illisible fait manquer des définitions).
      if (!collector.errors.length) program = Parser.parse(rows, lines, collector);
      if (!collector.errors.length) Semantic.analyze(program, collector);
      if (program) program.commentSpans = spans;
    } catch (e) {
      if (!(e instanceof E.AnalysisAbort)) throw e;
    }
    const errors = collector.errors;
    return { ok: errors.length === 0, program: errors.length ? null : program, error: errors[0] || null, errors, lines };
  }

  const api = { compile, splitLines };
  if (isNode) module.exports = api;
  else V.compiler = api;
})(typeof window !== 'undefined' ? window : globalThis);
