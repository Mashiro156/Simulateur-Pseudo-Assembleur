'use strict';
/* Les règles décrites dans docs/syntaxe.md et docs/instructions.md, une par une. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { diagnose, codeOf, compile } = require('./helpers');

const ok = (src, inputs) => assert.equal(codeOf(src, inputs), null, diagnose(src, inputs).text);
const err = (src, code, inputs) => assert.equal(codeOf(src, inputs), code, diagnose(src, inputs).text);

test('lexique : casse, commentaires, nombres', () => {
  err('DATA A, 1\nADD a, A, X\nEND\n', 'E102');
  err('DATA A, 1 ; c\nEND\n', 'E101');
  err('DATA A, 1.2.3\nEND\n', 'E103');
  err('DATA 1A, 1\nEND\n', 'E105');
  ok('# un\nDATA A, 1 # deux\n//\nplusieurs\nlignes\n//\nWRITE A\nEND\n');
  ok('DATA A, -3\nDATA B, 2.5\nWRITE A\nEND\n');
  err('//\nDATA A, 1\nEND\n', 'E104');
});

test('commentaire // sur une seule ligne et // dans un commentaire #', () => {
  ok('DATA A, 1 // note // \nWRITE A\nEND\n');
  ok('DATA A, 1 # note // pas un bloc\nWRITE A\nEND\n');
});

test('les fins de ligne Windows sont acceptées', () => {
  ok('DATA A, 1\r\nWRITE A\r\nEND\r\n');
});

test('étiquettes : devant l\'instruction ou seules, définies avant ou après le saut', () => {
  ok('DATA A, 1\nL1: WRITE A\nEND\n');
  ok('DATA A, 1\nL1:\nWRITE A\nEND\n');
  ok('DATA A, 1\nBR FIN\nWRITE A\nFIN: END\n');
  err('DATA A, 1\nL1: L2: WRITE A\nEND\n', 'E204');
  err('L1: DATA A, 1\nEND\n', 'E204');
  err('DATA A, 1\nWRITE A\nEND\nFIN:\n', 'E308');
  err('DATA A, 1\nL1: WRITE A\nL1: END\n', 'E303');
  err('DATA A, 1\nA: WRITE A\nEND\n', 'E307');
  err('DATA A, 1\nBR A\nEND\n', 'E301');
});

test('valeurs immédiates interdites, déclarables avec DATA', () => {
  err('DATA A, 1\nADD A, 3, X\nEND\n', 'E203');
  err('BR 3\nEND\n', 'E203');
  ok('DATA TROIS, 3\nDATA A, 1\nADD A, TROIS, X\nWRITE X\nEND\n');
});

test('nombre d\'opérandes', () => {
  err('DATA A, 1\nLOAD\nEND\n', 'E202');
  err('DATA A, 1\nLOAD A, A\nEND\n', 'E202');
  err('DATA A, 1\nADD A, A, A, A\nEND\n', 'E202');
  err('END A\n', 'E202');
  err('DATA A, 1\nADD A A, X\nEND\n', 'E202');
  err('DATA A, 1\nADD A,, X\nEND\n', 'E202');
  err('DATA A, 1\nADD A, X,\nEND\n', 'E202');
  err('DATA A, 1\nBGT\nEND\n', 'E202');
});

test('mots réservés et directives', () => {
  err('DATA ADD, 1\nWRITE ADD\nEND\n', 'E305');
  err('DATA A, 1\nEND: WRITE A\nEND\n', 'E305');
  err('DATA A\nEND\n', 'E205');
  err('DATA A, B\nEND\n', 'E205');
  err('MODE 4\nEND\n', 'E205');
  err('DATA A, 1\nDATA A, 2\nEND\n', 'E304');
  ok('DATA A, 1\nMODE 1\nWRITE A\nEND\n');
  err('DATA A, 1\nWRITE A\nMODE 1\nEND\n', 'E207');
  err('MODE 1\nMODE 1\nEND\n', 'E207');
});

test('fin du programme : END et STOP obligatoires et équivalents', () => {
  err('DATA A, 1\nWRITE A\n', 'E206');
  err('', 'E206');
  ok('DATA A, 1\nWRITE A\nSTOP\n');
  assert.deepEqual(diagnose('DATA A, 1\nPRINT A\nSTOP\n').output, ['A = 1']);
});

test('modes : instructions propres à chaque format', () => {
  err('MODE 0\nDATA A, 1\nLOAD A\nEND\n', 'E306');
  err('MODE 1\nDATA A, 1\nADD A, A, X\nEND\n', 'E306');
  err('MODE 2\nDATA A, 1\nPUSH A\nEND\n', 'E306');
  err('MODE 3\nDATA A, 1\nADD A, A\nEND\n', 'E306');
  ok('MODE 0\nDATA A, 1\nPUSH A\nPUSH A\nADD\nPOP X\nWRITE X\nEND\n');
  ok('MODE 1\nDATA A, 1\nLOAD A\nADD A\nSTORE X\nWRITE X\nEND\n');
  ok('MODE 2\nDATA A, 1\nADD A, A\nWRITE A\nEND\n');
  ok('MODE 3\nDATA A, 1\nADD A, A, X\nWRITE X\nEND\n');
  // sans MODE, les formats se mélangent
  ok('DATA A, 1\nADD A, A, X\nLOAD X\nADD A\nSTORE Y\nWRITE Y\nEND\n');
  // branchements, READ, WRITE, END valables dans tous les modes
  ok('MODE 2\nREAD A\nSUB T, T\nADD T, A\nBEZ F\nWRITE A\nF: END\n', ['1']);
});

test('variables : naissance à la première valeur', () => {
  ok('SUB X, X\nWRITE X\nEND\n');
  ok('SUB T, T, T\nWRITE T\nEND\n');
  ok('SUB X, X, Y\nWRITE Y\nEND\n');
  err('DATA B, 1\nADD A, B, A\nEND\n', 'E302');
  err('DATA A, 1\nADD X, A\nEND\n', 'E302');
  err('DATA A, 4\nDATA B, 3\nADD A, BB, X\nWRITE X\nEND\n', 'E302');
  err('DATA A, 2\nADD A, X, Y\nREAD X\nEND\n', 'E403', ['1']);
  // lecture avant écriture : détectée seulement à l'exécution, et pas du tout si la ligne n'est pas atteinte
  ok('DATA A, 1\nBR FIN\nWRITE X\nFIN: END\nREAD X\n');
});

test('flags : seules ADD, SUB, MPY, DIV modifient le registre drapeau', () => {
  const prelude = 'DATA A, 5\nDATA B, 2\nSUB A, B, T\n';
  const keep = (instr) => `${prelude}${instr}\nBGT OK\nWRITE B\nEND\nOK: WRITE A\nEND\n`;
  for (const instr of ['LOAD B', 'LOAD B\nSTORE Z', 'PUSH A\nPOP W']) {
    assert.deepEqual(diagnose(keep(instr)).output, ['A = 5'], instr);
  }
  err('BGT F\nF: END\n', 'E405');
  err('DATA A, 1\nLOAD A\nBEZ F\nF: END\n', 'E405');
  // une opération arithmétique le met à jour : 0 -> BEZ saute
  assert.deepEqual(diagnose('DATA A, 3\nSUB A, A, T\nBEZ Z\nWRITE A\nEND\nZ: WRITE T\nEND\n').output, ['T = 0']);
});

test('branchements : chacun lit le signe du résultat', () => {
  const t = (br, v) => diagnose(`DATA V, ${v}\nDATA Z, 0\nADD V, Z, T\n${br} Y\nWRITE Z\nEND\nY: WRITE V\nEND\n`).output[0];
  const saute = { BGT: [1, 0, 0], BGE: [1, 1, 0], BLT: [0, 0, 1], BLE: [0, 1, 1], BEZ: [0, 1, 0] };
  for (const [br, [pos, nul, neg]] of Object.entries(saute)) {
    assert.equal(t(br, 5).startsWith('V'), !!pos, `${br} 5`);
    assert.equal(t(br, 0).startsWith('V'), !!nul, `${br} 0`);
    assert.equal(t(br, -5).startsWith('V'), !!neg, `${br} -5`);
  }
});

test('pile : SL puis TL, DIV réelle, erreurs', () => {
  const r = diagnose('DATA A, 7\nDATA B, 2\nPUSH A\nPUSH B\nSUB\nPOP X\nPUSH A\nPUSH B\nDIV\nPOP Y\nWRITE X\nWRITE Y\nEND\n');
  assert.deepEqual(r.output, ['X = 5', 'Y = 3.5']);
  err('DATA A, 1\nPUSH A\nADD\nEND\n', 'E402');
  err('POP X\nEND\n', 'E402');
  err('DATA A, 1\nDATA Z, 0\nPUSH A\nPUSH Z\nDIV\nEND\n', 'E401');
});

test('accumulateur : un seul opérande, vide jusqu\'au premier LOAD', () => {
  err('DATA A, 1\nADD A\nEND\n', 'E404');
  err('STORE X\nEND\n', 'E404');
  const r = diagnose('DATA A, 6\nDATA B, 3\nLOAD A\nSUB B\nMPY B\nDIV A\nSTORE R\nWRITE R\nEND\n');
  assert.deepEqual(r.output, ['R = 1.5']);
  err('DATA A, 6\nDATA Z, 0\nLOAD A\nDIV Z\nEND\n', 'E401');
});

test('2 et 3 adresses : destination et ordre des opérandes', () => {
  assert.deepEqual(diagnose('DATA A, 10\nDATA B, 4\nSUB A, B\nWRITE A\nEND\n').output, ['A = 6']);
  assert.deepEqual(diagnose('DATA A, 10\nDATA B, 4\nSUB A, B, X\nWRITE X\nWRITE A\nEND\n').output, ['X = 6', 'A = 10']);
  assert.deepEqual(diagnose('DATA A, 10\nDATA B, 4\nDIV A, B, X\nWRITE X\nEND\n').output, ['X = 2.5']);
  err('DATA A, 1\nDATA Z, 0\nDIV A, Z, X\nEND\n', 'E401');
  err('DATA A, 1\nDATA Z, 0\nDIV A, Z\nEND\n', 'E401');
});

test('E/S : READ réel, saisie invalide, WRITE', () => {
  assert.deepEqual(diagnose('READ A\nWRITE A\nEND\n', ['12']).output, ['A = 12']);
  assert.deepEqual(diagnose('READ A\nWRITE A\nEND\n', ['-3.5']).output, ['A = -3.5']);
  err('READ A\nEND\n', 'E406', ['abc']);
  err('READ A\nEND\n', 'E406', ['2,5']);
  err('WRITE X\nEND\n', 'E302');
});

test('fin sans END : erreur d\'exécution', () => {
  err('DATA A, 1\nBR S\nEND\nS: WRITE A\n', 'E407');
});

test('mode strict : une seule erreur à la fois (la première)', () => {
  const c = compile('DATA A, 1\nADDD A, A, X\nWRITE B\n');
  assert.equal(c.errors.length, 1);
  assert.equal(c.error.code, 'E201');
});

test('collecteur : sans stopAtFirst, plusieurs erreurs d\'étapes différentes sont rapportées', () => {
  const c = compile('DATA A, 1 ;\nADD a, A, X\nWRITE A\nEND\n', { stopAtFirst: false });
  assert.deepEqual(c.errors.map((e) => e.code), ['E101', 'E102']);
});

test('suggestions de noms proches', () => {
  assert.match(diagnose('DATA A, 1\nBR FINN\nFIN: END\n').error.help, /« FIN »/);
  assert.match(diagnose('ADDD A, A, A\nEND\n').error.help, /« ADD »/);
  assert.match(diagnose('DATA ALPHA, 1\nADD ALPHA, ALPA, X\nEND\n').error.help, /« ALPHA »/);
});
