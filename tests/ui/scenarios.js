'use strict';
/* Scénarios de l'interface dans un vrai navigateur. Demande Playwright :
     npm install --no-save playwright && npx playwright install chromium
     node tests/ui/scenarios.js [dossier-des-captures]
   Non inclus dans « npm test » (le navigateur n'est pas toujours disponible). */
const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || null;
const URL = 'file://' + path.join(__dirname, '..', '..', 'index.html');
let failures = 0;
const shot = (page, name) => SHOTS ? page.screenshot({ path: path.join(SHOTS, name) }) : null;
const check = (cond, msg) => { if (!cond) { failures++; console.log('ECHEC :', msg); } else console.log('ok    :', msg); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const problems = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) problems.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => problems.push('requestfailed: ' + r.url()));
  await page.goto(URL);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('v8086.tour', 'done'); });
  await page.reload();

  const text = (sel) => page.textContent(sel);
  const setSpeed = (v) => page.$eval('#speed', (el, v) => { el.value = v; el.dispatchEvent(new Event('input')); }, v);
  const clearCons = () => page.click('#btnClear');
  const waitConsole = (s, t = 8000) => page.waitForFunction((s) => document.getElementById('console').textContent.includes(s), s, { timeout: t });
  // Position écran d'un caractère (ligne, colonne en base 0) dans l'éditeur
  const charPos = (line, col) => page.evaluate(([line, col]) => {
    const ta = document.querySelector('.code-input');
    const r = ta.getBoundingClientRect(), cs = getComputedStyle(ta);
    const lh = parseFloat(cs.lineHeight);
    const probe = document.createElement('span');
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${cs.font}`;
    probe.textContent = 'M'.repeat(50); document.body.appendChild(probe);
    const cw = probe.getBoundingClientRect().width / 50; probe.remove();
    return { x: r.left + parseFloat(cs.paddingLeft) + (col + 0.5) * cw - ta.scrollLeft,
             y: r.top + parseFloat(cs.paddingTop) + (line - 0.5) * lh - ta.scrollTop };
  }, [line, col]);
  const choose = async (id) => { await page.selectOption('#samples', id); await page.waitForTimeout(150); };

  // ---------- A. Boucle avec point d'arrêt
  await choose('s4');
  check((await text('#analysis')).includes('Aucune erreur'), 'A1 exemple boucle sans erreur');
  await page.click('#btnStep');
  check((await text('#pcValue')) === '6', 'A2 Pas à pas charge le programme, prochaine ligne 6');
  check((await text('#console')).includes('Compilation réussie'), 'A3 console : compilation réussie');
  await page.click('#btnStep');
  check((await text('#pcValue')) === '7', 'A4 un pas : ligne 7');
  check((await text('#acValue')) === '4', 'A5 AC = 4 après LOAD N');
  await page.click('#btnBack');
  check((await text('#pcValue')) === '6' && (await text('#acValue')) === '—', 'A6 retour arrière : ligne 6, AC vide');
  await page.click('.gl[data-line="12"]');
  check(await page.$('.gl[data-line="12"].bp-on') !== null, 'A7 point d\'arrêt posé ligne 12');
  await setSpeed(4);
  await page.click('#btnRun');
  await waitConsole("Point d'arrêt à la ligne 12");
  check((await text('#pcValue')) === '12', 'A8 arrêt sur le point d\'arrêt (ligne 12)');
  check((await text('#btnRun')) === 'Reprendre', 'A9 bouton Reprendre');
  check(await page.$('.ln.current') !== null, 'A10 ligne courante surlignée');
  await shot(page, 'shot3-breakpoint.png');
  await page.click('.gl[data-line="12"]');
  await page.click('#btnRun');
  await waitConsole('Programme terminé');
  check((await text('#console')).includes('RES = 10'), 'A11 sortie RES = 10');
  check((await text('#pcValue')) === 'terminé', 'A12 prochaine ligne : terminé');

  // ---------- B. Erreurs dans l'éditeur
  await page.fill('.code-input', 'DATA A, 1\nADD a, A, X\nWRITE X\nEND\n');
  await page.waitForTimeout(300);
  check((await text('#analysis')).includes('E102'), 'B1 E102 affichée dans la barre d\'état');
  check(await page.$('.err-u') !== null, 'B2 soulignement d\'erreur présent');
  check((await text('#dirty')).includes('modifié') && !(await page.$eval('#dirty', (e) => e.hidden)), 'B3 « code modifié » affiché (machine encore chargée)');
  const p = await charPos(2, 4);
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(250);
  const tipErr = await page.$eval('.tooltip', (e) => ({ hidden: e.hidden, t: e.textContent }));
  check(!tipErr.hidden && tipErr.t.includes('E102'), 'B4 info-bulle de l\'erreur au survol');
  await shot(page, 'shot4-error.png');
  await page.click('#btnRun');
  await page.waitForTimeout(200);
  check((await text('#console')).includes('Erreur E102'), 'B5 Exécuter : l\'erreur est écrite dans la console');
  check((await page.$eval('#console a', (a) => a.getAttribute('href'))) === 'docs/erreurs.md#e102', 'B6 le code d\'erreur est un lien vers la documentation');
  check((await text('#pcValue')) === '—', 'B7 machine non chargée après erreur de compilation');

  // ---------- C. Aide au survol d'une instruction et d'une variable
  await page.fill('.code-input', 'DATA A, 15\nDATA B, 10\nADD A, B, X\nWRITE X\nEND\n');
  await page.waitForTimeout(300);
  let q = await charPos(3, 1);
  await page.mouse.move(q.x, q.y);
  await page.waitForTimeout(250);
  check((await page.$eval('.tooltip', (e) => !e.hidden && e.textContent.includes('addition') && e.textContent.includes('OP3 ← op1 + op2'))), 'C1 aide de ADD au survol');
  await page.click('#btnStep'); // charge
  await page.click('#btnStep'); // exécute ADD
  await page.mouse.move(10, 10);
  q = await charPos(3, 10);
  await page.mouse.move(q.x, q.y);
  await page.waitForTimeout(250);
  const tipVar = await page.$eval('.tooltip', (e) => e.hidden ? '' : e.textContent);
  check(tipVar.includes('X = 25'), 'C2 valeur de X au survol : ' + tipVar);
  check((await text('#flagValue')) === '25', 'C3 registre drapeau = 25');
  check(await page.$('#memBody tr[data-name="X"] .val-btn.flash, #memBody tr[data-name="X"] .flash') !== null, 'C4 la valeur modifiée est mise en évidence');

  // ---------- D. Modification manuelle de la mémoire
  await page.fill('.code-input', 'DATA A, 15\nDATA B, 10\nADD A, B, X\nWRITE X\nEND\n');
  await page.click('#btnReset');
  await page.click('#btnStep'); // ADD
  check(await page.$('#memBody.editable') !== null, 'D1 mémoire modifiable en pas à pas');
  await page.click('#memBody .val-btn[data-name="A"]');
  await page.fill('#memBody input', '100');
  await page.keyboard.press('Enter');
  check((await text('#memBody')).includes('100'), 'D2 A modifiée à la main');
  await clearCons();
  await page.click('#btnRun');
  await waitConsole('Programme terminé');
  check((await text('#console')).includes('X = 25'), 'D3 la modification n\'agit que sur la suite (X déjà calculé)');

  // ---------- E. READ pendant l'exécution
  await page.fill('.code-input', 'MODE 3\nREAD A\nREAD B\nREAD C\nADD A, B, T\nADD T, C, S\nWRITE S\nEND\n');
  await page.waitForTimeout(300);
  await setSpeed(4);
  await clearCons();
  await page.click('#btnRun');
  await page.waitForSelector('.readbox input');
  check((await text('.readbox')).includes('READ A'), 'E1 saisie demandée pour A');
  await shot(page, 'shot5-read.png');
  await page.fill('.readbox input', '5'); await page.keyboard.press('Enter');
  await page.waitForSelector('.readbox input');
  check((await text('.readbox')).includes('READ B'), 'E2 l\'exécution reprend puis demande B');
  await page.fill('.readbox input', '9'); await page.keyboard.press('Enter');
  await page.waitForSelector('.readbox input');
  await page.fill('.readbox input', '2'); await page.keyboard.press('Enter');
  await waitConsole('Programme terminé');
  check((await text('#console')).includes('S = 16'), 'E3 somme de 5, 9, 2 : S = 16');

  // ---------- F. Erreur d'exécution (saisie invalide) et retour
  await page.click('#btnReset');
  await page.click('#btnStep');
  await page.fill('.readbox input', 'abc'); await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  check((await text('#console')).includes('Erreur E406'), 'F1 E406 pour une saisie invalide');
  check(await page.$('.err-line') !== null, 'F2 ligne de l\'erreur marquée');
  check(!(await page.$eval('#btnBack', (b) => b.disabled)), 'F3 Retour disponible après l\'erreur');
  await shot(page, 'shot6-runtime-error.png');
  await page.click('#btnBack');
  check(await page.$('.err-line') === null, 'F4 Retour efface l\'erreur');

  // ---------- G. Pile avec TL et SL
  await choose('s3');
  await page.click('.gl[data-line="10"]');
  await clearCons();
  await page.click('#btnRun');
  await waitConsole("Point d'arrêt à la ligne 10");
  const st = await page.$$eval('#stack .si', (r) => r.map((x) => x.textContent));
  check(JSON.stringify(st) === JSON.stringify(['TL3', 'SL15']), 'G1 pile : TL = 3 (C), SL = 15 (A + B) (obtenu ' + JSON.stringify(st) + ')');
  await shot(page, 'shot7-stack.png');
  await page.click('.gl[data-line="10"]');

  // ---------- H. Thème clair
  await page.click('#btnTheme');
  check((await page.getAttribute('html', 'data-theme')) === 'light', 'H1 thème clair');
  await shot(page, 'shot8-light.png');

  // ---------- I. POP sans argument
  await page.fill('.code-input', 'MODE 0\nDATA A, 1\nDATA B, 2\nPUSH A\nPUSH B\nPOP\nPOP X\nWRITE X\nEND\n');
  await page.waitForTimeout(300);
  check((await text('#analysis')).includes('Aucune erreur'), 'I1 POP sans argument accepté');
  await clearCons(); await setSpeed(4);
  await page.click('#btnRun');
  await waitConsole('Programme terminé');
  check((await text('#console')).includes('X = 1'), 'I2 POP retire TL (2), POP X reçoit 1');
  await page.fill('.code-input', 'POP\nEND\n');
  await page.waitForTimeout(300);
  await clearCons();
  await page.click('#btnRun');
  await waitConsole('Erreur E402');
  check(true, 'I3 POP sur pile vide : E402');

  // ---------- J. Variables permanentes
  const openAdd = async () => { await page.click('#btnAddVar'); await page.waitForSelector('#varDialog[open]'); };
  await page.fill('.code-input', 'DATA A, 4\nADD A, UN, X\nWRITE X\nEND\n');
  await page.waitForTimeout(300);
  check((await text('#analysis')).includes('E302'), 'J1 UN inconnue : E302 avant d\'avoir défini la variable permanente');
  await openAdd();
  await page.fill('#varName', 'un'); await page.fill('#varValue', '1'); await page.click('#varForm button[type=submit]');
  check(!(await page.$eval('#varError', (e) => e.hidden)), 'J2 nom en minuscules refusé dans la fenêtre');
  await page.fill('#varName', 'UN');
  await page.fill('#varValue', '1,5'); await page.click('#varForm button[type=submit]');
  check(!(await page.$eval('#varError', (e) => e.hidden)), 'J3 valeur avec virgule refusée');
  await page.fill('#varValue', '1'); await page.click('#varForm button[type=submit]');
  check(await page.$('#varDialog[open]') === null, 'J4 fenêtre fermée après enregistrement');
  check((await text('#memBody tr[data-name="UN"]')).includes('perm.'), 'J5 UN apparaît dans la mémoire, marquée permanente');
  await page.waitForTimeout(300);
  check((await text('#analysis')).includes('Aucune erreur'), 'J6 le programme compile maintenant');
  await clearCons();
  await page.click('#btnRun');
  await waitConsole('Programme terminé');
  check((await text('#console')).includes('X = 5'), 'J7 X = 4 + 1 = 5');
  await page.fill('.code-input', 'DATA UN, 10\nDATA A, 4\nADD A, UN, X\nWRITE X\nEND\n');
  await page.waitForTimeout(300);
  await clearCons();
  await page.click('#btnRun');
  await waitConsole('Programme terminé');
  check((await text('#console')).includes('X = 14'), 'J8 DATA UN, 10 écrase la valeur permanente');
  const rowUN = await text('#memBody tr[data-name="UN"]');
  check(rowUN.includes('DATA') && rowUN.includes('10'), 'J9 la nouvelle valeur (10) est affichée, origine DATA');
  await page.reload();
  check((await text('#memBody tr[data-name="UN"]')).includes('1'), 'J10 la variable permanente survit au rechargement');
  // Export
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btnExport')]);
  const exported = fs.readFileSync(await dl.path(), 'utf8');
  check(JSON.parse(exported).variables.some((v) => v.name === 'UN' && v.value === 1), 'J11 export : fichier JSON contenant UN = 1');
  // Suppression puis import du fichier exporté
  await page.click('#memBody tr[data-name="UN"] [data-act="del"]');
  check(await page.$('#memBody tr[data-name="UN"]') === null, 'J12 suppression de UN');
  await page.setInputFiles('#fileImport', { name: 'v.json', mimeType: 'application/json', buffer: Buffer.from(exported) });
  await page.waitForSelector('#memBody tr[data-name="UN"]');
  check(true, 'J13 import : UN est revenue');
  // Modification
  await page.click('#memBody tr[data-name="UN"] [data-act="edit"]');
  await page.waitForSelector('#varDialog[open]');
  check(await page.$eval('#varName', (e) => e.readOnly), 'J14 le nom n\'est pas modifiable à l\'édition');
  await page.fill('#varValue', '7'); await page.click('#varForm button[type=submit]');
  check((await text('#memBody tr[data-name="UN"] .val-btn')) === '7', 'J15 valeur permanente modifiée : 7');
  await shot(page, 'shot9-permanent.png');

  console.log('problèmes console :', problems);
  check(problems.length === 0, 'aucune erreur ni alerte dans la console du navigateur (ordinateur)');
  problems.length = 0;

  // ---------- K. Téléphone : un panneau à la fois, onglets
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const m = await ctx.newPage();
  m.on('console', (x) => { if (['error', 'warning'].includes(x.type())) problems.push(`mobile ${x.type()}: ${x.text()}`); });
  m.on('pageerror', (e) => problems.push('mobile pageerror: ' + e.message));
  await m.goto(URL);
  await m.evaluate(() => { localStorage.clear(); localStorage.setItem('v8086.tour', 'done'); });
  await m.reload();
  const vis = (sel) => m.$eval(sel, (e) => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0);
  check(await vis('.tabbar'), 'K1 barre d\'onglets visible');
  check(await vis('.editor-panel') && !(await vis('.console-panel')) && !(await vis('.right')), 'K2 onglet Éditeur : seul l\'éditeur est affiché');
  check(await vis('.toolbar'), 'K3 les commandes restent visibles');
  check(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'K4 pas de défilement horizontal de la page');
  await shot(m, 'shot10-mobile-editor.png');
  await m.tap('.tabbar [data-tab="machine"]');
  check(await vis('.right') && !(await vis('.editor-panel')), 'K5 onglet Machine : mémoire et pile affichées');
  check(await vis('.toolbar'), 'K6 les commandes restent visibles sur l\'onglet Machine');
  await shot(m, 'shot11-mobile-machine.png');
  await m.tap('.tabbar [data-tab="editor"]');
  await m.selectOption('#samples', 's5');
  await m.tap('#btnRun');
  await m.waitForFunction(() => document.getElementById('console').textContent.includes('Programme terminé'));
  await m.tap('.tabbar [data-tab="console"]');
  check(await vis('.console-panel') && (await m.textContent('#console')).includes('RES = 15'), 'K7 onglet Console : sortie RES = 15');
  // READ : la console s'affiche d'elle-même
  await m.tap('.tabbar [data-tab="editor"]');
  await m.fill('.code-input', 'READ A\nWRITE A\nEND\n');
  await m.waitForTimeout(250);
  await m.tap('#btnRun');
  await m.waitForSelector('.readbox input');
  check(await vis('.console-panel'), 'K8 READ : bascule automatique sur la console');
  await m.fill('.readbox input', '8'); await m.keyboard.press('Enter');
  await m.waitForFunction(() => document.getElementById('console').textContent.includes('A = 8'));
  // Erreur : bascule sur la console
  await m.tap('.tabbar [data-tab="editor"]');
  await m.fill('.code-input', 'ADD a, B\nEND\n');
  await m.waitForTimeout(250);
  await m.tap('#btnRun');
  await m.waitForTimeout(200);
  check(await vis('.console-panel') && (await m.textContent('#console')).includes('Erreur E102'), 'K9 erreur de compilation : bascule sur la console');
  // Point d'arrêt au toucher
  await m.tap('.tabbar [data-tab="editor"]');
  await m.fill('.code-input', 'DATA A, 1\nWRITE A\nEND\n');
  await m.waitForTimeout(250);
  await m.tap('.gl[data-line="2"]');
  check(await m.$('.gl[data-line="2"].bp-on') !== null, 'K10 point d\'arrêt posé d\'un toucher');
  // Fenêtre variable au téléphone
  await m.tap('.tabbar [data-tab="machine"]');
  await m.tap('#btnAddVar');
  await m.waitForSelector('#varDialog[open]');
  const box = await m.$eval('#varDialog', (e) => { const r = e.getBoundingClientRect(); return [r.left, r.right, innerWidth]; });
  check(box[0] >= 0 && box[1] <= box[2], 'K11 la fenêtre « Variable permanente » tient dans l\'écran');
  await shot(m, 'shot12-mobile-dialog.png');
  await m.tap('#varCancel');
  check(problems.length === 0, 'K12 aucune erreur dans la console du navigateur (téléphone) ' + JSON.stringify(problems));
  await ctx.close();

  // ---------- L. PWA : installation du service worker et fonctionnement hors connexion
  const root = path.join(__dirname, '..', '..');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.md': 'text/markdown' };
  const server = http.createServer((req, res) => {
    const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  }).listen(0);
  const base = `http://localhost:${server.address().port}/`;
  const pctx = await browser.newContext();
  const w = await pctx.newPage();
  const wproblems = [];
  w.on('console', (x) => { if (['error', 'warning'].includes(x.type())) wproblems.push(x.text()); });
  w.on('pageerror', (e) => wproblems.push(e.message));
  await w.goto(base);
  await w.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await w.waitForFunction(async () => (await caches.keys()).length > 0 && (await (await caches.open((await caches.keys())[0])).keys()).length > 20);
  check(true, 'L1 service worker actif, application mise en cache');
  const mf = await w.evaluate(() => fetch(document.querySelector('link[rel=manifest]').href).then((r) => r.json()));
  check(mf.name === 'V8086' && mf.display === 'standalone', 'L2 manifeste lu par le navigateur');
  await pctx.setOffline(true);
  await w.reload();
  await w.waitForSelector('.code-input');
  await w.selectOption('#samples', 's3');
  await w.click('#btnRun');
  await w.waitForFunction(() => document.getElementById('console').textContent.includes('RES = 45'));
  check(true, 'L3 hors connexion : l\'application se recharge et exécute un exemple');
  check(wproblems.length === 0, 'L4 aucune erreur dans la console (PWA) ' + JSON.stringify(wproblems));
  await pctx.close();
  server.close();

  console.log(failures ? `\n${failures} ÉCHEC(S)` : '\nTOUT OK');
  if (failures) process.exitCode = 1;
  await browser.close();
})().catch((e) => { console.error('ECHEC fatal', e); process.exit(1); });
