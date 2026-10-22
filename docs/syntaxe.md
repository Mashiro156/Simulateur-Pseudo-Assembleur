# Syntaxe

Ce document décrit comment écrire un programme V8086 : lignes, noms, commentaires, étiquettes, variables, directives. Les instructions elles-mêmes sont décrites dans [instructions.md](instructions.md).

## Un programme

Un programme est une suite de lignes. Une ligne contient au plus une instruction, de la forme :

```text
[ÉTIQUETTE:] INSTRUCTION [opérande, opérande, opérande]
```

Les opérandes sont séparés par des virgules. Les espaces et l'indentation sont libres, les lignes vides sont ignorées.

```text
MODE 3
DATA A, 15
DATA B, 10

ADD A, B, X      # X reçoit A + B
WRITE X
END
```

## Majuscules et minuscules

Le langage est sensible à la casse, avec une convention :

- les **majuscules** désignent les instructions et les adresses (les cases mémoire) : `ADD`, `A`, `SOMME`, `L1` ;
- les **minuscules** désignent les contenus : `a` est le contenu de la case `A`.

Dans le code, on n'écrit donc jamais de minuscules. Une minuscule dans un programme est refusée avec le message E102, qui rappelle la convention. Les minuscules servent dans la documentation et dans les commentaires pour parler du contenu d'une case (« A reçoit a + b »).

## Noms

Un nom (variable ou étiquette) commence par une lettre majuscule, suivie de majuscules, de chiffres ou de `_` : `A`, `X2`, `TEMP_1`, `BOUCLE`.

Les mnémoniques (`ADD`, `LOAD`, `END`...) et les directives (`DATA`, `MODE`) sont des mots réservés : ils ne peuvent pas servir de noms.

## Commentaires

- `#` commence un commentaire qui va jusqu'à la fin de la ligne ;
- `// ... //` entoure un commentaire sur une ou plusieurs lignes.

```text
# commentaire d'une ligne
ADD A, B, X      # commentaire après une instruction

//
Commentaire
sur plusieurs lignes
//
```

Un `//` qui n'est jamais refermé est une erreur (E104). Le point-virgule `;` n'est pas un commentaire.

## Nombres

Tous les nombres sont des **réels** (virgule flottante en double précision). Le séparateur décimal est le point : `15`, `-3`, `2.5`.

Un nombre ne peut apparaître que dans une directive `DATA`. Il n'existe pas de valeur immédiate : `ADD A, 3, X` est une erreur (E203). Pour utiliser la valeur 3, on la déclare :

```text
DATA TROIS, 3
ADD A, TROIS, X
```

## Étiquettes

Une étiquette est un nom suivi de `:`. Elle désigne l'instruction qui la suit, et sert de cible aux branchements (`BR`, `BGT`...).

```text
BOUCLE: LOAD SOMME      # forme recommandée : l'étiquette devant son instruction
```

Une étiquette peut aussi être seule sur sa ligne ; elle désigne alors la prochaine instruction. Les règles :

- une seule étiquette par ligne (E204) ;
- une étiquette n'est définie qu'une fois (E303) ;
- une étiquette doit être suivie d'une instruction (E308) ;
- un branchement vers une étiquette inexistante est refusé avant l'exécution (E301) ;
- une étiquette peut être définie après le branchement qui la vise ;
- un nom ne peut pas être à la fois étiquette et variable (E307).

Dans une définition, le nom est suivi de `:` (`L1:`). Dans un branchement, le nom est écrit seul (`BR L1`).

## Directives

Les directives ne sont pas des instructions : elles sont lues avant l'exécution et ne s'exécutent pas.

### DATA

```text
DATA NOM, valeur
```

Crée la variable `NOM` avec la valeur donnée, pour le programme en cours. Un même nom ne peut être déclaré qu'une fois (E304). Par convention, les `DATA` sont placés en tête du programme, mais ils peuvent apparaître n'importe où.

Si une variable permanente (voir plus bas) porte déjà ce nom, la valeur du `DATA` la remplace pour ce programme.

### MODE

```text
MODE n
```

