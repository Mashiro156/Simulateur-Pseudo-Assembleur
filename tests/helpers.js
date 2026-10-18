'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const { compile } = require(path.join(root, 'src/compiler.js'));
const { runToEnd, VM } = require(path.join(root, 'src/vm/vm.js'));
const E = require(path.join(root, 'src/errors/errors.js'));

/* Compile puis exécute. Renvoie { error, text, output, vm } :
   error : première erreur (compilation ou exécution), ou null. */
function diagnose(source, inputs) {
  const c = compile(source);
  if (!c.ok) return { error: c.error, text: E.format(c.error, c.lines), output: [], vm: null, compiled: false };
  const r = runToEnd(c.program, inputs || []);
  return {
    error: r.error,
    text: r.error ? E.format(r.error, c.lines) : null,
    output: r.output,
    vm: r.vm,
    compiled: true,
  };
}

const codeOf = (source, inputs) => {
  const d = diagnose(source, inputs);
  return d.error ? d.error.code : null;
};

const readDoc = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

// Blocs ```text d'un document Markdown, dans l'ordre, avec leur position.
function textBlocks(md) {
  const blocks = [];
  const re = /```text\n([\s\S]*?)\n```/g;
  let m;
  while ((m = re.exec(md))) blocks.push({ text: m[1] + '\n', raw: m[1], start: m.index, end: m.index + m[0].length });
  return blocks;
}

module.exports = { root, compile, runToEnd, VM, E, diagnose, codeOf, readDoc, textBlocks };
