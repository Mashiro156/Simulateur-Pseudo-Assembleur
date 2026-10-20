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

  const api = { checkName, parseValue, upsert, remove, serialize, parse, signature, FORMAT };
  if (isNode) module.exports = api;
  else V.permanent = api;
})(typeof window !== 'undefined' ? window : globalThis);