Indique le format de l'exercice : `n` vaut 0, 1, 2 ou 3 (nombre d'adresses). Le compilateur refuse alors toute instruction qui n'appartient pas à ce format (E306). `MODE` est facultatif ; s'il est présent, il apparaît une seule fois, avant la première instruction (E207). Le tableau des instructions autorisées par mode est dans [instructions.md](instructions.md#modes).

Sans `MODE`, le format de chaque instruction est déduit de son nombre d'opérandes, et les formats peuvent être mélangés.

## Variables

Les variables fonctionnent comme en Python : une variable existe à partir du moment où elle reçoit une première valeur, et la mémoire est vide au début de chaque exécution. Rien ne subsiste d'un programme à l'autre, sauf les variables permanentes.

Une variable reçoit sa première valeur par :

- `DATA` ;
- une variable permanente (voir plus bas) ;
- `READ` ;
- `STORE` ou `POP` ;
- une instruction à 3 adresses, dans sa destination (si la destination n'est pas aussi l'une des deux sources) ;
- une soustraction d'un nom avec lui-même (voir plus bas).

Lire une variable qui n'a pas de valeur est une erreur. Elle est signalée à deux moments :

- **avant l'exécution (E302)** si le nom ne reçoit de valeur nulle part dans le programme (ni `DATA`, ni variable permanente, ni écriture) : c'est presque toujours une faute de frappe, et le programme n'est pas lancé ;
- **pendant l'exécution (E403)** si le nom reçoit une valeur ailleurs, mais pas encore quand la ligne s'exécute. Le programme démarre et s'arrête seulement si l'erreur se produit.

Une instruction à 2 adresses lit son premier opérande avant d'y écrire (`ADD X, A` calcule `x + a`) : elle n'initialise donc pas `X`. Une instruction à 3 adresses dont la destination est aussi une source (`ADD A, B, A`) non plus.

### Remise à zéro : `SUB X, X`

Le cours remet une case à zéro avec une soustraction d'elle-même (`SUB A, A, A`). Le résultat ne dépend pas du contenu : une instruction `SUB` dont les deux sources sont le même nom est donc acceptée même si ce nom n'a pas encore de valeur, et elle initialise sa destination à 0.

```text
SUB X, X          # X vaut 0, même si X n'existait pas
SUB T, T, T       # idem, à 3 adresses
SUB X, X, Y       # Y vaut 0 ; X n'est pas lue
```


### Variables permanentes

Deux façons d'initialiser une case mémoire :

- **`DATA`**, dans le code : pour les cases propres au programme en cours d'écriture.
- **Le bouton « + Variable »** du panneau Mémoire : pour les cases que l'on utilise dans tous ses programmes, par exemple une case `UN` qui contient 1 ou une case `ZERO` qui contient 0. On donne un nom (majuscules, mêmes règles que dans le code) et une valeur réelle.

Une variable permanente existe dès le début de chaque exécution, sans rien écrire dans le code, et elle est conservée dans le navigateur d'une session à l'autre. Les boutons ✎ et ✕ de sa ligne dans le tableau permettent de la modifier ou de la supprimer. « Exporter » enregistre la liste seule dans un fichier (`v8086-variables.json`) et « Importer » la recharge : c'est le moyen de la transporter sur une autre machine ou de la partager.

### Enregistrer et importer un projet

Les boutons « Enregistrer » et « Importer » de la barre du haut sauvegardent et rechargent **le code et les variables permanentes ensemble**, dans un fichier texte. Sur Chrome et Edge, une fenêtre permet de choisir le dossier et le nom ; sur les autres navigateurs, le fichier va dans le dossier de téléchargement. Le fichier commence par des lignes de commentaire (`#`), il reste donc un programme valable ouvert tel quel :

```text
# V8086 projet
# VARIABLES
# UN = 1
# CODE
LOAD UN
END
```

À l'import d'un projet, le code et la liste des variables permanentes du fichier **remplacent** ceux de l'éditeur (une confirmation est demandée si des variables actuelles seraient perdues). Un fichier texte sans cet en-tête est pris comme un simple programme : seul le code change. Le code et les variables sont aussi conservés automatiquement dans le navigateur d'une session à l'autre ; le fichier sert à les garder, les transporter ou les partager.

Si un `DATA` porte le nom d'une variable permanente, **la valeur du `DATA` l'emporte** pour ce programme, et c'est elle qui est affichée dans la mémoire (la ligne est alors marquée `DATA`). La variable permanente n'est pas modifiée : elle reprend sa valeur dans les programmes qui n'ont pas ce `DATA`.

Une modification de la liste des variables permanentes s'applique à la prochaine exécution (« Reset » ou « Exécuter tout »).

## Fin du programme

Tout programme contient au moins un `END` (ou `STOP`, équivalent). Son absence est une erreur (E206). À l'exécution, sortir par le bas du programme sans être passé par `END` est aussi une erreur (E407).

## Résumé de la grammaire

```text
programme     ::= { ligne }
ligne         ::= [ étiquette ":" ] [ directive | instruction ] 
directive     ::= "DATA" nom "," nombre | "MODE" mode
instruction   ::= mnémonique [ opérande { "," opérande } ]
opérande      ::= nom
nom           ::= majuscule { majuscule | chiffre | "_" }
nombre        ::= [ "-" ] chiffre { chiffre } [ "." chiffre { chiffre } ]
mode          ::= "0" | "1" | "2" | "3"
chiffre       ::= "0" | "1" | ... | "9"
```

Une étiquette peut aussi former à elle seule une ligne. Les directives n'ont pas d'étiquette. Un commentaire (`#` ou `// ... //`) peut apparaître partout où un espace est permis.

## Mots réservés

`ADD` `SUB` `MPY` `DIV` `LOAD` `STORE` `PUSH` `POP` `BR` `BGT` `BGE` `BLT` `BLE` `BEZ` `READ` `WRITE` `PRINT` `END` `STOP` `DATA` `MODE`
