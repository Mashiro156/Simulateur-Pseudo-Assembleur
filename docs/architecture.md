# Architecture

V8086 est organisé comme un compilateur : une suite d'étapes, chacune chargée d'un seul type de problème. La machine ne reçoit que des programmes déjà vérifiés.

```text
texte du programme
      │
      ▼
 analyse lexicale ────► jetons                          erreurs E1xx
      │
      ▼
 analyse syntaxique ──► programme structuré             erreurs E2xx
      │                 (instructions, étiquettes, directives)
      ▼
 analyse sémantique ──► programme vérifié               erreurs E3xx
      │
      ▼
 machine virtuelle ───► états successifs, sorties       erreurs E4xx
      │
      ▼
 interface (éditeur, panneaux, console)
```

## Les étapes

| Étape | Entrée | Sortie | Responsabilité |
|---|---|---|---|
| Analyse lexicale | texte | jetons (nom, nombre, virgule, deux-points) | retire les commentaires, découpe le texte, refuse les caractères, minuscules et nombres invalides |
| Analyse syntaxique | jetons | instructions, directives, étiquettes | vérifie la forme de chaque ligne : nombre d'opérandes, directives, instruction de fin |
| Analyse sémantique | programme structuré | programme vérifié | vérifie le sens : étiquettes, variables, mode, mots réservés |
| Machine virtuelle | programme vérifié | états successifs | exécute une instruction par pas, signale les erreurs d'exécution |
| Interface | états et erreurs | affichage | éditeur, panneaux d'état, console, commandes |

Le jeu d'instructions (mnémoniques, directives, nombre d'opérandes, synonymes) est défini une seule fois, dans `src/language.js`, et partagé par toutes les étapes.

Les variables permanentes (voir [syntaxe.md](syntaxe.md#variables-permanentes)) sont une liste de noms et de valeurs que l'interface donne au compilateur (`compile(source, { permanent })`). L'analyse sémantique les compte comme initialisées ; la machine les place en mémoire avant les `DATA`, qui les écrasent en cas de même nom. Leur validation et leur export sont dans `src/permanent.js`, leur stockage dans l'interface.

Les analyses s'enchaînent dans cet ordre sur tout le programme. L'analyse s'arrête à la première erreur ; le collecteur d'erreurs est isolé pour pouvoir, plus tard, en rapporter plusieurs sans modifier les étapes.

## Les erreurs

Les erreurs sont gérées à un seul endroit. Une erreur est un objet : code, titre, ligne, colonne, longueur du fragment fautif, aide. Le catalogue des codes (E1xx à E4xx) est défini une seule fois ; le formatage des messages est commun à toutes les étapes. Le catalogue public est [erreurs.md](erreurs.md).

## La machine virtuelle

Elle ne connaît ni le texte, ni l'interface. Son état est composé de la mémoire (noms et valeurs), de l'accumulateur, de la pile, du registre drapeau et du compteur ordinal. Une opération `step()` exécute l'instruction courante et renvoie le nouvel état, ou une erreur. Le retour arrière conserve une copie de l'état à chaque pas.

## L'interface

Elle ne contient aucune règle du langage. Elle appelle les analyses et la machine, et affiche leurs résultats.

- L'analyse tourne pendant la frappe pour souligner les erreurs, mais **elle ne modifie pas l'état de la machine**.
- La machine n'est remise à zéro que par « Exécuter » ou « Reset ». Une indication signale que le code a été modifié depuis le dernier lancement.
- L'éditeur n'a pas d'autocomplétion, volontairement.
- Sur petit écran (moins de 760 px), un seul des trois panneaux (éditeur, console, machine) est affiché, choisi par la barre d'onglets ; la console s'affiche d'elle-même quand une erreur ou une saisie `READ` demande l'attention.

## L'application hors connexion (PWA)

`manifest.webmanifest` décrit l'application (nom, icônes, affichage) et `sw.js` met ses fichiers en cache à l'installation. Le service worker n'est enregistré (`src/ui/pwa.js`) que sur un site servi en HTTP(S).

**À chaque modification d'un fichier de l'application, changer `VERSION` dans `sw.js`** : c'est ce changement qui renouvelle le cache chez les utilisateurs. Tout nouveau fichier chargé par `index.html` doit aussi être ajouté à la liste `FILES` ; un test le vérifie.

## Règles pour contribuer

- Une règle du langage se change d'abord dans [syntaxe.md](syntaxe.md) ou [instructions.md](instructions.md), puis dans le code.
- Chaque code d'erreur a un exemple dans [erreurs.md](erreurs.md) : ces exemples servent de tests (le code attendu et le message exact, avec la ligne et la colonne).
- Les programmes de [exemples.md](exemples.md) servent de tests d'exécution, avec leurs sorties.
- Toute modification de fichier de l'application s'accompagne d'un changement de `VERSION` dans `sw.js` (voir ci-dessus).
- Pour ajouter une erreur : l'ajouter au catalogue (`src/errors/errors.js`), écrire son exemple dans `erreurs.md`, puis la signaler à l'étape concernée.
- Aucune ressource n'est chargée depuis internet (bibliothèques, polices, icônes) : tout est dans le dépôt. La version hors ligne prévue ne doit demander aucun changement de ce côté.

## Organisation du dépôt

```text
index.html           page de l'application
manifest.webmanifest description de l'application installable
sw.js                service worker : cache pour le mode hors connexion
icons/               icônes de l'application
css/styles.css       styles (thèmes sombre et clair, petit écran)
src/
  language.js        mots réservés, formats, nombre d'opérandes
  permanent.js       variables permanentes : validation, export, import
  errors/            catalogue des codes, formatage des messages, collecteur
  lexer/             analyse lexicale
  parser/            analyse syntaxique
  semantic/          analyse sémantique
  compiler.js        enchaîne les trois analyses
  vm/                machine virtuelle
  ui/                éditeur, coloration, aide au survol, panneaux, exemples
docs/                documentation (source des tests)
tests/               tests du noyau ; tests/ui : scénarios dans un navigateur
tools/               build-samples.js : génère les exemples de l'éditeur
```

Chaque fichier de `src/` se charge aussi bien par une balise `<script>` (le site) que par `require` (les tests).
