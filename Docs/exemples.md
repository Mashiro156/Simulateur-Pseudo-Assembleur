# Exemples

Chaque programme de ce document a été vérifié : il compile sans erreur et donne la sortie indiquée avec les valeurs de saisie données. Ils servent aussi de modèles de style : majuscules, `DATA` en tête, commentaires courts.

## 1. Premier programme (3 adresses)

Additionne deux nombres déclarés avec `DATA` et affiche le résultat.

```text
MODE 3
DATA A, 15
DATA B, 10

ADD A, B, X      # X reçoit A + B
WRITE X
END
```

Sortie :

```text
X = 25
```

## 2. Boucle : somme de N à 1 (1 adresse)

Le compteur est décrémenté par un `SUB`, puis `BGT` teste le résultat de ce `SUB` pour décider de recommencer. Le `STORE` placé entre les deux ne modifie pas le registre drapeau. Il n'existe pas de valeur immédiate : le pas de 1 est déclaré dans `UN`.

```text
MODE 1
DATA N, 4
DATA UN, 1
DATA SOMME, 0

LOAD N
STORE COMPTEUR
BOUCLE: LOAD SOMME
        ADD COMPTEUR
        STORE SOMME
        LOAD COMPTEUR
        SUB UN
        STORE COMPTEUR     # STORE ne modifie pas le registre drapeau
        BGT BOUCLE         # teste le résultat du SUB
WRITE SOMME
END
```

Sortie :

```text
SOMME = 10
```

## 3. Plus grand de deux nombres (2 adresses)

Exercice 2 du cours (page 18) : afficher le plus grand de deux nombres, ou 0 s'ils sont égaux. La comparaison est la soustraction `x − y` ; les deux branchements lisent son résultat.

```text
MODE 2
DATA ZERO, 0
READ X
READ Y

SUB T, T
ADD T, X
SUB T, Y           # T = x − y : le registre drapeau reçoit x − y
BEZ EGAUX          # égaux : on affiche 0
BGT XGRAND         # x > y
WRITE Y            # sinon y est le plus grand
END
XGRAND: WRITE X
        END
EGAUX:  WRITE ZERO
        END
```

- avec x = 3 et y = 5 : `Y = 5`
- avec x = 5 et y = 3 : `X = 5`
- avec x = 4 et y = 4 : `ZERO = 0`

## 4. Expression Z = A × B + C ÷ D (0, 1, 2 et 3 adresses)

Exercice 1 du cours (page 18) : évaluer l'expression, en affichant 0 si D vaut 0. Les quatre programmes font le même travail dans les quatre formats.

Le test de D passe par une opération arithmétique (`LOAD` et `PUSH` ne modifient pas le registre drapeau) : on ajoute `D` à une case nulle et `BEZ` lit le résultat. Le calcul de `C ÷ D` n'a lieu que si D est non nul, ce qui évite l'erreur E401.

### 0 adresse (pile)

```text
MODE 0
DATA ZERO, 0
READ A
READ B
READ C
READ D

PUSH D
PUSH ZERO
ADD                # D + 0 : le registre drapeau reçoit D
POP T
BEZ NUL            # D = 0 : on affiche 0

PUSH A
PUSH B
MPY                # A * B
PUSH C
PUSH D
DIV                # C / D
ADD                # A * B + C / D
POP Z
WRITE Z
END
NUL: WRITE ZERO
     END
```

Avec a = 3, b = 4, c = 10, d = 2 : `Z = 17`. Avec d = 0 : `ZERO = 0`.

### 1 adresse (accumulateur)

```text
MODE 1
DATA ZERO, 0
READ A
READ B
READ C
READ D

LOAD D
ADD ZERO           # AC reçoit D + 0 : le registre drapeau reçoit D
BEZ NUL            # D = 0 : on affiche 0

LOAD A
MPY B
STORE P            # P = A * B
LOAD C
DIV D
ADD P              # AC = C / D + A * B
STORE Z
WRITE Z
END
NUL: WRITE ZERO
     END
```

Avec a = 3, b = 4, c = 10, d = 2 : `Z = 17`. Avec d = 0 : `ZERO = 0`.

### 2 adresses

```text
MODE 2
DATA ZERO, 0
READ A
READ B
READ C
READ D

SUB T, T           # T = 0
ADD T, D           # T = D : le registre drapeau reçoit D
BEZ NUL            # D = 0 : on affiche 0

MPY A, B           # A = A * B
DIV C, D           # C = C / D
ADD A, C           # A = A * B + C / D
WRITE A
END
NUL: WRITE ZERO
     END
```

Avec a = 3, b = 4, c = 10, d = 2 : `A = 17`. Avec d = 0 : `ZERO = 0`.

### 3 adresses

