# V8086

Compilateur et simulateur du pseudo-assembleur du cours d'architecture des ordinateurs (ENSPY, chapitre I).

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

Pour l'exécuter : ouvrir V8086 dans un navigateur (en local, ouvrir `index.html` : aucune installation, aucune connexion nécessaire), coller le programme dans l'éditeur, puis « Exécuter tout » pour aller jusqu'au bout, ou « Pas à pas » pour avancer une instruction à la fois.

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
| [docs/syntaxe.md](docs/syntaxe.md) | comment écrire un programme : lignes, noms, commentaires, étiquettes, variables, directives |
| [docs/instructions.md](docs/instructions.md) | chaque instruction, le registre drapeau, les modes |
| [docs/erreurs.md](docs/erreurs.md) | les 27 erreurs, avec un exemple et la correction |
| [docs/exemples.md](docs/exemples.md) | programmes complets en 0, 1, 2 et 3 adresses |
| [docs/architecture.md](docs/architecture.md) | les étapes du compilateur, pour contribuer |

## Fonctionnalités

- Vérification avant l'exécution : les erreurs sont numérotées et indiquent la ligne, la colonne et une aide.
- Exécution complète à vitesse réglable, ou pas à pas avec retour arrière.
- Points d'arrêt : un clic dans la marge, à gauche du numéro de ligne.
- Coloration du code, erreurs soulignées sur la ligne, aide au survol des instructions.
- Mémoire, accumulateur, pile (repères TL et SL du cours) et registre drapeau visibles, avec les valeurs modifiées mises en évidence.
- Valeurs de la mémoire modifiables à la main quand l'exécution est à l'arrêt (clic sur la valeur).
- Thème sombre ou clair.
- Pas d'autocomplétion : c'est un outil pour apprendre le langage, et il faut savoir écrire les instructions.

## Statut

V8086 est en ligne. Une version exécutable hors ligne est prévue ensuite : le code ne charge déjà aucune ressource depuis internet.

## Tests

```text
npm test            # noyau, machine virtuelle, coloration, exemples de la documentation
npm run test:ui     # scénarios de l'interface dans un navigateur (demande Playwright)
```

Les tests rejouent les exemples de la documentation : chaque erreur de [docs/erreurs.md](docs/erreurs.md) doit produire exactement le message écrit, et chaque programme de [docs/exemples.md](docs/exemples.md) doit donner la sortie annoncée. Si le code et la documentation divergent, un test échoue.

Les exemples proposés dans l'éditeur sont générés à partir de `docs/exemples.md` : après l'avoir modifié, lancer `npm run samples`.

## Contribuer

Lire [docs/architecture.md](docs/architecture.md). Une règle du langage se modifie d'abord dans la documentation, puis dans le code.
