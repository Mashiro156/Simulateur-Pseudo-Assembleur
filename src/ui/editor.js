/* Éditeur de code : une zone de texte transparente posée sur une couche colorée.
   Numéros de ligne, points d'arrêt (clic dans la marge), ligne courante, erreur soulignée,
   aide au survol. Pas d'autocomplétion, volontairement. */
(function (root) {
  'use strict';
  const V = (root.V8086 = root.V8086 || {});
  const H = V.highlight;

  function createEditor(host, handlers) {
    handlers = handlers || {};
    host.classList.add('editor');
    host.innerHTML =
      '<div class="gutter" aria-hidden="true"><div class="gutter-inner"></div></div>' +
      '<div class="code-area">' +
      '<div class="overlay" aria-hidden="true"><div class="overlay-inner"></div></div>' +
      '<textarea class="code-input" spellcheck="false" autocomplete="off" autocapitalize="off" ' +
      'wrap="off" aria-label="Éditeur de code V8086"></textarea></div>';
    const gutterInner = host.querySelector('.gutter-inner');
    const gutter = host.querySelector('.gutter');
    const overlayInner = host.querySelector('.overlay-inner');
    const ta = host.querySelector('textarea');
    const tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.hidden = true;
    document.body.appendChild(tip);

    let info = [];
    let labelLines = {};
    let errorMark = null;
    let currentLine = null;
    const breakpoints = new Set();
    let charW = 8, lh = 22;

    function measure() {
      const cs = getComputedStyle(ta);
      lh = parseFloat(cs.lineHeight) || 22;
      const probe = document.createElement('span');
      probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${cs.font};letter-spacing:${cs.letterSpacing}`;
      probe.textContent = 'M'.repeat(100);
      document.body.appendChild(probe);
      charW = probe.getBoundingClientRect().width / 100;
      probe.remove();
    }

    function render() {
      const lines = ta.value.split('\n');
      const res = H.analyzeText(lines);
      info = res.lines;
      labelLines = res.labelLines;
      for (const n of [...breakpoints]) if (n > lines.length) breakpoints.delete(n);

      overlayInner.innerHTML = info.map((li, idx) => {
        const n = idx + 1;
        const marks = [];
        const isErr = errorMark && errorMark.line === n;
        if (isErr) marks.push({ start: errorMark.col - 1, end: errorMark.col - 1 + errorMark.length, cls: 'err-u' });
        const cls = 'ln' + (currentLine === n ? ' current' : '') + (isErr ? ' err-line' : '') + (breakpoints.has(n) ? ' has-bp' : '');
        return `<div class="${cls}">${H.lineToHtml(li, marks)}</div>`;
      }).join('');

      gutterInner.innerHTML = info.map((_, idx) => {
        const n = idx + 1;
        const cls = 'gl' + (breakpoints.has(n) ? ' bp-on' : '') + (currentLine === n ? ' cur' : '') +
          (errorMark && errorMark.line === n ? ' err' : '');
        return `<div class="${cls}" data-line="${n}"><span class="bp"></span><span class="num">${n}</span></div>`;
      }).join('');
      syncScroll();
    }

    function syncScroll() {
      const t = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
      overlayInner.style.transform = t;
      gutterInner.style.transform = `translateY(${-ta.scrollTop}px)`;
    }

    // --- Saisie
    ta.addEventListener('input', () => {
      if (ta.value.includes('\t')) {
        const pos = ta.selectionStart;
        const tabsBefore = (ta.value.slice(0, pos).match(/\t/g) || []).length;
        ta.value = ta.value.replace(/\t/g, '    ');
        ta.selectionStart = ta.selectionEnd = pos + tabsBefore * 3;
      }
      hideTip();
      render();
      if (handlers.onChange) handlers.onChange(ta.value);
    });
    ta.addEventListener('scroll', () => { syncScroll(); hideTip(); });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        if (!document.execCommand || !document.execCommand('insertText', false, '    ')) {
          ta.setRangeText('    ', ta.selectionStart, ta.selectionEnd, 'end');
          ta.dispatchEvent(new Event('input'));
        }
      }
    });

    // --- Points d'arrêt
    gutter.addEventListener('mousedown', (e) => {
      const gl = e.target.closest('.gl');
      if (!gl) return;
      e.preventDefault();
      const n = Number(gl.dataset.line);
      if (breakpoints.has(n)) breakpoints.delete(n); else breakpoints.add(n);
      render();
      if (handlers.onBreakpoints) handlers.onBreakpoints(new Set(breakpoints));
    });

    // --- Aide au survol
    function position(e) {
      const r = ta.getBoundingClientRect();
      const cs = getComputedStyle(ta);
      const x = e.clientX - r.left - parseFloat(cs.paddingLeft) + ta.scrollLeft;
      const y = e.clientY - r.top - parseFloat(cs.paddingTop) + ta.scrollTop;
      if (x < 0 || y < 0) return null;
      const line = Math.floor(y / lh) + 1;
      if (line > info.length) return null;
      return { line, col0: Math.floor(x / charW) };
    }
    let lastKey = '';
    function hideTip() { tip.hidden = true; lastKey = ''; }
    ta.addEventListener('mousemove', (e) => {
      const p = position(e);
      if (!p || !handlers.hover) return hideTip();
      const li = info[p.line - 1];
      const error = errorMark && errorMark.line === p.line && p.col0 >= errorMark.col - 1 &&
        p.col0 < errorMark.col - 1 + errorMark.length ? errorMark : null;
      const token = H.tokenAt(li, p.col0);
      const key = `${p.line}:${error ? 'e' : token ? token.start : '-'}`;
      if (key === lastKey && !tip.hidden) return placeTip(e);
      const html = error || token ? handlers.hover({ error, token, line: p.line, labelLines }) : null;
      if (!html) return hideTip();
      lastKey = key;
      tip.innerHTML = html;
      tip.hidden = false;
      placeTip(e);
    });
    function placeTip(e) {
      const w = tip.offsetWidth, h = tip.offsetHeight;
      let x = e.clientX + 14, y = e.clientY + 18;
      if (x + w > window.innerWidth - 8) x = Math.max(8, window.innerWidth - w - 8);
      if (y + h > window.innerHeight - 8) y = e.clientY - h - 12;
      tip.style.left = `${x}px`;
      tip.style.top = `${y}px`;
    }
    ta.addEventListener('mouseleave', hideTip);
    ta.addEventListener('blur', hideTip);

    measure();
    window.addEventListener('resize', measure);
    render();

    return {
      getValue: () => ta.value,
      setValue(text) { ta.value = text; ta.scrollTop = 0; ta.scrollLeft = 0; render(); },
      focus: () => ta.focus(),
      setError(diag) { errorMark = diag || null; render(); },
      setCurrentLine(n) { if (n !== currentLine) { currentLine = n; render(); } },
      getBreakpoints: () => new Set(breakpoints),
      clearBreakpoints() { breakpoints.clear(); render(); },
      labelLines: () => labelLines,
      lineCount: () => info.length,
      reveal(line) {
        const top = (line - 1) * lh;
        const view = ta.clientHeight - lh * 2;
        if (top < ta.scrollTop) ta.scrollTop = Math.max(0, top - lh);
        else if (top > ta.scrollTop + view) ta.scrollTop = top - view + lh;
        syncScroll();
      },
      remeasure: measure,
    };
  }

  V.editor = { createEditor };
})(window);
