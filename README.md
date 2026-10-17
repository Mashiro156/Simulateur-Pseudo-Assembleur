# V8086

Compilateur et simulateur du pseudo-assembleur du cours d'architecture des ordinateurs (ENSP, chapitre I, Dr A. M. Chana Lemale).

On écrit un programme dans l'éditeur, V8086 le vérifie, puis l'exécute en montrant l'état de la machine à chaque instruction : mémoire, accumulateur, pile et registre drapeau.

## Un premier programme

```text
MODE 3
DATA A, 15
DATA B, 10

ADD A, B, X      # X reçoit A + B
WRITE X
END
```

Sortie : `X = 25`

Pour l'exécuter : ouvrir V8086 dans un navigateur, coller le programme dans l'éditeur, puis « Exécuter tout » pour aller jusqu'au bout, ou « Pas à pas » pour avancer une instruction à la fois.

## Le langage

V8086 reprend les instructions du cours :

- l'arithmétique `ADD`, `SUB`, `MPY`, `DIV` dans les formats à 0, 1, 2 et 3 adresses ;
- `LOAD`, `STORE` (accumulateur) et `PUSH`, `POP` (pile) ;
- les branchements `BR`, `BGT`, `BGE`, `BLT`, `BLE`, `BEZ`, qui lisent le résultat de la dernière opération arithmétique ;
- `READ` et `WRITE`.

Pour écrire des programmes complets, V8086 ajoute `DATA` (déclarer une valeur), `MODE` (imposer un format à un exercice), `END` pour finir un programme, et les synonymes `STOP` (pour `END`) et `PRINT` (pour `WRITE`).

Une convention à retenir : **les majuscules désignent les instructions et les adresses, les minuscules désignent les contenus**. Dans le code, tout s'écrit en majuscules.

## Documentation

| Fichier | Contenu |
|---|---|
| [docs/syntaxe.md](Docs/syntaxe.md) | comment écrire un programme : lignes, noms, commentaires, étiquettes, variables, directives |
| [docs/instructions.md](Docs/instructions.md) | chaque instruction, le registre drapeau, les modes |
| [docs/erreurs.md](Docs/erreurs.md) | les 27 erreurs, avec un exemple et la correction |
| [docs/exemples.md](Docs/exemples.md) | programmes complets en 0, 1, 2 et 3 adresses |
| [docs/architecture.md](Docs/architecture.md) | les étapes du compilateur, pour contribuer |

## Fonctionnalités

- Vérification avant l'exécution : les erreurs sont numérotées et indiquent la ligne, la colonne et une aide.
- Exécution complète à vitesse réglable, ou pas à pas avec retour arrière.
- Points d'arrêt.
- Coloration du code, erreurs soulignées sur la ligne, aide au survol des instructions.
- Mémoire, accumulateur, pile (repères TL et SL du cours) et registre drapeau visibles, avec les valeurs modifiées mises en évidence.
- Pas d'autocomplétion : c'est un outil pour apprendre le langage, et il faut savoir écrire les instructions.

## Statut

Ce dépôt décrit la version cible de V8086. Le code actuel est un simulateur en un seul fichier qui ne respecte pas encore toutes les règles décrites ici : commentaires en `;`, registres `R1` à `R4`, valeurs immédiates, variables prédéfinies, erreurs détectées seulement pendant l'exécution. La mise en conformité du code est la prochaine étape.

V8086 est en ligne. Une version exécutable hors ligne est prévue ensuite.

## Contribuer

Lire [docs/architecture.md](Docs/architecture.md). Une règle du langage se modifie d'abord dans la documentation, puis dans le code.
