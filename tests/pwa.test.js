'use strict';
/* L'application doit pouvoir fonctionner sans connexion : tout fichier chargé par index.html
   doit être dans la liste du service worker, et le manifeste doit pointer sur des icônes réelles. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { root, readDoc } = require('./helpers');

const html = readDoc('index.html');
const sw = readDoc('sw.js');
const manifest = JSON.parse(readDoc('manifest.webmanifest'));
const files = [...sw.match(/const FILES = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
const exists = (f) => fs.existsSync(path.join(root, f));
const pngSize = (f) => { const b = fs.readFileSync(path.join(root, f)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test('le service worker met en cache tous les fichiers chargés par index.html', () => {
  const refs = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map((m) => m[1]).filter((r) => !/^https?:/.test(r));
  assert.ok(refs.length > 10);
  for (const r of refs) assert.ok(files.includes(r), `${r} absent de la liste de sw.js`);
});

test('tous les fichiers listés par le service worker existent', () => {
  for (const f of files) assert.ok(f === './' || exists(f), `${f} introuvable`);
});

test('le manifeste est complet et ses icônes existent à la bonne taille', () => {
  assert.equal(manifest.name, 'V8086');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.ok(html.includes('rel="manifest" href="manifest.webmanifest"'));
  assert.ok(manifest.icons.some((i) => i.purpose === 'maskable'));
  for (const i of manifest.icons) {
    assert.ok(exists(i.src), `${i.src} introuvable`);
    const [w, h] = i.sizes.split('x').map(Number);
    assert.deepEqual(pngSize(i.src), [w, h], i.src);
    assert.ok(files.includes(i.src), `${i.src} absent du cache`);
  }
});

test('les chemins sont relatifs (l\'application peut être servie depuis un sous-dossier)', () => {
  assert.ok(!/(?:src|href)="\//.test(html));
  assert.ok(!/'\//.test(sw.match(/const FILES = \[([\s\S]*?)\];/)[1]));
});
