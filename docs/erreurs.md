# Erreurs

Chaque erreur a un code, un titre, une position et, quand c'est possible, une aide. Les codes sont stables : on peut s'y référer.

## Format d'un message

```text
Erreur E302 — variable jamais initialisée « BB »  (ligne 3, colonne 8)

    3 | ADD A, BB, X
      |        ^^

Aide : « BB » n'est écrite nulle part (ni DATA, ni READ, ni résultat d'une instruction). Vouliez-vous dire « B » ?
```

- la première ligne donne le code, le titre et la position (ligne et colonne du premier caractère concerné) ;
- l'extrait montre la ligne et, sous elle, `^` marque l'endroit de l'erreur ;
- l'aide, quand elle existe, dit quoi faire (ou propose un nom proche).

## Quand les erreurs sont détectées

**Avant l'exécution (E1xx, E2xx, E3xx).** Le compilateur lit tout le programme en trois temps : lexique, puis syntaxe, puis sens. Il s'arrête à la première erreur trouvée et le programme n'est pas lancé. Dans l'éditeur, ces erreurs sont soulignées pendant la frappe, sans toucher à l'état de la machine.

**Pendant l'exécution (E4xx).** Le programme s'arrête à l'instruction fautive. L'état de la machine (mémoire, accumulateur, pile, registre drapeau) reste affiché pour chercher la cause.

