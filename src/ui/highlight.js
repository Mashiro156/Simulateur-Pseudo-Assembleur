/* Coloration : classe chaque caractère du texte (instruction, adresse, étiquette,
   nombre, commentaire, erreur de forme). Tolérant : fonctionne sur un programme incomplet ou faux. */
(function (root) {
  'use strict';
  const V = (root.V8086 = root.V8086 || {});
  const isNode = typeof module === 'object' && module.exports;
  const Lexer = isNode ? require('../lexer/lexer.js') : V.lexer;
  const L = isNode ? require('../language.js') : V.language;

  const CLASS = {
    ins: 't-ins', 'label-def': 't-label', 'label-ref': 't-label', var: 't-var',
    num: 't-num', punct: 't-punct', bad: 't-bad', comment: 't-comment',
  };

  /* Pour chaque ligne : { text, base:[classe par caractère], tokens:[{text,start,end,role,line}] }.
     labelLines : nom d'étiquette -> numéro de la ligne de sa première définition. */
  function analyzeText(lines) {
    const { clean, spans } = Lexer.stripComments(lines);
    const labelLines = {};
    const out = clean.map((codeText, idx) => {
      const text = lines[idx];
      const base = new Array(text.length).fill('');
      for (const [s, e] of spans[idx]) for (let i = s; i < e && i < text.length; i++) base[i] = CLASS.comment;

      const toks = [];
      for (const m of codeText.matchAll(Lexer.TOKEN)) {
        toks.push({ text: m[0], start: m.index, end: m.index + m[0].length, role: 'bad', line: idx + 1 });
      }
      let i = 0, instr = null;
      if (toks.length >= 2 && toks[1].text === ':' && Lexer.NAME.test(toks[0].text)) {
        toks[0].role = 'label-def';
        toks[1].role = 'punct';
        if (!(toks[0].text in labelLines)) labelLines[toks[0].text] = idx + 1;
        i = 2;
      }
      if (i < toks.length) {
        const t = toks[i++];
        if (L.MNEMONICS.has(t.text) || L.DIRECTIVES.includes(t.text)) { t.role = 'ins'; instr = t.text; }
        else if (Lexer.NAME.test(t.text)) t.role = 'var';
      }
      for (; i < toks.length; i++) {
        const t = toks[i];
        if (t.text === ',' || t.text === ':') t.role = 'punct';
        else if (Lexer.NUMBER.test(t.text)) t.role = 'num';
        else if (Lexer.NAME.test(t.text)) t.role = instr && L.isBranch(instr) ? 'label-ref' : 'var';
      }
      for (const t of toks) for (let k = t.start; k < t.end; k++) base[k] = CLASS[t.role];
      return { text, base, tokens: toks };
    });
    return { lines: out, labelLines };
  }

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* HTML d'une ligne. marks : [{ start, end, cls }] en colonnes de base 0 (soulignement d'erreur...). */
  function lineToHtml(info, marks) {
    const { text, base } = info;
    let html = '', buf = '', cur = null;
    const flush = () => {
      if (!buf) return;
      html += cur ? `<span class="${cur}">${esc(buf)}</span>` : esc(buf);
      buf = '';
    };
    for (let i = 0; i < text.length; i++) {
      let c = base[i] || '';
      for (const m of marks) if (i >= m.start && i < m.end) c += ` ${m.cls}`;
      if (c !== cur) { flush(); cur = c; }
      buf += text[i];
    }
    flush();
    return html;
  }

  function tokenAt(info, col0) {
    return info.tokens.find((t) => col0 >= t.start && col0 < t.end && t.role !== 'punct') || null;
  }

  const api = { analyzeText, lineToHtml, tokenAt, esc };
  if (isNode) module.exports = api;
  else V.highlight = api;
})(typeof window !== 'undefined' ? window : globalThis);
