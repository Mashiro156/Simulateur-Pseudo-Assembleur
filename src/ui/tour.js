/* Visite guidée : au premier lancement, des bulles présentent les boutons essentiels.
   Ce fichier ne connaît ni le compilateur ni la machine : il ne fait qu'éclairer un élément
   de la page et afficher une explication. Le bouton « Tutoriel » la relance à tout moment. */
(function (root) {
  'use strict';
  const isNode = typeof module === 'object' && module.exports;

  const KEY = 'v8086.tour'; // vaut « done » une fois la visite terminée ou quittée

  /* Chaque étape : l'élément éclairé (id dans index.html, ou null pour une bulle centrée),
     l'onglet à afficher sur petit écran, un titre et le texte. 15 étapes au maximum. */
  const STEPS = [
    { target: null, tab: 'editor', title: 'Bienvenue dans V8086',
      text: 'Ce court tour présente les boutons essentiels. Tu peux le quitter quand tu veux et le revoir avec le bouton « Tutoriel ».' },
    { target: 'samples', tab: 'editor', title: 'Exemples',
      text: 'Choisis ici un programme prêt à l\'emploi : il est chargé dans l\'éditeur. C\'est le plus simple pour voir comment s\'écrit un programme.' },
    { target: 'editorPanel', tab: 'editor', title: 'Éditeur',
      text: 'Écris ton programme ici, une instruction par ligne. Les erreurs sont signalées pendant que tu écris. Clique dans la marge, à gauche d\'une ligne, pour poser un point d\'arrêt ; survole une instruction pour voir son aide.' },
    { target: 'btnRun', tab: 'editor', title: 'Exécuter tout',
      text: 'Compile le programme et l\'exécute jusqu\'au bout. Pendant l\'exécution, ce bouton devient « Pause », puis « Reprendre ».' },
    { target: 'btnStep', tab: 'editor', title: 'Pas à pas',
      text: 'Exécute une seule instruction à la fois : idéal pour comprendre ce que fait chaque ligne et suivre les changements dans les panneaux.' },
    { target: 'btnBack', tab: 'editor', title: 'Retour',
      text: 'Annule la dernière instruction exécutée. Il est grisé tant qu\'il n\'y a rien à annuler.' },
    { target: 'btnReset', tab: 'editor', title: 'Reset',
      text: 'Recompile le code et repart de zéro : l\'accumulateur, la pile et la mémoire sont remis à leur état de départ.' },
    { target: 'consolePanel', tab: 'console', title: 'Console',
      text: 'Les résultats affichés par le programme, les messages de compilation et les erreurs apparaissent ici. Quand le programme lit une valeur (READ), tu la saisis aussi ici.' },
    { target: 'flagPanel', tab: 'machine', title: 'Registre drapeau',
      text: 'Il garde le signe du résultat de la dernière opération arithmétique : négatif, nul ou positif. Les instructions de branchement s\'en servent pour décider où aller.' },
    { target: 'accPanel', tab: 'machine', title: 'Accumulateur et prochaine ligne',
      text: 'L\'accumulateur contient la valeur en cours de calcul. « Prochaine ligne » indique l\'instruction qui sera exécutée au prochain pas.' },
    { target: 'memPanel', tab: 'machine', title: 'Mémoire',
      text: 'Toutes les variables du programme et leur valeur. Le bouton « + Variable » crée une variable permanente, présente automatiquement dans tous tes programmes (par exemple UN = 1).' },
    { target: 'stackPanel', tab: 'machine', title: 'Pile',
      text: 'La pile sert aux instructions PUSH et POP. La tête de pile (TL) est la dernière valeur empilée ; SL est celle qui se trouve dessous.' },
    { target: 'projectTools', tab: 'editor', title: 'Enregistrer et importer',
      text: '« Enregistrer » sauvegarde ton code et tes variables permanentes dans un fichier texte ; « Importer » les recharge. Ton travail est aussi conservé automatiquement dans ce navigateur. Bon travail !' },
  ];

  if (isNode) { module.exports = { STEPS, KEY }; return; }

  const doc = root.document;
  const store = {
    get(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { root.localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } },
  };

  let shield = null, spot = null, card = null;
  let index = 0;
  let lastFocus = null;
  const inerted = [];

  const el = (tag, cls, text) => {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  function showTab(name) {
    const b = doc.querySelector(`.tabbar button[data-tab="${name}"]`);
    if (!b) return;
    const nav = b.closest('nav'); // la barre d'onglets est « inerte » pendant la visite : on la réactive le temps du clic
    const was = nav ? nav.inert : false;
    if (nav) nav.inert = false;
    b.click();
    if (nav) nav.inert = was;
  }

  function place(rect) {
    const vw = root.innerWidth, vh = root.innerHeight, m = 12, gap = 12;
    const cw = card.offsetWidth, ch = card.offsetHeight;
    let left, top;
    if (!rect) {
      left = (vw - cw) / 2;
      top = (vh - ch) / 2;
    } else if (vh - rect.bottom >= ch + gap + m) { left = rect.left; top = rect.bottom + gap; }
    else if (rect.top >= ch + gap + m) { left = rect.left; top = rect.top - ch - gap; }
    else if (vw - rect.right >= cw + gap + m) { left = rect.right + gap; top = rect.top; }
    else if (rect.left >= cw + gap + m) { left = rect.left - cw - gap; top = rect.top; }
    else { left = (vw - cw) / 2; top = vh - ch - m; } // l'élément est trop grand : la bulle passe devant
    card.style.left = `${Math.max(m, Math.min(left, vw - cw - m))}px`;
    card.style.top = `${Math.max(m, Math.min(top, vh - ch - m))}px`;
  }

  function render() {
    const step = STEPS[index];
    if (step.tab) showTab(step.tab);
    const target = step.target ? doc.getElementById(step.target) : null;
    if (target) target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    let rect = target ? target.getBoundingClientRect() : null;
    if (rect && (rect.width === 0 || rect.height === 0)) rect = null; // élément caché : bulle centrée

    shield.classList.toggle('dim', !rect);
    spot.hidden = !rect;
    if (rect) {
      const pad = 6;
      spot.style.left = `${rect.left - pad}px`;
      spot.style.top = `${rect.top - pad}px`;
      spot.style.width = `${rect.width + 2 * pad}px`;
      spot.style.height = `${rect.height + 2 * pad}px`;
    }

    card.querySelector('.tour-count').textContent = `Étape ${index + 1} sur ${STEPS.length}`;
    card.querySelector('h2').textContent = step.title;
    card.querySelector('.tour-text').textContent = step.text;
    card.querySelector('[data-act="prev"]').hidden = index === 0;
    card.querySelector('[data-act="next"]').textContent = index === STEPS.length - 1 ? 'Terminer' : 'Suivant';
    place(rect);
    card.querySelector('[data-act="next"]').focus();
  }

  function go(delta) {
    const next = index + delta;
    if (next < 0) return;
    if (next >= STEPS.length) { stop(); return; }
    index = next;
    render();
  }

  function onKey(e) {
    if (!card) return;
    if (e.key === 'Escape') { e.preventDefault(); stop(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  }
  const onResize = () => { if (card) render(); };

  function start() {
    if (card) return;
    lastFocus = doc.activeElement;
    index = 0;

    shield = el('div', 'tour-shield');
    spot = el('div', 'tour-spot');
    card = el('div', 'tour-card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'tourTitle');
    card.setAttribute('aria-describedby', 'tourText');
    const title = el('h2');
    title.id = 'tourTitle';
    const text = el('p', 'tour-text');
    text.id = 'tourText';
    const nav = el('div', 'tour-nav');
    const skip = el('button', 'link', 'Passer');
    skip.type = 'button';
    skip.dataset.act = 'skip';
    const prev = el('button', 'btn', 'Précédent');
    prev.type = 'button';
    prev.dataset.act = 'prev';
    const next = el('button', 'btn primary', 'Suivant');
    next.type = 'button';
    next.dataset.act = 'next';
    nav.append(skip, prev, next);
    card.append(el('p', 'tour-count'), title, text, nav);
    card.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      if (b.dataset.act === 'skip') stop();
      else go(b.dataset.act === 'next' ? 1 : -1);
    });

    doc.body.append(shield, spot, card);
    // Le reste de la page ne reçoit ni clic ni Tab pendant la visite.
    for (const sel of ['header', 'main', 'nav']) {
      const e = doc.querySelector(sel);
      if (e) { e.inert = true; inerted.push(e); }
    }
    doc.addEventListener('keydown', onKey, true);
    root.addEventListener('resize', onResize);
    render();
  }

  function stop() {
    if (!card) return;
    store.set(KEY, 'done');
    doc.removeEventListener('keydown', onKey, true);
    root.removeEventListener('resize', onResize);
    shield.remove();
    spot.remove();
    card.remove();
    shield = spot = card = null;
    for (const e of inerted) e.inert = false;
    inerted.length = 0;
    showTab('editor');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  const btn = doc.getElementById('btnTour');
  if (btn) btn.addEventListener('click', start);
  // Premier lancement : la visite démarre toute seule, une seule fois.
  if (store.get(KEY) !== 'done') root.setTimeout(start, 400);

  root.V8086 = root.V8086 || {};
  root.V8086.tour = { start, stop };
})(typeof window !== 'undefined' ? window : globalThis);