Deux erreurs de variable se distinguent : E302 est certaine (le nom n'est écrit nulle part, détectée avant l'exécution), E403 est possible (le nom est écrit quelque part, mais pas encore quand la ligne s'exécute, détectée seulement si elle se produit).

## Liste des codes

| Code | Titre |
|---|---|
| [E101](#e101) | Caractère invalide |
| [E102](#e102) | Minuscules dans le code |
| [E103](#e103) | Nombre mal formé |
| [E104](#e104) | Commentaire non fermé |
| [E105](#e105) | Nom invalide |
| [E201](#e201) | Instruction inconnue |
| [E202](#e202) | Nombre d'opérandes incorrect |
| [E203](#e203) | Valeur immédiate interdite |
| [E204](#e204) | Étiquette mal formée |
| [E205](#e205) | Directive mal formée |
| [E206](#e206) | Instruction de fin manquante |
| [E207](#e207) | Directive MODE mal placée |
| [E301](#e301) | Étiquette inconnue |
| [E302](#e302) | Variable jamais initialisée |
| [E303](#e303) | Étiquette définie deux fois |
| [E304](#e304) | Variable déclarée deux fois |
| [E305](#e305) | Mot réservé utilisé comme nom |
| [E306](#e306) | Instruction hors mode |
| [E307](#e307) | Nom à la fois étiquette et variable |
| [E308](#e308) | Étiquette sans instruction |
| [E401](#e401) | Division par zéro |
| [E402](#e402) | Pile vide |
| [E403](#e403) | Variable sans valeur |
| [E404](#e404) | Accumulateur vide |
| [E405](#e405) | Registre drapeau vide |
| [E406](#e406) | Saisie invalide |
| [E407](#e407) | Fin du texte atteinte sans END |

## E1xx — Erreurs lexicales

Elles concernent les caractères et les mots.

### E101

**Caractère invalide.** Le code contient un caractère qui n'a aucun rôle dans le langage (par exemple `;`, `@`, `(`).

Exemple :

```text
DATA A, 1
ADD A, A, X ; somme
END
```

Message :

```text
Erreur E101 — caractère invalide « ; »  (ligne 2, colonne 13)

    2 | ADD A, A, X ; somme
      |             ^

Aide : les commentaires commencent par # ou sont entourés de // ... //.
```

Correction : Retirer le caractère. Pour un commentaire, utiliser `#` ou `// ... //`.

### E102

**Minuscules dans le code.** Une instruction ou un nom contient une minuscule. Convention du langage : les majuscules désignent les instructions et les adresses, les minuscules désignent les contenus (`a` est le contenu de `A`).

Exemple :

```text
DATA A, 1
ADD a, A, X
END
```

Message :

```text
Erreur E102 — minuscules interdites dans « a »  (ligne 2, colonne 5)

    2 | ADD a, A, X
      |     ^

Aide : les instructions et les adresses s'écrivent en majuscules : « A ». La minuscule désigne le contenu d'une adresse, pas l'adresse.
```

Correction : Écrire l'instruction ou le nom en majuscules.

### E103

**Nombre mal formé.** Un nombre contient plusieurs points décimaux ou des caractères parasites.

Exemple :

```text
DATA A, 1.2.3
END
```

Message :

```text
Erreur E103 — nombre mal formé « 1.2.3 »  (ligne 1, colonne 9)

    1 | DATA A, 1.2.3
      |         ^^^^^

Aide : un nombre s'écrit avec des chiffres et au plus un point décimal : 15, -3, 2.5.
```

Correction : Écrire le nombre avec au plus un point décimal : `1.2`.

### E104

**Commentaire non fermé.** Un commentaire `//` est ouvert mais le `//` de fermeture manque. Tout ce qui suit est alors dans le commentaire.

Exemple :

```text
DATA A, 1
// note qui ne se ferme pas
WRITE A
END
```

Message :

```text
Erreur E104 — commentaire « // » jamais fermé  (ligne 2, colonne 1)

    2 | // note qui ne se ferme pas
      | ^^

Aide : un commentaire sur plusieurs lignes s'écrit // ... // ; il manque le second //.
```

Correction : Ajouter `//` à la fin du commentaire.

### E105

**Nom invalide.** Un nom ne respecte pas la forme lettre majuscule, puis majuscules, chiffres ou `_`. Il commence par un chiffre ou contient un caractère interdit comme `-`.

Exemple :

```text
DATA 1A, 5
END
```

Message :

```text
Erreur E105 — nom invalide « 1A »  (ligne 1, colonne 6)

    1 | DATA 1A, 5
      |      ^^

Aide : un nom commence par une lettre majuscule et ne contient que des majuscules, des chiffres et « _ ».
```

Correction : Choisir un nom qui commence par une lettre : `A1`.

## E2xx — Erreurs de syntaxe

Elles concernent la forme des lignes.

### E201

**Instruction inconnue.** Le premier mot de la ligne n'est pas une instruction du langage. Cause la plus fréquente : une faute de frappe.

Exemple :

```text
DATA A, 1
ADDD A, A, X
END
```

Message :

```text
Erreur E201 — instruction inconnue « ADDD »  (ligne 2, colonne 1)

    2 | ADDD A, A, X
      | ^^^^

Aide : vouliez-vous dire « ADD » ?
```

Correction : Corriger le mnémonique. La liste complète est dans `instructions.md`.

### E202

**Nombre d'opérandes incorrect.** L'instruction n'a pas le bon nombre d'opérandes, ou deux opérandes ne sont pas séparés par une virgule.

Exemple :

```text
DATA A, 1
DATA B, 2
LOAD A, B
END
```

Message :

```text
Erreur E202 — LOAD attend 1 opérande, 2 reçus  (ligne 3, colonne 1)

    3 | LOAD A, B
      | ^^^^

Aide : formes valides : LOAD X.
```

Correction : Donner à l'instruction le nombre d'opérandes qu'elle attend (voir `instructions.md`) et séparer les opérandes par des virgules.

### E203

**Valeur immédiate interdite.** Un nombre est utilisé comme opérande. Les opérandes sont des adresses : les valeurs immédiates n'existent pas dans le langage du cours.

Exemple :

```text
DATA A, 1
ADD A, 3, X
END
```

Message :

```text
Erreur E203 — valeur immédiate interdite « 3 »  (ligne 2, colonne 8)

    2 | ADD A, 3, X
      |        ^

Aide : les opérandes sont des adresses. Déclarez la valeur avec DATA (par exemple DATA UN, 3) puis utilisez son nom.
```

Correction : Déclarer la valeur avec `DATA` (`DATA TROIS, 3`) et utiliser son nom comme opérande.

### E204

**Étiquette mal formée.** Une ligne contient plusieurs étiquettes, une étiquette sans nom, ou un `:` mal placé.

Exemple :

```text
DATA A, 1
L1: L2: WRITE A
END
```

Message :

```text
Erreur E204 — étiquette mal formée : une seule étiquette par ligne  (ligne 2, colonne 5)

    2 | L1: L2: WRITE A
      |     ^^

Aide : placez chaque étiquette sur sa propre ligne, devant l'instruction qu'elle désigne.
```

Correction : Mettre une étiquette par ligne, devant l'instruction qu'elle désigne. Une étiquette peut aussi être seule sur sa ligne.

### E205

**Directive mal formée.** `DATA` attend un nom et un nombre. `MODE` attend 0, 1, 2 ou 3.

Exemple :

```text
DATA A
WRITE A
END
```

Message :

```text
Erreur E205 — directive DATA mal formée  (ligne 1, colonne 1)

    1 | DATA A
      | ^^^^

Aide : la forme est DATA NOM, valeur  (par exemple DATA A, 15).
```

Correction : Écrire `DATA NOM, valeur` ou `MODE n`.

### E206

**Instruction de fin manquante.** Le programme ne contient ni `END` ni `STOP`.

Exemple :

```text
DATA A, 1
WRITE A
```

Message :

```text
Erreur E206 — instruction de fin manquante  (ligne 2, colonne 1)

    2 | WRITE A
      | ^^^^^^^

Aide : terminez le programme par END ou STOP.
```

Correction : Terminer le programme par `END` ou `STOP`.

### E207

**Directive MODE mal placée.** `MODE` apparaît après une instruction, ou plus d'une fois.

Exemple :

```text
DATA A, 1
WRITE A
MODE 1
END
```

Message :

```text
Erreur E207 — directive MODE mal placée  (ligne 3, colonne 1)

    3 | MODE 1
      | ^^^^

Aide : MODE apparaît une seule fois, avant la première instruction.
```

Correction : Placer `MODE` une seule fois, avant la première instruction.

## E3xx — Erreurs de sens

Elles sont détectées avant l'exécution, en lisant tout le programme.

### E301

**Étiquette inconnue.** Un branchement désigne une étiquette qui n'est définie nulle part dans le programme.

Exemple :

```text
DATA A, 1
BR FINN
WRITE A
FIN: END
```

Message :

```text
Erreur E301 — étiquette inconnue « FINN »  (ligne 2, colonne 4)

    2 | BR FINN
      |    ^^^^

Aide : vouliez-vous dire « FIN » ?
```

Correction : Corriger le nom de l'étiquette, ou la définir devant l'instruction visée.

### E302

**Variable jamais initialisée.** Un nom est lu quelque part mais n'est écrit nulle part dans tout le programme : ni `DATA`, ni `READ`, ni résultat d'une instruction qui n'a pas besoin de sa valeur (voir `syntaxe.md`, section Variables). C'est presque toujours une faute de frappe. Le programme n'est pas lancé.

Exemple :

```text
DATA A, 4
DATA B, 3
ADD A, BB, X
WRITE X
END
```

Message :

```text
Erreur E302 — variable jamais initialisée « BB »  (ligne 3, colonne 8)

    3 | ADD A, BB, X
      |        ^^

Aide : « BB » n'est écrite nulle part (ni DATA, ni READ, ni résultat d'une instruction). Vouliez-vous dire « B » ?
```

Correction : Corriger le nom, ou lui donner une valeur avec `DATA` ou `READ`.

### E303

**Étiquette définie deux fois.** Deux lignes définissent une étiquette du même nom.

Exemple :

```text
DATA A, 1
L1: WRITE A
L1: END
```

Message :

```text
Erreur E303 — étiquette « L1 » déjà définie  (ligne 3, colonne 1)

    3 | L1: END
      | ^^

Aide : première définition à la ligne 2.
```

Correction : Renommer l'une des deux étiquettes.

### E304

**Variable déclarée deux fois.** Deux directives `DATA` déclarent le même nom.

Exemple :

```text
DATA A, 1
DATA A, 2
WRITE A
END
```

Message :

```text
Erreur E304 — variable « A » déjà déclarée  (ligne 2, colonne 6)

    2 | DATA A, 2
      |      ^

Aide : première déclaration à la ligne 1.
```

Correction : Supprimer ou renommer l'une des deux déclarations.

### E305

**Mot réservé utilisé comme nom.** Un nom de variable ou d'étiquette est un mot réservé : mnémonique (`ADD`, `END`...) ou directive (`DATA`, `MODE`).

Exemple :

```text
DATA END, 5
WRITE END
END
```

Message :

```text
Erreur E305 — mot réservé « END » utilisé comme nom de variable  (ligne 1, colonne 6)

    1 | DATA END, 5
      |      ^^^

Aide : choisissez un autre nom : les mnémoniques et directives sont réservés.
```

Correction : Choisir un autre nom.

### E306

**Instruction hors mode.** Le programme déclare `MODE n` et une instruction appartient à une autre famille (voir `instructions.md`, tableau des modes).

Exemple :

```text
MODE 2
DATA A, 1
ADD A, A, X
END
```

Message :

```text
Erreur E306 — ADD n'est pas autorisée en mode 2  (ligne 3, colonne 1)

    3 | ADD A, A, X
      | ^^^

Aide : cette forme appartient au mode 3. Le programme déclare MODE 2.
```

Correction : Écrire l'instruction dans la forme du mode déclaré, ou changer le mode.

### E307

**Nom à la fois étiquette et variable.** Un même nom est utilisé comme étiquette et comme variable.

Exemple :

```text
DATA A, 1
A: WRITE A
END
```

Message :

```text
Erreur E307 — « A » est utilisé à la fois comme étiquette et comme variable  (ligne 2, colonne 1)

    2 | A: WRITE A
      | ^

Aide : une étiquette et une variable ne peuvent pas porter le même nom.
```

Correction : Renommer l'étiquette ou la variable.

### E308

**Étiquette sans instruction.** Une étiquette termine le programme : aucune instruction ne la suit, donc elle ne désigne rien.

Exemple :

```text
DATA A, 1
WRITE A
END
FIN:
```

Message :

```text
Erreur E308 — étiquette « FIN » sans instruction  (ligne 4, colonne 1)

    4 | FIN:
      | ^^^

Aide : une étiquette désigne l'instruction qui la suit ; il n'y en a pas.
```

Correction : Placer l'étiquette devant une instruction, ou la supprimer.

## E4xx — Erreurs d'exécution

Elles arrêtent le programme à l'instruction fautive.

### E401

**Division par zéro.** Le diviseur d'un `DIV` vaut 0 au moment de l'exécution.

Exemple :

```text
DATA A, 1
DATA B, 0
DIV A, B, X
END
```

Message :

```text
Erreur E401 — division par zéro (B vaut 0)  (ligne 3, colonne 8)

    3 | DIV A, B, X
      |        ^

Aide : testez le diviseur avant la division.
```

Correction : Tester le diviseur avant la division (exemple « Expression Z » dans `exemples.md`).

### E402

**Pile vide.** `POP` est exécuté sur une pile vide, ou une opération sur la pile (`ADD`, `SUB`, `MPY`, `DIV` sans opérande) s'exécute avec moins de deux valeurs empilées.

Exemple :

```text
POP X
END
```

Message :

```text
Erreur E402 — pile vide  (ligne 1, colonne 1)

    1 | POP X
      | ^^^

Aide : POP s'exécute sur une pile qui ne contient aucune valeur.
```

Correction : Vérifier l'ordre des `PUSH` et des `POP`.

### E403

**Variable sans valeur.** Un nom est lu avant d'avoir reçu une valeur. Contrairement à E302, ce nom reçoit une valeur ailleurs dans le programme, mais pas encore au moment où la ligne s'exécute.

Exemple :

```text
DATA A, 2
ADD A, X, Y
READ X
END
```

Message :

```text
Erreur E403 — variable sans valeur « X »  (ligne 2, colonne 8)

    2 | ADD A, X, Y
      |        ^

Aide : « X » n'a pas encore reçu de valeur à cet endroit du programme (DATA, READ ou résultat d'une instruction avant cette ligne).
```

Correction : Donner une valeur au nom avant cette ligne (déplacer le `READ`, ou ajouter un `DATA`).

### E404

**Accumulateur vide.** Une instruction à un opérande (`ADD`, `SUB`, `MPY`, `DIV`) ou un `STORE` s'exécute avant tout `LOAD` : l'accumulateur n'a pas de valeur.

Exemple :

```text
DATA A, 1
ADD A
END
```

Message :

```text
Erreur E404 — accumulateur vide  (ligne 2, colonne 1)

    2 | ADD A
      | ^^^

Aide : aucun LOAD n'a été exécuté : l'accumulateur n'a pas de valeur.
```

Correction : Charger l'accumulateur avec `LOAD` avant l'opération.

### E405

**Registre drapeau vide.** Un branchement conditionnel (`BGT`, `BGE`, `BLT`, `BLE`, `BEZ`) s'exécute avant toute opération arithmétique : il n'y a pas de résultat à tester.

Exemple :

```text
BGT FIN
FIN: END
```

Message :

```text
Erreur E405 — registre drapeau vide  (ligne 1, colonne 1)

    1 | BGT FIN
      | ^^^

Aide : aucune opération arithmétique (ADD, SUB, MPY, DIV) n'a encore été exécutée : il n'y a pas de résultat à tester.
```

Correction : Faire une opération arithmétique (`SUB` pour comparer) avant le branchement.

### E406

**Saisie invalide.** `READ` a reçu une valeur qui n'est pas un nombre réel.

Exemple :

```text
READ X
WRITE X
END
```

(saisie à `READ` : `abc`)
Message :

```text
Erreur E406 — saisie invalide « abc »  (ligne 1, colonne 6)

    1 | READ X
      |      ^

Aide : READ attend un nombre réel (par exemple 12 ou -3.5).
```

Correction : Saisir un nombre : `12`, `-3`, `2.5`. Le séparateur décimal est le point : `2,5` est refusé.

### E407

**Fin du texte atteinte sans END.** L'exécution est sortie par le bas du programme sans passer par `END` ni `STOP`, par exemple après un saut qui contourne le `END`.

Exemple :

```text
DATA A, 1
BR SUITE
END
SUITE: WRITE A
```

Message :

```text
Erreur E407 — fin du texte atteinte sans END ni STOP  (ligne 4, colonne 8)

    4 | SUITE: WRITE A
      |        ^^^^^

Aide : l'exécution est sortie par le bas du programme ; vérifiez les sauts (BR).
```

Correction : Terminer chaque chemin d'exécution par `END` ou `STOP`.
