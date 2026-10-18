# Exemples

Ce sont les exemples de la première version du simulateur, adaptés à la syntaxe de V8086 : valeurs déclarées par `DATA` (il n'y a pas de valeur immédiate), un `END` en fin de programme et un `WRITE` pour afficher le résultat. Chacun compile sans erreur et donne la sortie indiquée ; ils sont disponibles dans le menu **Exemples** de l'éditeur.

## 1. Branchements conditionnels (BGT)

Un branchement ne prend que l'étiquette de destination : il lit le registre drapeau, c'est-à-dire le résultat de la dernière opération arithmétique. Ici `SUB B` laisse `A − B` dans le registre drapeau, et `BGT` saute si ce résultat est positif.

```text
MODE 1
DATA A, 15
DATA B, 10
DATA ZERO, 0
DATA UN, 1

LOAD A                # AC reçoit A (15)
SUB B                 # AC reçoit 15 − 10 = 5 : le registre drapeau reçoit 5
BGT EST_POSITIF       # 5 > 0 : saut à EST_POSITIF

LOAD ZERO             # cette partie est ignorée en cas de saut
STORE RESULTAT
BR FIN

EST_POSITIF: LOAD UN
STORE RESULTAT        # RESULTAT reçoit 1 : A est plus grand que B
FIN: WRITE RESULTAT
END
```

Sortie :

```text
RESULTAT = 1
```

## 2. Format 3 adresses (destination à la fin)

Convention du cours : `OP source1, source2, destination`.

```text
MODE 3
DATA A, 10
DATA B, 5
DATA TROIS, 3
DATA DEUX, 2

ADD A, B, T1          # T1 reçoit A + B = 15
SUB T1, TROIS, T2     # T2 reçoit T1 − 3 = 12
MPY T1, T2, X         # X reçoit T1 × T2 = 180
DIV X, DEUX, RES      # RES reçoit X ÷ 2 = 90
WRITE RES
END
```

Sortie :

```text
RES = 90
```

## 3. Format 0 adresse (pile)

Calcul de `RES = (A + B) × C`. Les opérations sans opérande dépilent TL et SL et empilent le résultat.

```text
MODE 0
DATA A, 10
DATA B, 5
DATA C, 3

PUSH A                # empile A (10)
PUSH B                # empile B (5)
ADD                   # dépile 5 et 10, empile 15
PUSH C                # empile C (3)
MPY                   # dépile 3 et 15, empile 45
POP RES               # dépile dans RES
WRITE RES
END
```

Sortie :

```text
RES = 45
```

## 4. Boucle de décompte (BEZ, BR)

Additionne les nombres de N à 1. `LOAD` ne modifie pas le registre drapeau : pour tester le compteur, on le fait passer par une soustraction de `ZERO`, dont le résultat est le compteur lui-même, puis `BEZ` le lit.

```text
MODE 1
DATA N, 4
DATA UN, 1
DATA ZERO, 0

LOAD N
STORE COMPTEUR        # COMPTEUR reçoit N (4)
LOAD ZERO
STORE SOMME           # SOMME reçoit 0

BOUCLE: LOAD COMPTEUR
        SUB ZERO      # le registre drapeau reçoit COMPTEUR
        BEZ FIN       # COMPTEUR = 0 : sortie de la boucle
        LOAD SOMME
        ADD COMPTEUR
        STORE SOMME   # SOMME reçoit SOMME + COMPTEUR
        LOAD COMPTEUR
        SUB UN
        STORE COMPTEUR
        BR BOUCLE     # retour au début de la boucle
FIN:    LOAD SOMME
        STORE RES     # RES contient la somme totale
        WRITE RES
        END
```

Sortie :

```text
RES = 10
```

## 5. Format 1 adresse (accumulateur)

Toutes les opérations passent par l'accumulateur AC.

```text
MODE 1
DATA A, 10
DATA B, 5
DATA C, 3

LOAD A                # AC reçoit 10
SUB B                 # AC reçoit 10 − 5 = 5
MPY C                 # AC reçoit 5 × 3 = 15
STORE RES             # RES reçoit 15
WRITE RES
END
```

Sortie :

```text
RES = 15
```
