/* Variables permanentes : cases mémoire que l'utilisateur garde d'un programme à l'autre
   (par exemple UN = 1). Ce fichier valide, sérialise et fusionne la liste ; il ne connaît
   ni le stockage ni l'interface. */
(function (root) {
  'use strict';
  const V = (root.V8086 = root.V8086 || {});
  const isNode = typeof module === 'object' && module.exports;
  const L = isNode ? require('./language.js') : V.language;

  const NAME = /^[A-Z][A-Z0-9_]*$/;
  const REAL = /^-?\d+(\.\d+)?$/;
  const FORMAT = 'v8086-variables';

  // Renvoie un message d'erreur, ou null si le nom est valable.
  function checkName(name) {
    if (!NAME.test(name)) {
      return 'un nom commence par une lettre majuscule et ne contient que des majuscules, des chiffres et « _ ».';
    }
    if (L.RESERVED.has(name)) return `« ${name} » est un mot réservé (instruction ou directive).`;
    return null;
  }

  // Convertit un texte en nombre réel (point décimal), ou renvoie null.
  function parseValue(text) {
    const t = String(text).trim();
    return REAL.test(t) ? parseFloat(t) : null;
  }

  // Ajoute ou remplace une variable. Renvoie la nouvelle liste (l'ordre d'ajout est conservé).
  function upsert(list, name, value) {
    const out = list.map((v) => ({ name: v.name, value: v.value }));
    const hit = out.find((v) => v.name === name);
    if (hit) hit.value = value;
    else out.push({ name, value });
    return out;
  }

  const remove = (list, name) => list.filter((v) => v.name !== name);

  const serialize = (list) => JSON.stringify({ format: FORMAT, version: 1, variables: list }, null, 2) + '\n';

  /* Lit un fichier d'export. Renvoie { variables, rejected } : les entrées invalides
     sont listées dans `rejected` avec leur motif, sans bloquer les autres. */
  function parse(text) {
    let data;
    try { data = JSON.parse(text); } catch (e) { return { variables: [], rejected: [], fatal: "le fichier n'est pas un JSON valide." }; }
    if (!data || data.format !== FORMAT || !Array.isArray(data.variables)) {
      return { variables: [], rejected: [], fatal: "ce fichier n'est pas un export de variables V8086." };
    }
    const variables = [], rejected = [];
    for (const v of data.variables) {
      const name = v && typeof v.name === 'string' ? v.name : '?';
      const bad = checkName(name);
      if (bad) rejected.push({ name, reason: bad });
      else if (typeof v.value !== 'number' || !Number.isFinite(v.value)) rejected.push({ name, reason: 'la valeur doit être un nombre réel.' });
      else {
        const i = variables.findIndex((x) => x.name === name);
        if (i >= 0) variables[i].value = v.value;
        else variables.push({ name, value: v.value });
      }
    }
    return { variables, rejected, fatal: null };
  }

  // Empreinte d'une liste, pour savoir si elle a changé depuis la dernière compilation.
  const signature = (list) => list.map((v) => `${v.name}=${v.value}`).join(';');

  /* Fichier de projet : un fichier texte qui contient le code ET les variables permanentes.
     Les lignes d'en-tête commencent par « # », donc le fichier reste un programme valable
     même ouvert tel quel :

       # V8086 projet
       # VARIABLES
       # UN = 1
       # CODE
       (le programme commence ici) */
  const PROJECT_HEAD = '# V8086 projet';
  const PROJECT_VARS = '# VARIABLES';
  const PROJECT_CODE = '# CODE';

  // Écrit un nombre sans notation scientifique, pour que parseValue le relise.
  const formatValue = (n) => {
    const s = String(n);
    return /e/i.test(s) ? n.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 }) : s;
  };

  const serializeProject = (code, list) =>
    [PROJECT_HEAD, PROJECT_VARS, ...list.map((v) => `# ${v.name} = ${formatValue(v.value)}`), PROJECT_CODE].join('\n') +
    '\n' + code;

  /* Lit un fichier choisi par l'utilisateur. Renvoie toujours un objet avec `kind` :
       'project'   : { code, variables, rejected }   fichier enregistré par V8086
       'variables' : { variables, rejected }         ancien export JSON des variables seules
       'code'      : { code }                        texte quelconque, pris comme programme
       'invalid'   : { fatal }                       fichier inutilisable
     `rejected` liste les variables refusées, avec leur motif, sans bloquer les autres. */
  function parseProjectFile(text) {
    const t = String(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const lines = t.trimStart().split('\n');
    const head = lines[0].trim();
    if (head !== PROJECT_HEAD) {
      if (head.startsWith('{')) {
        const r = parse(t);
        return r.fatal ? { kind: 'invalid', fatal: r.fatal } : { kind: 'variables', variables: r.variables, rejected: r.rejected };
      }
      return { kind: 'code', code: t };
    }
    const variables = [], rejected = [];
    let i = 1;
    for (; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === PROJECT_CODE) break;
      if (line === '' || line === PROJECT_VARS) continue;
      const m = /^#\s*(\S+?)\s*=\s*(.*?)\s*$/.exec(line);
      if (!m) { rejected.push({ name: line, reason: 'ligne illisible (attendu : # NOM = valeur).' }); continue; }
      const bad = checkName(m[1]);
      const value = parseValue(m[2]);
      if (bad) rejected.push({ name: m[1], reason: bad });
      else if (value === null) rejected.push({ name: m[1], reason: 'la valeur doit être un nombre réel (avec un point).' });
      else {
        const k = variables.findIndex((x) => x.name === m[1]);
        if (k >= 0) variables[k].value = value;
        else variables.push({ name: m[1], value });
      }
    }
    if (i >= lines.length) return { kind: 'invalid', fatal: `fichier de projet incomplet : la ligne « ${PROJECT_CODE} » est absente.` };
    return { kind: 'project', code: lines.slice(i + 1).join('\n'), variables, rejected };
  }

  const api = { checkName, parseValue, upsert, remove, serialize, parse, signature, serializeProject, parseProjectFile, FORMAT };
  if (isNode) module.exports = api;
  else V.permanent = api;
})(typeof window !== 'undefined' ? window : globalThis);
