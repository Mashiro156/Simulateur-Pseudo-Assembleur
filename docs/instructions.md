# Instructions

Ce document décrit le jeu d'instructions de V8086, celui du cours d'architecture des ordinateurs (chapitre I, section III). La façon d'écrire un programme est dans [syntaxe.md](syntaxe.md).

## La machine

| Élément | Rôle |
|---|---|
| Mémoire | Cases désignées par un nom en majuscules (`A`, `SOMME`). Une case existe à partir de sa première valeur. |
| Accumulateur (AC) | Sert au format à 1 adresse. Vide jusqu'au premier `LOAD`. |
| Pile | Sert au format à 0 adresse. **TL** est la tête de pile, **SL** l'élément juste en dessous. |
| Registre drapeau | Garde le résultat de la dernière opération arithmétique. Les branchements conditionnels le lisent. Vide jusqu'à la première opération arithmétique. |
| Compteur ordinal | Désigne l'instruction à exécuter. L'éditeur surligne cette ligne. |

Notation : `A` est l'adresse, `a` son contenu. `X ← expression` signifie que `X` reçoit la valeur de l'expression.

## Arithmétique

Les quatre opérations `ADD` (+), `SUB` (−), `MPY` (×) et `DIV` (÷) existent dans les quatre formats. Le format est donné par le nombre d'opérandes.

| Format | Écriture | Effet |
|---|---|---|
| 3 adresses | `ADD OP1, OP2, OP3` | OP3 ← op1 + op2 |
| 2 adresses | `ADD OP1, OP2` | OP1 ← op1 + op2 |
| 1 adresse | `ADD OP` | AC ← ac + op |
| 0 adresse | `ADD` | sl + tl remplace sl et tl dans la pile |

Pour `SUB`, `MPY` et `DIV`, remplacer `+` par `−`, `×` ou `÷`. Pour l'ordre des opérandes : c'est toujours le premier moins (ou divisé par) le second. Avec la pile, le premier est SL (empilé en premier) et le second est TL :

```text
PUSH A
PUSH B
SUB            # a − b
```

Toutes les opérations travaillent sur des réels. `DIV` est donc une division réelle (7 ÷ 2 donne 3,5). Un diviseur nul est une erreur d'exécution (E401).

Chaque opération arithmétique, dans les quatre formats, **met à jour le registre drapeau** avec son résultat.

## Transferts

| Instruction | Effet |
|---|---|
| `LOAD X` | AC ← x |
| `STORE X` | X ← ac |
| `PUSH X` | empile x : x devient TL, l'ancien TL devient SL |
| `POP X` | X ← tl, et retire TL de la pile |

Ces quatre instructions **ne modifient pas** le registre drapeau.

`STORE` et toute opération à un opérande sur un accumulateur vide donnent l'erreur E404. `POP`, ou une opération sans opérande avec moins de deux valeurs dans la pile, donne l'erreur E402.

## Branchements

| Instruction | Saute à l'étiquette si le résultat du registre drapeau est |
|---|---|
| `BR ÉTIQ` | toujours (inconditionnel) |
| `BGT ÉTIQ` | > 0 |
| `BGE ÉTIQ` | ≥ 0 |
| `BLT ÉTIQ` | < 0 |
| `BLE ÉTIQ` | ≤ 0 |
| `BEZ ÉTIQ` | = 0 |

Si la condition n'est pas remplie, l'exécution continue à l'instruction suivante.

Il n'y a pas d'instruction de comparaison : **pour comparer deux nombres, on les soustrait et on teste le signe du résultat**. Comme seules les opérations arithmétiques modifient le registre drapeau, on peut intercaler `LOAD`, `STORE`, `PUSH` ou `POP` entre la soustraction et le branchement sans perdre le résultat.

```text
SUB A, B, T       # T ← a − b ; le registre drapeau reçoit a − b
BGT SUP           # saute à SUP si a > b
```

Un branchement conditionnel exécuté avant toute opération arithmétique est une erreur (E405).

### Soustraction destructive

En 2 adresses (`SUB A, B`) et en 3 adresses quand la destination est une source (`SUB A, B, A`), la soustraction écrase l'opérande. Le cours restaure la valeur par une addition après le branchement. L'addition modifie à son tour le registre drapeau : le branchement doit donc être fait avant la restauration, sur chaque chemin. Une variable auxiliaire (`SUB B, A, T`) évite le problème ; c'est ce que font les exemples de [exemples.md](exemples.md).

### Tester si une valeur est nulle

`LOAD` ne modifie pas le registre drapeau. Pour tester `d`, on fait passer sa valeur par une opération arithmétique, par exemple en lui ajoutant une case qui vaut zéro :

```text
DATA ZERO, 0
ADD D, ZERO, T    # T ← d + 0 ; le registre drapeau reçoit d
BEZ NUL           # saute si d = 0
```

## Entrées et sorties

| Instruction | Effet |
|---|---|
| `READ X` | lit un nombre réel saisi dans la console et le range dans X |
| `WRITE X` | affiche `X = valeur` dans la console |
| `PRINT X` | synonyme de `WRITE X` |

Une saisie qui n'est pas un nombre réel donne l'erreur E406. `WRITE` d'une variable sans valeur est une erreur (E302 ou E403, voir [syntaxe.md](syntaxe.md#variables)).

## Fin du programme

| Instruction | Effet |
|---|---|
| `END` | arrête le programme |
| `STOP` | synonyme de `END` |

## Modes

La directive `MODE n` limite le programme à un format. Les instructions de la dernière colonne sont autorisées dans tous les modes.

| Mode | Format | Instructions propres au mode | Autorisées dans tous les modes |
|---|---|---|---|
| 0 | 0 adresse (pile) | `PUSH`, `POP`, `ADD`/`SUB`/`MPY`/`DIV` sans opérande | `BR`, `BGT`, `BGE`, `BLT`, `BLE`, `BEZ`, `READ`, `WRITE`, `PRINT`, `END`, `STOP` |
| 1 | 1 adresse (accumulateur) | `LOAD`, `STORE`, `ADD`/`SUB`/`MPY`/`DIV` à 1 opérande | idem |
| 2 | 2 adresses | `ADD`/`SUB`/`MPY`/`DIV` à 2 opérandes | idem |
| 3 | 3 adresses | `ADD`/`SUB`/`MPY`/`DIV` à 3 opérandes | idem |

Une instruction qui n'appartient pas au mode déclaré donne l'erreur E306.

## Nombre d'opérandes par instruction

| Instruction | Opérandes |
|---|---|
| `ADD`, `SUB`, `MPY`, `DIV` | 0, 1, 2 ou 3 noms |
| `LOAD`, `STORE`, `PUSH`, `POP`, `READ`, `WRITE`, `PRINT` | 1 nom |
| `BR`, `BGT`, `BGE`, `BLT`, `BLE`, `BEZ` | 1 étiquette |
| `END`, `STOP` | aucun |

Un nombre d'opérandes incorrect donne l'erreur E202.

## Limites connues

Les nombres sont des réels en virgule flottante : certains résultats ne sont pas exacts (0,1 + 0,2 − 0,3 ne donne pas exactement 0). Les tests `BEZ`, `BGT`... comparent le résultat exact. Le type de `READ` sera élargi plus tard.
