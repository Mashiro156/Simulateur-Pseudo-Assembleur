/* Machine virtuelle : exécute un programme déjà vérifié, une instruction par pas.
   Elle ne connaît ni le texte du programme ni l'interface. */
(function (root) {
  'use strict';
  const V = (root.V8086 = root.V8086 || {});
  const isNode = typeof module === 'object' && module.exports;
  const E = isNode ? require('../errors/errors.js') : V.errors;
  const L = isNode ? require('../language.js') : V.language;

  const HISTORY_LIMIT = 10000;
  const REAL = /^-?\d+(\.\d+)?$/;
  const SYMBOL = { ADD: '+', SUB: '−', MPY: '×', DIV: '÷' };
  const COMPARE = { BGT: '> 0', BGE: '≥ 0', BLT: '< 0', BLE: '≤ 0', BEZ: '= 0' };

  function formatNumber(v) {
    if (Number.isInteger(v)) return String(v === 0 ? 0 : v);
    return String(parseFloat(v.toPrecision(10)));
  }

  function compute(name, a, b) {
    if (name === 'ADD') return a + b;
    if (name === 'SUB') return a - b;
    if (name === 'MPY') return a * b;
    return a / b;
  }

  class VM {
    constructor(program) {
      this.program = program;
      this.labels = new Map(program.labelDefs.map((l) => [l.name, l.target]));
      this.inputLog = [];
      this.reset();
    }

    reset() {
      // Variables permanentes d'abord ; une DATA de même nom écrase la valeur permanente.
      this.mem = new Map((this.program.permanent || []).map((p) => [p.name, p.value]));
      for (const d of this.program.datas) this.mem.set(d.name, d.value);
      this.ac = null;
      this.stack = [];
      this.flag = null;
      this.pc = 0;
      this.halted = false;
      this.error = null;
      this.output = [];
      this.inputPos = 0;
      this.inputLog = [];
      this.history = [];
      this.steps = 0;
      this.errorAtInstruction = false;
    }

    /* Origine d'une variable pour l'affichage : 'data', 'permanent' (valeur permanente
       non écrasée) ou null (créée par le programme en cours d'exécution). */
    origin(name) {
      if (this.program.datas.some((d) => d.name === name)) return 'data';
      if ((this.program.permanent || []).some((p) => p.name === name)) return 'permanent';
      return null;
    }

    get current() {
      return this.program.instrs[this.pc] || null;
    }

    get started() {
      return this.history.length > 0;
    }

    snapshot() {
      return {
        pc: this.pc, mem: new Map(this.mem), ac: this.ac, stack: this.stack.slice(), flag: this.flag,
        halted: this.halted, error: this.error, outLen: this.output.length, inputPos: this.inputPos, steps: this.steps,
      };
    }

    restore(s) {
      this.pc = s.pc; this.mem = new Map(s.mem); this.ac = s.ac; this.stack = s.stack.slice();
      this.flag = s.flag; this.halted = s.halted; this.error = s.error;
      this.output.length = s.outLen; this.inputPos = s.inputPos; this.steps = s.steps;
      this.errorAtInstruction = false;
    }

    /* Revient d'un pas. Après une erreur d'exécution, l'état est déjà celui d'avant
       l'instruction fautive : le premier retour efface simplement l'erreur. */
    stepBack() {
      if (this.halted && this.error && this.errorAtInstruction) {
        this.halted = false;
        this.error = null;
        this.errorAtInstruction = false;
        return true;
      }
      if (!this.history.length) return false;
      this.restore(this.history.pop());
      return true;
    }

    provideInput(text) {
      this.inputLog.push(String(text));
    }

    // Modification manuelle d'une variable existante (panneau mémoire), sans toucher au drapeau.
    setVariable(name, value) {
      if (!this.mem.has(name) || !Number.isFinite(value)) return false;
      this.mem.set(name, value);
      return true;
    }

    /* Exécute l'instruction courante. Résultat :
       { status: 'ok' | 'halted' | 'error' | 'need-input', ins, effect, output, changed, jumped, error } */
    step() {
      if (this.halted) return { status: this.error ? 'error' : 'halted', ins: this.current, error: this.error };
      const ins = this.current;
      if (ins.name === 'READ' && this.inputPos >= this.inputLog.length) {
        return { status: 'need-input', ins, variable: ins.ops[0].text };
      }
      const snap = this.snapshot();
      const changed = { mem: [], ac: false, stack: false, flag: false };
      const res = { status: 'ok', ins, effect: '', output: null, changed, jumped: false, error: null };
      let next = this.pc + 1;

      try {
        next = this.execute(ins, res, changed, next);
      } catch (e) {
        if (!(e instanceof E.Diagnostic)) throw e;
        if (ins.name === 'READ') this.inputLog.splice(snap.inputPos);
        this.restore(snap);
        this.halted = true;
        this.error = e;
        this.errorAtInstruction = true;
        return { status: 'error', ins, error: e };
      }

      this.steps++;
      this.pushHistory(snap);
      if (ins.name === 'END') {
        this.halted = true;
        res.status = 'halted';
      } else if (next >= this.program.instrs.length) {
        // Sortie par le bas du programme sans END.
        this.halted = true;
        this.error = new E.Diagnostic('E407', ins.line, ins.col, 'fin du texte atteinte sans END ni STOP',
          "l'exécution est sortie par le bas du programme ; vérifiez les sauts (BR).", ins.raw.length);
        res.status = 'error';
        res.error = this.error;
      } else this.pc = next;
      return res;
    }

    pushHistory(snap) {
      this.history.push(snap);
      if (this.history.length > HISTORY_LIMIT) this.history.shift();
    }

    fail(code, ins, title, help, tok) {
      const col = tok ? tok.col : ins.col;
      const length = tok ? tok.text.length : ins.raw.length;
      return new E.Diagnostic(code, ins.line, col, title, help, length);
    }

    read(ins, tok) {
      if (!this.mem.has(tok.text)) {
        throw this.fail('E403', ins, `variable sans valeur « ${tok.text} »`,
          `« ${tok.text} » n'a pas encore reçu de valeur à cet endroit du programme ` +
          '(DATA, READ ou résultat d\'une instruction avant cette ligne).', tok);
      }
      return this.mem.get(tok.text);
    }

    write(name, value, changed) {
      this.mem.set(name, value);
      if (!changed.mem.includes(name)) changed.mem.push(name);
    }

    execute(ins, res, changed, next) {
      const n = ins.name, o = ins.ops, fmt = formatNumber;

      if (L.isArith(n)) {
        const sym = SYMBOL[n];
        const divZero = (tok, title) => {
          throw this.fail('E401', ins, title || 'division par zéro', 'testez le diviseur avant la division.', tok);
        };
        let r;
        if (o.length === 0) {
          if (this.stack.length < 2) {
            throw this.fail('E402', ins, 'pile insuffisante',
              `${n} sans opérande a besoin de deux valeurs dans la pile (${this.stack.length} présente(s)).`);
          }
          const b = this.stack.pop(), a = this.stack.pop();
          if (n === 'DIV' && b === 0) {
            throw this.fail('E401', ins, 'division par zéro', 'le diviseur (tête de pile, TL) vaut 0.');
          }
          r = compute(n, a, b);
          this.stack.push(r);
          changed.stack = true;
          res.effect = `${fmt(a)} ${sym} ${fmt(b)} = ${fmt(r)}, résultat empilé`;
        } else if (o.length === 1) {
          if (this.ac === null) {
            throw this.fail('E404', ins, 'accumulateur vide',
              "aucun LOAD n'a été exécuté : l'accumulateur n'a pas de valeur.");
          }
          const v = this.read(ins, o[0]);
          if (n === 'DIV' && v === 0) divZero(o[0], `division par zéro (${o[0].text} vaut 0)`);
          const before = this.ac;
          r = compute(n, before, v);
          this.ac = r;
          changed.ac = true;
          res.effect = `AC ← ${fmt(before)} ${sym} ${fmt(v)} = ${fmt(r)}`;
        } else {
          const dest = o.length === 2 ? o[0] : o[2];
          if (n === 'SUB' && o[0].text === o[1].text) {
            r = 0;
            res.effect = `${dest.text} ← 0`;
          } else {
            const a = this.read(ins, o[0]), b = this.read(ins, o[1]);
            if (n === 'DIV' && b === 0) divZero(o[1], `division par zéro (${o[1].text} vaut 0)`);
            r = compute(n, a, b);
            res.effect = `${dest.text} ← ${fmt(a)} ${sym} ${fmt(b)} = ${fmt(r)}`;
          }
          this.write(dest.text, r, changed);
        }
        this.flag = r;
        changed.flag = true;
        return next;
      }

      switch (n) {
        case 'LOAD': {
          this.ac = this.read(ins, o[0]);
          changed.ac = true;
          res.effect = `AC ← ${fmt(this.ac)}`;
          return next;
        }
        case 'STORE': {
          if (this.ac === null) {
            throw this.fail('E404', ins, 'accumulateur vide',
              "aucun LOAD n'a été exécuté : l'accumulateur n'a pas de valeur.");
          }
          this.write(o[0].text, this.ac, changed);
          res.effect = `${o[0].text} ← ${fmt(this.ac)}`;
          return next;
        }
        case 'PUSH': {
          const v = this.read(ins, o[0]);
          this.stack.push(v);
          changed.stack = true;
          res.effect = `${fmt(v)} empilé`;
          return next;
        }
        case 'POP': {
          if (!this.stack.length) {
            throw this.fail('E402', ins, 'pile vide', "POP s'exécute sur une pile qui ne contient aucune valeur.");
          }
          const v = this.stack.pop();
          changed.stack = true;
          if (o.length) {
            this.write(o[0].text, v, changed);
            res.effect = `${o[0].text} ← ${fmt(v)} (dépilé)`;
          } else res.effect = `${fmt(v)} retiré de la pile`;
          return next;
        }
        case 'READ': {
          const text = this.inputLog[this.inputPos].trim();
          this.inputPos++;
          if (!REAL.test(text)) {
            const virgule = /^-?\d+,\d+$/.test(text);
            throw this.fail('E406', ins, `saisie invalide « ${text} »`,
              virgule ? 'le séparateur décimal est le point : 2.5, pas 2,5.'
                : 'READ attend un nombre réel (par exemple 12 ou -3.5).', o[0]);
          }
          const v = parseFloat(text);
          this.write(o[0].text, v, changed);
          res.effect = `${o[0].text} ← ${fmt(v)} (saisie)`;
          return next;
        }
        case 'WRITE': {
          const line = `${o[0].text} = ${fmt(this.read(ins, o[0]))}`;
          this.output.push(line);
          res.output = line;
          return next;
        }
        case 'END':
          res.effect = 'fin du programme';
          return next;
        default: {
          // Branchements.
          const target = this.labels.get(o[0].text);
          if (n === 'BR') {
            res.jumped = true;
            res.effect = `saut vers ${o[0].text}`;
            return target;
          }
          if (this.flag === null) {
            throw this.fail('E405', ins, 'registre drapeau vide',
              "aucune opération arithmétique (ADD, SUB, MPY, DIV) n'a encore été exécutée : " +
              "il n'y a pas de résultat à tester.");
          }
          const f = this.flag;
          const ok = { BGT: f > 0, BGE: f >= 0, BLT: f < 0, BLE: f <= 0, BEZ: f === 0 }[n];
          res.effect = `drapeau ${fmt(f)} : ${fmt(f)} ${COMPARE[n]} ` +
            (ok ? `vrai, saut vers ${o[0].text}` : 'faux, on continue');
          if (ok) { res.jumped = true; return target; }
          return next;
        }
      }
    }
  }

  /* Exécute un programme jusqu'au bout (tests, outils). `inputs` : saisies de READ, dans l'ordre. */
  function runToEnd(program, inputs, maxSteps) {
    const vm = new VM(program);
    const queue = (inputs || []).map(String);
    let guard = maxSteps || 1000000;
    for (;;) {
      if (guard-- <= 0) throw new Error("boucle trop longue");
      const r = vm.step();
      if (r.status === 'need-input') {
        if (!queue.length) throw new Error(`saisie manquante pour ${r.variable}`);
        vm.provideInput(queue.shift());
      } else if (r.status === 'error' || r.status === 'halted') {
        return { vm, output: vm.output.slice(), error: vm.error };
      }
    }
  }

  const api = { VM, runToEnd, formatNumber };
  if (isNode) module.exports = api;
  else V.vm = api;
})(typeof window !== 'undefined' ? window : globalThis);
