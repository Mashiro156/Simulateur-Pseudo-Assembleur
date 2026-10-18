/* Erreurs : catalogue des codes, formatage des messages, collecteur.
   Le catalogue public est docs/erreurs.md ; les deux doivent rester d'accord. */
(function (root) {
  'use strict';
  const V = (root.V8086 = root.V8086 || {});

  // Titre court de chaque code (celui de docs/erreurs.md).
  const CATALOG = {
    E101: 'Caractère invalide',
    E102: 'Minuscules dans le code',
    E103: 'Nombre mal formé',
    E104: 'Commentaire non fermé',
    E105: 'Nom invalide',
    E201: 'Instruction inconnue',
    E202: "Nombre d'opérandes incorrect",
    E203: 'Valeur immédiate interdite',
    E204: 'Étiquette mal formée',
    E205: 'Directive mal formée',
    E206: 'Instruction de fin manquante',
    E207: 'Directive MODE mal placée',
    E301: 'Étiquette inconnue',
    E302: 'Variable jamais initialisée',
    E303: 'Étiquette définie deux fois',
    E304: 'Variable déclarée deux fois',
    E305: 'Mot réservé utilisé comme nom',
    E306: 'Instruction hors mode',
    E307: 'Nom à la fois étiquette et variable',
    E308: 'Étiquette sans instruction',
    E401: 'Division par zéro',
    E402: 'Pile vide',
    E403: 'Variable sans valeur',
    E404: 'Accumulateur vide',
    E405: 'Registre drapeau vide',
    E406: 'Saisie invalide',
    E407: 'Fin du texte atteinte sans END',
  };

  class Diagnostic extends Error {
    /* code : 'E302' ; line, col : 1-based ; title : texte du message ;
       help : aide (ou null) ; length : nombre de caractères soulignés. */
    constructor(code, line, col, title, help, length) {
      super(title);
      this.name = 'Diagnostic';
      this.code = code;
      this.line = line;
      this.col = col;
      this.title = title;
      this.help = help || null;
      this.length = Math.max(1, length || 1);
    }
    get phase() {
      return { 1: 'lexique', 2: 'syntaxe', 3: 'sens', 4: 'exécution' }[this.code[1]];
    }
    get catalogTitle() {
      return CATALOG[this.code] || '';
    }
  }

  // Message complet : titre, position, extrait de la ligne avec ^, aide.
  function format(err, lines) {
    const src = err.line >= 1 && err.line <= lines.length ? lines[err.line - 1].replace(/\t/g, ' ') : '';
    const out = [
      `Erreur ${err.code} — ${err.title}  (ligne ${err.line}, colonne ${err.col})`,
      '',
      `${String(err.line).padStart(5)} | ${src}`,
      `${''.padStart(5)} | ${' '.repeat(err.col - 1)}${'^'.repeat(err.length)}`,
    ];
    if (err.help) out.push('', `Aide : ${err.help}`);
    return out.join('\n');
  }

  class AnalysisAbort extends Error {
    constructor(diagnostic) {
      super(diagnostic.title);
      this.name = 'AnalysisAbort';
      this.diagnostic = diagnostic;
    }
  }

  /* Collecteur : les étapes d'analyse signalent leurs erreurs ici, sans savoir
     combien seront rapportées. Avec stopAtFirst (comportement actuel), la première
     erreur interrompt l'analyse. Sans, add() rend la main et l'étape passe à
     l'élément suivant : c'est le seul endroit à changer pour rapporter toutes les erreurs. */
  function createCollector(opts) {
    const stopAtFirst = !opts || opts.stopAtFirst !== false;
    const errors = [];
    return {
      errors,
      add(diagnostic) {
        errors.push(diagnostic);
        if (stopAtFirst) throw new AnalysisAbort(diagnostic);
      },
    };
  }

  // Suggestion de nom proche (rapport de ressemblance de Ratcliff/Obershelp, seuil 0,6).
  function matchingChars(a, b) {
    if (!a.length || !b.length) return 0;
    let best = 0, ai = 0, bi = 0;
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b.length; j++) {
        let k = 0;
        while (i + k < a.length && j + k < b.length && a[i + k] === b[j + k]) k++;
        if (k > best) { best = k; ai = i; bi = j; }
      }
    }
    if (best === 0) return 0;
    return best + matchingChars(a.slice(0, ai), b.slice(0, bi)) + matchingChars(a.slice(ai + best), b.slice(bi + best));
  }

  function similarity(a, b) {
    const t = a.length + b.length;
    return t === 0 ? 1 : (2 * matchingChars(a, b)) / t;
  }

  function closeMatch(word, choices) {
    let best = null, bestScore = 0;
    for (const c of choices) {
      if (c === word) continue;
      const s = similarity(word, c);
      if (s < 0.6) continue;
      if (best === null || s > bestScore || (s === bestScore && c > best)) { best = c; bestScore = s; }
    }
    return best;
  }

  const api = { CATALOG, Diagnostic, AnalysisAbort, format, createCollector, closeMatch };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else V.errors = api;
})(typeof window !== 'undefined' ? window : globalThis);
