/* Interface : relie l'éditeur, le compilateur et la machine virtuelle aux panneaux.
   Ce fichier ne contient aucune règle du langage. */
(function () {
  'use strict';
  const V = window.V8086;
  const { compile } = V.compiler;
  const { VM, formatNumber: fmt } = V.vm;
  const E = V.errors;
  const H = V.highlight;
  const HELP = V.help;
  const P = V.permanent;

  const DOCS_ERRORS = 'docs/erreurs.md'; // page d'aide ouverte par le code d'une erreur
  const KEY_CODE = 'v8086.code';
  const KEY_THEME = 'v8086.theme';
  const KEY_PERM = 'v8086.permanent';
  const DELAYS = [900, 450, 180, 60, 0]; // ms entre deux instructions selon la vitesse 1 à 5
  const BATCH_MAX = 300; // instructions par tour à la vitesse maximale

  const $ = (id) => document.getElementById(id);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } },
  };

  let vm = null;
  let loadedKey = null; // texte + variables permanentes au moment de la compilation
  let permanent = [];  // variables permanentes : { name, value }
  let analysis = null;
  let running = false;
  let runTimer = null;
  let skipBreakpoint = false;
  let breakpoints = new Set();
  let analysisTimer = null;

  // ------------------------------------------------------------------ éditeur
  const editor = V.editor.createEditor($('editor'), {
    onChange,
    onBreakpoints(set) { breakpoints = set; },
    hover,
  });

  const currentKey = () => editor.getValue() + '\u0000' + P.signature(permanent);
  const isDirty = () => vm !== null && loadedKey !== currentKey();
  const srcOf = (ins) => ins.raw + (ins.ops.length ? ` ${ins.ops.map((o) => o.text).join(', ')}` : '');

  function hover(ctx) {
    if (ctx.error) {
      const e = ctx.error;
      return `<div class="tip-err"><b>${e.code}</b> — ${H.esc(e.title)}</div>` +
        (e.help ? `<div class="help">${H.esc(e.help)}</div>` : '');
    }
    const t = ctx.token;
    if (!t) return null;
    if (t.role === 'ins') {
      const h = HELP[t.text];
      if (!h) return null;
      return `<div class="tip-title">${H.esc(h.title)}</div>` +
        h.forms.map(([code, desc]) => `<div class="row"><code>${H.esc(code)}</code><span>${H.esc(desc)}</span></div>`).join('') +
        (h.note ? `<div class="note">${H.esc(h.note)}</div>` : '');
    }
    if (t.role === 'var') {
      if (!vm || isDirty()) return null;
      return vm.mem.has(t.text)
        ? `<span class="mono">${H.esc(t.text)} = ${fmt(vm.mem.get(t.text))}</span>`
        : `<span class="mono">${H.esc(t.text)}</span> : pas encore de valeur`;
    }
    if (t.role === 'label-def' || t.role === 'label-ref') {
      const line = ctx.labelLines[t.text];
      return line ? `Étiquette <span class="mono">${H.esc(t.text)}</span> : définie ligne ${line}` : null;
    }
    return null;
  }

  // ----------------------------------------------------------------- analyse
  function onChange(text) {
    store.set(KEY_CODE, text);
    updateDirty();
    clearTimeout(analysisTimer);
    analysisTimer = setTimeout(runAnalysis, 120);
    updateLineCount();
  }

  // L'analyse en direct ne touche jamais à l'état de la machine.
  function runAnalysis() {
    const text = editor.getValue();
    analysis = text.trim() ? compile(text, { permanent }) : null;
    renderAnalysisStatus();
    editor.setError(errorMark());
    updateDirty();
  }

  function renderAnalysisStatus() {
    const el = $('analysis');
    if (!analysis) { el.textContent = ''; el.className = 'analysis'; return; }
    if (analysis.ok) {
      const n = analysis.program.instrs.length;
      el.textContent = `✓ Aucune erreur · ${n} instruction${n > 1 ? 's' : ''}`;
      el.className = 'analysis ok';
    } else {
      const e = analysis.error;
      el.textContent = `✕ ${e.code} — ${e.title} (ligne ${e.line})`;
      el.className = 'analysis bad';
    }
  }

  function errorMark() {
    if (vm && !isDirty() && vm.error) return vm.error;
    return analysis && !analysis.ok ? analysis.error : null;
  }

  function updateLineCount() {
    const n = editor.lineCount();
    $('lineCount').textContent = `${n} ligne${n > 1 ? 's' : ''}`;
  }

  function updateDirty() {
    $('dirty').hidden = !isDirty();
  }

  // ----------------------------------------------------------------- onglets (petit écran)
  // Sur ordinateur les trois panneaux sont visibles ensemble : l'onglet n'a alors aucun effet.
  function showTab(name) {
    document.body.dataset.tab = name;
    document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
    if (name === 'editor') editor.remeasure();
  }
  document.querySelector('.tabbar').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');
    if (b) showTab(b.dataset.tab);
  });

  // ----------------------------------------------------------------- console
  const consoleEl = $('console');

  function logLine(kind, tag, text) {
    const row = document.createElement('div');
    row.className = `cl ${kind}`;
    const t = document.createElement('span');
    t.className = 'tag';
    t.textContent = tag;
    const x = document.createElement('span');
    x.textContent = text;
    row.append(t, x);
    pushRow(row);
  }

  function pushRow(row) {
    consoleEl.appendChild(row);
    while (consoleEl.childElementCount > 500) consoleEl.removeChild(consoleEl.firstChild);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  function logError(diag, lines) {
    showTab('console');
    const row = document.createElement('div');
    row.className = 'cl err';
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = 'erreur';
    const pre = document.createElement('pre');
    pre.innerHTML = H.esc(E.format(diag, lines)).replace(
      /^Erreur (E\d{3})/,
      `Erreur <a href="${DOCS_ERRORS}#${diag.code.toLowerCase()}" target="_blank" rel="noopener" title="Voir ${diag.code} dans la documentation">${diag.code}</a>`
    );
    row.append(tag, pre);
    pushRow(row);
  }

  $('btnClear').addEventListener('click', () => { consoleEl.innerHTML = ''; });

  // ------------------------------------------------------------ chargement
  // Compile le texte de l'éditeur et remet la machine à zéro.
  function load() {
    stopRun();
    removeReadBox();
    const text = editor.getValue();
    const c = compile(text, { permanent });
    analysis = c;
    renderAnalysisStatus();
    if (!c.ok) {
      vm = null;
      loadedKey = null;
      logError(c.error, c.lines);
      refresh();
      return false;
    }
    vm = new VM(c.program);
    loadedKey = currentKey();
    const n = c.program.instrs.length;
    logLine('info', '✓', `Compilation réussie : ${n} instruction${n > 1 ? 's' : ''}. Prêt à la ligne ${c.program.instrs[0].line}.`);
    refresh();
    return true;
  }

  // ----------------------------------------------------------- exécution
  function traceEnabled() {
    return !(running && Number($('speed').value) === 5);
  }

  // Un pas. Renvoie le résultat de vm.step() ; gère l'affichage et l'arrêt de l'exécution.
  function doStep() {
    const res = vm.step();
    if (res.status === 'need-input') {
      const wasRunning = running;
      stopRun();
      logLine('info', '?', `READ ${res.variable} : saisie attendue`);
      askInput(res.variable, wasRunning);
      return res;
    }
    if (res.status === 'ok' || res.status === 'halted') {
      if (traceEnabled()) logLine('step', `L${res.ins.line}`, `${srcOf(res.ins)}${res.effect ? `   → ${res.effect}` : ''}`);
      if (res.output) logLine('out', '→', res.output);
    }
    if (res.status === 'halted') {
      logLine('info', 'fin', `Programme terminé : ${vm.steps} instruction${vm.steps > 1 ? 's' : ''} exécutée${vm.steps > 1 ? 's' : ''}.`);
      stopRun();
    } else if (res.status === 'error') {
      if (res.output) logLine('out', '→', res.output);
      logError(vm.error, vm.program.lines);
      stopRun();
    }
    return res;
  }

  // skipFirst : exécuter la première instruction même si elle porte un point d'arrêt.
  function startRun(skipFirst) {
    running = true;
    skipBreakpoint = skipFirst !== false;
    updateButtons();
    schedule();
  }

  function stopRun() {
    running = false;
    clearTimeout(runTimer);
    runTimer = null;
    updateButtons();
  }

  function schedule() {
    const level = Number($('speed').value);
    runTimer = setTimeout(tick, DELAYS[level - 1]);
  }

  function tick() {
    runTimer = null;
    if (!running) return;
    const batch = Number($('speed').value) === 5 ? BATCH_MAX : 1;
    let last = null;
    for (let i = 0; i < batch && running; i++) {
      if (!skipBreakpoint && breakpoints.has(vm.current.line)) {
        stopRun();
        logLine('info', '■', `Point d'arrêt à la ligne ${vm.current.line}.`);
        break;
      }
      skipBreakpoint = false;
      last = doStep();
      if (last.status !== 'ok') break;
    }
    refresh(last && last.changed);
    if (running) schedule();
  }

  // ----------------------------------------------------------------- READ
  function removeReadBox() {
    const box = consoleEl.querySelector('.readbox');
    if (box) box.remove();
  }

  // resume : l'exécution continue après la saisie si elle était en cours.
  function askInput(variable, resume) {
    removeReadBox();
    showTab('console');
    const form = document.createElement('form');
    form.className = 'readbox';
    form.innerHTML = `<label>READ ${H.esc(variable)} :</label>` +
      `<input type="text" inputmode="decimal" autocomplete="off" aria-label="Valeur de ${H.esc(variable)}">` +
      '<button class="btn primary" type="submit">Valider</button>';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = form.querySelector('input').value;
      form.remove();
      vm.provideInput(value);
      const res = doStep();
      refresh(res.changed);
      if (resume && res.status === 'ok') startRun(false);
    });
    pushRow(form);
    form.querySelector('input').focus();
  }

  // ----------------------------------------------------------- commandes
  $('btnRun').addEventListener('click', () => {
    if (running) {
      stopRun();
      logLine('info', '‖', 'Exécution en pause.');
      refresh();
      return;
    }
    if (!vm || vm.halted || isDirty()) { if (!load()) return; }
    startRun();
  });

  $('btnStep').addEventListener('click', () => {
    stopRun();
    if (!vm || (vm.halted && !vm.error)) {
      if (load()) logLine('info', '▶', 'Appuyez sur Pas à pas pour exécuter la première instruction.');
      return;
    }
    if (vm.halted) {
      logLine('info', '·', 'L\'exécution est arrêtée par une erreur : Retour pour l\'annuler, ou Reset.');
      return;
    }
    if (isDirty()) {
      if (!vm.started) { if (load()) logLine('info', '▶', 'Code recompilé. Appuyez sur Pas à pas pour avancer.'); return; }
      logLine('info', '·', 'Le code a été modifié depuis le lancement : Reset pour appliquer la nouvelle version.');
      return;
    }
    const res = doStep();
    refresh(res.changed);
  });

  $('btnBack').addEventListener('click', () => {
    stopRun();
    removeReadBox();
    if (vm && vm.stepBack()) {
      logLine('info', '↶', 'Retour d\'un pas en arrière.');
      refresh();
    }
  });

  $('btnReset').addEventListener('click', () => {
    if (load()) logLine('info', '↻', 'Machine remise à zéro.');
  });

  $('speed').addEventListener('input', () => {
    if (running) { clearTimeout(runTimer); schedule(); }
  });

  // ---------------------------------------------------------------- rendu
  function flash(el) {
    if (!el) return;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }

  function currentLine() {
    if (!vm || isDirty()) return null;
    if (vm.error) return vm.error.line;
    if (vm.halted) return null;
    return vm.current ? vm.current.line : null;
  }

  const canEditMemory = () => vm !== null && !vm.halted && !running && !isDirty();

  function refresh(changed) {
    renderMachine(changed || null);
    editor.setError(errorMark());
    const line = currentLine();
    editor.setCurrentLine(line);
    if (line) editor.reveal(line);
    updateButtons();
    updateDirty();
  }

  function renderMachine(changed) {
    const f = vm ? vm.flag : null;
    $('flagValue').textContent = f === null ? 'vide' : fmt(f);
    $('chipNeg').classList.toggle('on', f !== null && f < 0);
    $('chipZero').classList.toggle('on', f !== null && f === 0);
    $('chipPos').classList.toggle('on', f !== null && f > 0);
    $('acValue').textContent = vm && vm.ac !== null ? fmt(vm.ac) : '—';

    let pc = '—';
    if (vm) {
      if (vm.error) pc = `${vm.error.line} (erreur)`;
      else if (vm.halted) pc = 'terminé';
      else if (vm.current) pc = String(vm.current.line);
    }
    $('pcValue').textContent = pc;

    const body = $('memBody');
    const editable = canEditMemory();
    body.classList.toggle('editable', editable);
    $('memHint').textContent = editable && vm.mem.size ? 'Clic sur une valeur pour la modifier.' : '';
    body.innerHTML = '';
    const permNames = new Set(permanent.map((p) => p.name));
    const rows = vm ? [...vm.mem] : permanent.map((p) => [p.name, p.value]);
    if (rows.length === 0) {
      body.innerHTML = '<tr><td colspan="3" class="empty">Aucune variable pour l\'instant</td></tr>';
    } else {
      for (const [name, value] of rows) {
        const origin = vm ? vm.origin(name) : (permNames.has(name) ? 'permanent' : null);
        const badge = origin === 'data' ? ' <span class="origin" title="Déclarée par DATA dans ce programme">DATA</span>'
          : origin === 'permanent' ? ' <span class="origin" title="Variable permanente">perm.</span>' : '';
        const actions = permNames.has(name)
          ? `<button class="icon-btn" data-act="edit" data-name="${H.esc(name)}" title="Modifier la variable permanente ${H.esc(name)}" aria-label="Modifier la variable permanente ${H.esc(name)}">✎</button>` +
            `<button class="icon-btn" data-act="del" data-name="${H.esc(name)}" title="Supprimer la variable permanente ${H.esc(name)}" aria-label="Supprimer la variable permanente ${H.esc(name)}">✕</button>`
          : '';
        const tr = document.createElement('tr');
        tr.dataset.name = name;
        tr.innerHTML = `<td class="name">${H.esc(name)}${badge}</td>` +
          `<td class="val"><button class="val-btn" data-name="${H.esc(name)}" tabindex="${editable ? 0 : -1}">${fmt(value)}</button></td>` +
          `<td class="act">${actions}</td>`;
        body.appendChild(tr);
      }
    }

    const st = $('stack');
    st.innerHTML = '';
    if (!vm || vm.stack.length === 0) st.innerHTML = '<div class="empty">Pile vide</div>';
    else {
      const n = vm.stack.length;
      for (let i = n - 1; i >= 0; i--) {
        const d = document.createElement('div');
        d.className = `si${i === n - 1 ? ' top' : ''}`;
        const tag = i === n - 1 ? 'TL' : i === n - 2 ? 'SL' : `[${i}]`;
        d.innerHTML = `<span class="tag">${tag}</span><span>${fmt(vm.stack[i])}</span>`;
        st.appendChild(d);
      }
    }

    if (changed) {
      if (changed.flag) { flash($('flagValue')); flash($('chipNeg').classList.contains('on') ? $('chipNeg') : $('chipZero').classList.contains('on') ? $('chipZero') : $('chipPos')); }
      if (changed.ac) flash($('acValue'));
      if (changed.stack) flash(st.querySelector('.si.top'));
      for (const name of changed.mem) flash(body.querySelector(`tr[data-name="${name}"] .val-btn`));
    }
  }

  function updateButtons() {
    const canBack = vm !== null && !running && (vm.history.length > 0 || (vm.error !== null && vm.errorAtInstruction));
    $('btnBack').disabled = !canBack;
    const resumable = vm && vm.started && !vm.halted && !isDirty();
    $('btnRun').textContent = running ? 'Pause' : resumable ? 'Reprendre' : 'Exécuter tout';
    $('btnRun').title = running ? 'Mettre en pause' : resumable ? 'Reprendre l\'exécution' : 'Compiler et exécuter jusqu\'au bout';
  }

  // Modification manuelle d'une valeur (mémoire).
  $('memBody').addEventListener('click', (e) => {
    const btn = e.target.closest('.val-btn');
    if (!btn || !canEditMemory()) return;
    const name = btn.dataset.name;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = fmt(vm.mem.get(name));
    input.setAttribute('aria-label', `Nouvelle valeur de ${name}`);
    btn.replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const finish = (commit) => {
      if (done) return;
      done = true;
      if (commit) {
        const text = input.value.trim();
        if (/^-?\d+(\.\d+)?$/.test(text)) {
          vm.setVariable(name, parseFloat(text));
          logLine('info', '✎', `${name} modifiée à la main : ${fmt(parseFloat(text))}`);
        } else logLine('info', '✎', `${name} inchangée : un nombre réel est attendu (par exemple 12 ou 2.5).`);
      }
      refresh();
    };
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') finish(true);
      else if (ev.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));
  });

  // ------------------------------------------------- variables permanentes
  function savePermanent() {
    store.set(KEY_PERM, P.serialize(permanent));
    // Une machine encore intacte reprend aussitôt la nouvelle liste ; sinon « Reset » est nécessaire.
    runAnalysis();
    if (vm && !vm.started && analysis && analysis.ok) {
      vm = new VM(analysis.program);
      loadedKey = currentKey();
    }
    refresh();
  }

  const dlg = $('varDialog');
  const nameIn = $('varName'), valueIn = $('varValue'), errorEl = $('varError');
  let editing = null;

  function openVarDialog(name) {
    editing = name || null;
    const cur = name ? permanent.find((p) => p.name === name) : null;
    $('varTitle').textContent = name ? `Modifier ${name}` : 'Nouvelle variable permanente';
    nameIn.value = name || '';
    nameIn.readOnly = !!name;
    valueIn.value = cur ? fmt(cur.value) : '';
    errorEl.hidden = true;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    (name ? valueIn : nameIn).focus();
  }
  const closeVarDialog = () => { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); };

  $('btnAddVar').addEventListener('click', () => openVarDialog(null));
  $('varCancel').addEventListener('click', closeVarDialog);
  $('varForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameIn.value.trim();
    const value = P.parseValue(valueIn.value);
    const bad = editing ? null : P.checkName(name);
    if (bad || value === null) {
      errorEl.textContent = bad || 'La valeur doit être un nombre réel (par exemple 12 ou 2.5, avec un point).';
      errorEl.hidden = false;
      return;
    }
    const replaced = permanent.some((p) => p.name === name);
    permanent = P.upsert(permanent, name, value);
    savePermanent();
    logLine('info', '✎', `Variable permanente ${name} ${replaced ? 'modifiée' : 'ajoutée'} : ${fmt(value)}`);
    closeVarDialog();
  });

  $('memBody').addEventListener('click', (e) => {
    const b = e.target.closest('.icon-btn');
    if (!b) return;
    if (b.dataset.act === 'edit') openVarDialog(b.dataset.name);
    else {
      permanent = P.remove(permanent, b.dataset.name);
      savePermanent();
      logLine('info', '✎', `Variable permanente ${b.dataset.name} supprimée.`);
    }
  });

  $('btnExport').addEventListener('click', () => {
    if (!permanent.length) { logLine('info', '·', 'Aucune variable permanente à exporter.'); return; }
    const blob = new Blob([P.serialize(permanent)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'v8086-variables.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    logLine('info', '↓', `${permanent.length} variable${permanent.length > 1 ? 's' : ''} permanente${permanent.length > 1 ? 's' : ''} exportée${permanent.length > 1 ? 's' : ''}.`);
  });

  $('btnImport').addEventListener('click', () => $('fileImport').click());
  $('fileImport').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const r = P.parse(await file.text());
    if (r.fatal) { logLine('info', '✕', `Import impossible : ${r.fatal}`); return; }
    for (const v of r.variables) permanent = P.upsert(permanent, v.name, v.value);
    savePermanent();
    logLine('info', '↑', `${r.variables.length} variable${r.variables.length > 1 ? 's' : ''} importée${r.variables.length > 1 ? 's' : ''}.`);
    for (const x of r.rejected) logLine('info', '✕', `${x.name} ignorée : ${x.reason}`);
  });

  // -------------------------------------------------------------- exemples
  const samples = V.samples;
  const select = $('samples');
  select.innerHTML = '<option value="">Choisir un exemple…</option>' +
    samples.map((s) => `<option value="${s.id}">${H.esc(s.label)}</option>`).join('');
  select.addEventListener('change', () => {
    const s = samples.find((x) => x.id === select.value);
    select.value = '';
    if (!s) return;
    stopRun();
    removeReadBox();
    vm = null;
    loadedKey = null;
    editor.clearBreakpoints();
    breakpoints = new Set();
    editor.setValue(s.source);
    store.set(KEY_CODE, s.source);
    logLine('info', '☰', `Exemple chargé : ${s.label}`);
    runAnalysis();
    refresh();
    updateLineCount();
  });

  // ----------------------------------------------------------------- thème
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    editor.remeasure();
  }
  $('btnTheme').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    store.set(KEY_THEME, next);
  });

  // --------------------------------------------------------------- démarrage
  const storedPerm = store.get(KEY_PERM);
  if (storedPerm) permanent = P.parse(storedPerm).variables;
  const savedTheme = store.get(KEY_THEME);
  if (savedTheme === 'light' || savedTheme === 'dark') applyTheme(savedTheme);
  editor.setValue(store.get(KEY_CODE) || samples[0].source);
  updateLineCount();
  runAnalysis();
  refresh();
  logLine('info', '·', 'Prêt. « Exécuter tout » compile et lance le programme, « Pas à pas » avance d\'une instruction.');
})();
