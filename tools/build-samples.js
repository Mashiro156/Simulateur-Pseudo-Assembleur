#!/usr/bin/env node
'use strict';
/* Génère src/ui/samples.js à partir des programmes de docs/exemples.md :
   les exemples proposés dans l'éditeur sont ceux de la documentation, pas une copie à tenir à jour.
   Usage : node tools/build-samples.js */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function build(md) {
  const samples = [];
  let h2 = '', h3 = '';
  const re = /^(##) (.+)$|^(###) (.+)$|```text\n([\s\S]*?)\n```/gm;
  let m;
  while ((m = re.exec(md))) {
    if (m[1]) { h2 = m[2]; h3 = ''; }
    else if (m[3]) h3 = m[4];
    else if (/^MODE \d/.test(m[5])) {
      const base = h2.replace(/\s*\(.*\)\s*$/, '');
      samples.push({
        id: `s${samples.length + 1}`,
        label: h3 ? `${base} — ${h3}` : h2,
        source: m[5] + '\n',
      });
    }
  }
  return samples;
}

function render(samples) {
  return `/* Fichier généré par tools/build-samples.js à partir de docs/exemples.md : ne pas modifier à la main. */
(function (root) {
  'use strict';
  const samples = ${JSON.stringify(samples, null, 2)};
  if (typeof module === 'object' && module.exports) module.exports = samples;
  else (root.V8086 = root.V8086 || {}).samples = samples;
})(typeof window !== 'undefined' ? window : globalThis);
`;
}

if (require.main === module) {
  const md = fs.readFileSync(path.join(root, 'docs/exemples.md'), 'utf8');
  const samples = build(md);
  fs.writeFileSync(path.join(root, 'src/ui/samples.js'), render(samples));
  console.log(`${samples.length} exemples écrits dans src/ui/samples.js`);
}

module.exports = { build, render };
