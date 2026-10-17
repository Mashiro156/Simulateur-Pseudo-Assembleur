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

## Règles pour contribuer

- Une règle du langage se change d'abord dans [syntaxe.md](syntaxe.md) ou [instructions.md](instructions.md), puis dans le code.
- Chaque code d'erreur a un exemple dans [erreurs.md](erreurs.md) : ces exemples servent de tests (le code attendu, la ligne et la colonne).
- Les programmes de [exemples.md](exemples.md) servent de tests d'exécution, avec leurs sorties.
- Aucune ressource n'est chargée depuis internet (bibliothèques, polices, icônes) : tout est dans le dépôt. La version hors ligne prévue ne doit demander aucun changement de ce côté.

## Organisation proposée

Ce découpage n'est pas encore en place dans le code actuel.

```text
src/
  lexer/       analyse lexicale
  parser/      analyse syntaxique
  semantic/    analyse sémantique
  vm/          machine virtuelle
  errors/      catalogue et formatage des erreurs
  ui/          interface
docs/
tests/
```