```text
MODE 3
DATA ZERO, 0
READ A
READ B
READ C
READ D

ADD D, ZERO, T     # T = D : le registre drapeau reçoit D
BEZ NUL            # D = 0 : on affiche 0

MPY A, B, P        # P = A * B
DIV C, D, Q        # Q = C / D
ADD P, Q, Z        # Z = A * B + C / D
WRITE Z
END
NUL: WRITE ZERO
     END
```

Avec a = 3, b = 4, c = 10, d = 2 : `Z = 17`. Avec d = 0 : `ZERO = 0`.

## 5. Trier trois nombres (0, 1, 2 et 3 adresses)

Classer les nombres de façon que le plus grand soit dans A, le suivant dans B et le plus petit dans C. Méthode : trois échanges conditionnels, dans l'ordre (A, B), puis (B, C), puis (A, B). Chaque étape compare par une soustraction, saute par-dessus l'échange si les deux valeurs sont déjà dans l'ordre, et échange sinon.

Il n'y a pas de sous-programme dans le langage : l'échange est écrit à chaque étape. Il se fait par une variable auxiliaire `X` (0, 1 et 2 adresses) ou, à 3 adresses, par trois opérations `ADD` et `SUB` (A ← a + b, B ← A − b = a, A ← A − B = b).

### 0 adresse (pile)

```text
MODE 0
READ A
READ B
READ C

# Étape 1 : si B > A, échanger A et B
PUSH B
PUSH A
SUB                # B - A
POP T              # POP ne modifie pas le registre drapeau
BLE L1
PUSH A
PUSH B
POP A
POP B

# Étape 2 : si C > B, échanger B et C
L1: PUSH C
    PUSH B
    SUB
    POP T
    BLE L2
    PUSH B
    PUSH C
    POP B
    POP C

# Étape 3 : si B > A, échanger A et B
L2: PUSH B
    PUSH A
    SUB
    POP T
    BLE L3
    PUSH A
    PUSH B
    POP A
    POP B

L3: WRITE A
    WRITE B
    WRITE C
    END
```

Avec 5, 9, 2 en saisie :

```text
A = 9
B = 5
C = 2
```

### 1 adresse (accumulateur)

```text
MODE 1
READ A
READ B
READ C

# Étape 1 : si B > A, échanger A et B
LOAD B
SUB A              # B - A
BLE L1
LOAD A
STORE X
LOAD B
STORE A
LOAD X
STORE B

# Étape 2 : si C > B, échanger B et C
L1: LOAD C
    SUB B
    BLE L2
    LOAD B
    STORE X
    LOAD C
    STORE B
    LOAD X
    STORE C

# Étape 3 : si B > A, échanger A et B
L2: LOAD B
    SUB A
    BLE L3
    LOAD A
    STORE X
    LOAD B
    STORE A
    LOAD X
    STORE B

L3: WRITE A
    WRITE B
    WRITE C
    END
```

Avec 5, 9, 2 en saisie :

```text
A = 9
B = 5
C = 2
```

### 2 adresses

```text
MODE 2
READ A
READ B
READ C

# Étape 1 : si B > A, échanger A et B
SUB T, T
ADD T, B
SUB T, A           # T = B - A
BLE L1
SUB X, X           # échange par la variable X
ADD X, A
SUB A, A
ADD A, B
SUB B, B
ADD B, X

# Étape 2 : si C > B, échanger B et C
L1: SUB T, T
    ADD T, C
    SUB T, B
    BLE L2
    SUB X, X
    ADD X, B
    SUB B, B
    ADD B, C
    SUB C, C
    ADD C, X

# Étape 3 : si B > A, échanger A et B
L2: SUB T, T
    ADD T, B
    SUB T, A
    BLE L3
    SUB X, X
    ADD X, A
    SUB A, A
    ADD A, B
    SUB B, B
    ADD B, X

L3: WRITE A
    WRITE B
    WRITE C
    END
```

Avec 5, 9, 2 en saisie :

```text
A = 9
B = 5
C = 2
```

### 3 adresses

```text
MODE 3
READ A
READ B
READ C

# Étape 1 : si B > A, échanger A et B
SUB B, A, T        # T = B - A, A et B ne sont pas modifiés
BLE L1
ADD A, B, A        # échange sans variable auxiliaire
SUB A, B, B
SUB A, B, A

# Étape 2 : si C > B, échanger B et C
L1: SUB C, B, T
    BLE L2
    ADD B, C, B
    SUB B, C, C
    SUB B, C, B

# Étape 3 : si B > A, échanger A et B
L2: SUB B, A, T
    BLE L3
    ADD A, B, A
    SUB A, B, B
    SUB A, B, A

L3: WRITE A
    WRITE B
    WRITE C
    END
```

Avec 5, 9, 2 en saisie :

```text
A = 9
B = 5
C = 2
```
