'use strict';
/* Scénarios de l'interface dans un vrai navigateur. Demande Playwright :
     npm install --no-save playwright && npx playwright install chromium
     node tests/ui/scenarios.js [dossier-des-captures]
   Non inclus dans « npm test » (le navigateur n'est pas toujours disponible). */
const path = require('path');
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
  await page.evaluate(() => localStorage.clear());
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
  await choose('s2');
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
  check((await text('#console')).includes('SOMME = 10'), 'A11 sortie SOMME = 10');
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
  await choose('s8');
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
  const cons = await text('#console');
  check(cons.includes('A = 9') && cons.includes('B = 5') && cons.includes('C = 2'), 'E3 tri de 5, 9, 2 : A=9, B=5, C=2');

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
  await choose('s4');
  await page.click('.gl[data-line="10"]');
  await clearCons();
  await page.click('#btnRun');
  for (const v of ['3', '4', '10', '2']) {
    await page.waitForSelector('.readbox input');
    await page.fill('.readbox input', v);
    await page.keyboard.press('Enter');
  }
  await waitConsole("Point d'arrêt à la ligne 10");
  const st = await page.$$eval('#stack .si', (r) => r.map((x) => x.textContent));
  check(JSON.stringify(st) === JSON.stringify(['TL0', 'SL2']), 'G1 pile : TL = 0, SL = d = 2 (obtenu ' + JSON.stringify(st) + ')');
  await shot(page, 'shot7-stack.png');
  await page.click('.gl[data-line="10"]');

  // ---------- I. Boucle infinie : la pause reste possible à vitesse maximale
  await page.fill('.code-input', 'DATA A, 1\nL: ADD A, A, X\nBR L\nEND\n');
  await page.waitForTimeout(200);
  await page.click('#btnReset');
  await setSpeed(5);
  await clearCons();
  await page.click('#btnRun');
  await page.waitForTimeout(600);
  check((await text('#btnRun')) === 'Pause', 'I1 boucle infinie en cours à vitesse maximale');
  await page.click('#btnRun');
  check((await text('#btnRun')) === 'Reprendre', 'I2 la pause fonctionne');
  const nbLignes = await page.$$eval('#console .cl', (r) => r.length);
  check(nbLignes <= 502, 'I3 la console reste bornée (' + nbLignes + ' lignes)');
  await setSpeed(3);

  // ---------- H. Thème clair
  await page.click('#btnTheme');
  check((await page.getAttribute('html', 'data-theme')) === 'light', 'H1 thème clair');
  await shot(page, 'shot8-light.png');

  console.log('problèmes console :', problems);
  check(problems.length === 0, 'aucune erreur ni alerte dans la console du navigateur');
  console.log(failures ? `\n${failures} ÉCHEC(S)` : '\nTOUT OK');
  if (failures) process.exitCode = 1;
  await browser.close();
})().catch((e) => { console.error('ECHEC fatal', e); process.exit(1); });
