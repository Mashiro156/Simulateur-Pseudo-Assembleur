/* Fichier généré par tools/build-samples.js à partir de docs/exemples.md : ne pas modifier à la main. */
(function (root) {
  'use strict';
  const samples = [
  {
    "id": "s1",
    "label": "1. Premier programme (3 adresses)",
    "source": "MODE 3\nDATA A, 15\nDATA B, 10\n\nADD A, B, X      # X reçoit A + B\nWRITE X\nEND\n"
  },
  {
    "id": "s2",
    "label": "2. Boucle : somme de N à 1 (1 adresse)",
    "source": "MODE 1\nDATA N, 4\nDATA UN, 1\nDATA SOMME, 0\n\nLOAD N\nSTORE COMPTEUR\nBOUCLE: LOAD SOMME\n        ADD COMPTEUR\n        STORE SOMME\n        LOAD COMPTEUR\n        SUB UN\n        STORE COMPTEUR     # STORE ne modifie pas le registre drapeau\n        BGT BOUCLE         # teste le résultat du SUB\nWRITE SOMME\nEND\n"
  },
  {
    "id": "s3",
    "label": "3. Plus grand de deux nombres (2 adresses)",
    "source": "MODE 2\nDATA ZERO, 0\nREAD X\nREAD Y\n\nSUB T, T\nADD T, X\nSUB T, Y           # T = x − y : le registre drapeau reçoit x − y\nBEZ EGAUX          # égaux : on affiche 0\nBGT XGRAND         # x > y\nWRITE Y            # sinon y est le plus grand\nEND\nXGRAND: WRITE X\n        END\nEGAUX:  WRITE ZERO\n        END\n"
  },
  {
    "id": "s4",
    "label": "4. Expression Z = A × B + C ÷ D — 0 adresse (pile)",
    "source": "MODE 0\nDATA ZERO, 0\nREAD A\nREAD B\nREAD C\nREAD D\n\nPUSH D\nPUSH ZERO\nADD                # D + 0 : le registre drapeau reçoit D\nPOP T\nBEZ NUL            # D = 0 : on affiche 0\n\nPUSH A\nPUSH B\nMPY                # A * B\nPUSH C\nPUSH D\nDIV                # C / D\nADD                # A * B + C / D\nPOP Z\nWRITE Z\nEND\nNUL: WRITE ZERO\n     END\n"
  },
  {
    "id": "s5",
    "label": "4. Expression Z = A × B + C ÷ D — 1 adresse (accumulateur)",
    "source": "MODE 1\nDATA ZERO, 0\nREAD A\nREAD B\nREAD C\nREAD D\n\nLOAD D\nADD ZERO           # AC reçoit D + 0 : le registre drapeau reçoit D\nBEZ NUL            # D = 0 : on affiche 0\n\nLOAD A\nMPY B\nSTORE P            # P = A * B\nLOAD C\nDIV D\nADD P              # AC = C / D + A * B\nSTORE Z\nWRITE Z\nEND\nNUL: WRITE ZERO\n     END\n"
  },
  {
    "id": "s6",
    "label": "4. Expression Z = A × B + C ÷ D — 2 adresses",
    "source": "MODE 2\nDATA ZERO, 0\nREAD A\nREAD B\nREAD C\nREAD D\n\nSUB T, T           # T = 0\nADD T, D           # T = D : le registre drapeau reçoit D\nBEZ NUL            # D = 0 : on affiche 0\n\nMPY A, B           # A = A * B\nDIV C, D           # C = C / D\nADD A, C           # A = A * B + C / D\nWRITE A\nEND\nNUL: WRITE ZERO\n     END\n"
  },
  {
    "id": "s7",
    "label": "4. Expression Z = A × B + C ÷ D — 3 adresses",
    "source": "MODE 3\nDATA ZERO, 0\nREAD A\nREAD B\nREAD C\nREAD D\n\nADD D, ZERO, T     # T = D : le registre drapeau reçoit D\nBEZ NUL            # D = 0 : on affiche 0\n\nMPY A, B, P        # P = A * B\nDIV C, D, Q        # Q = C / D\nADD P, Q, Z        # Z = A * B + C / D\nWRITE Z\nEND\nNUL: WRITE ZERO\n     END\n"
  },
  {
    "id": "s8",
    "label": "5. Trier trois nombres — 0 adresse (pile)",
    "source": "MODE 0\nREAD A\nREAD B\nREAD C\n\n# Étape 1 : si B > A, échanger A et B\nPUSH B\nPUSH A\nSUB                # B - A\nPOP T              # POP ne modifie pas le registre drapeau\nBLE L1\nPUSH A\nPUSH B\nPOP A\nPOP B\n\n# Étape 2 : si C > B, échanger B et C\nL1: PUSH C\n    PUSH B\n    SUB\n    POP T\n    BLE L2\n    PUSH B\n    PUSH C\n    POP B\n    POP C\n\n# Étape 3 : si B > A, échanger A et B\nL2: PUSH B\n    PUSH A\n    SUB\n    POP T\n    BLE L3\n    PUSH A\n    PUSH B\n    POP A\n    POP B\n\nL3: WRITE A\n    WRITE B\n    WRITE C\n    END\n"
  },
  {
    "id": "s9",
    "label": "5. Trier trois nombres — 1 adresse (accumulateur)",
    "source": "MODE 1\nREAD A\nREAD B\nREAD C\n\n# Étape 1 : si B > A, échanger A et B\nLOAD B\nSUB A              # B - A\nBLE L1\nLOAD A\nSTORE X\nLOAD B\nSTORE A\nLOAD X\nSTORE B\n\n# Étape 2 : si C > B, échanger B et C\nL1: LOAD C\n    SUB B\n    BLE L2\n    LOAD B\n    STORE X\n    LOAD C\n    STORE B\n    LOAD X\n    STORE C\n\n# Étape 3 : si B > A, échanger A et B\nL2: LOAD B\n    SUB A\n    BLE L3\n    LOAD A\n    STORE X\n    LOAD B\n    STORE A\n    LOAD X\n    STORE B\n\nL3: WRITE A\n    WRITE B\n    WRITE C\n    END\n"
  },
  {
    "id": "s10",
    "label": "5. Trier trois nombres — 2 adresses",
    "source": "MODE 2\nREAD A\nREAD B\nREAD C\n\n# Étape 1 : si B > A, échanger A et B\nSUB T, T\nADD T, B\nSUB T, A           # T = B - A\nBLE L1\nSUB X, X           # échange par la variable X\nADD X, A\nSUB A, A\nADD A, B\nSUB B, B\nADD B, X\n\n# Étape 2 : si C > B, échanger B et C\nL1: SUB T, T\n    ADD T, C\n    SUB T, B\n    BLE L2\n    SUB X, X\n    ADD X, B\n    SUB B, B\n    ADD B, C\n    SUB C, C\n    ADD C, X\n\n# Étape 3 : si B > A, échanger A et B\nL2: SUB T, T\n    ADD T, B\n    SUB T, A\n    BLE L3\n    SUB X, X\n    ADD X, A\n    SUB A, A\n    ADD A, B\n    SUB B, B\n    ADD B, X\n\nL3: WRITE A\n    WRITE B\n    WRITE C\n    END\n"
  },
  {
    "id": "s11",
    "label": "5. Trier trois nombres — 3 adresses",
    "source": "MODE 3\nREAD A\nREAD B\nREAD C\n\n# Étape 1 : si B > A, échanger A et B\nSUB B, A, T        # T = B - A, A et B ne sont pas modifiés\nBLE L1\nADD A, B, A        # échange sans variable auxiliaire\nSUB A, B, B\nSUB A, B, A\n\n# Étape 2 : si C > B, échanger B et C\nL1: SUB C, B, T\n    BLE L2\n    ADD B, C, B\n    SUB B, C, C\n    SUB B, C, B\n\n# Étape 3 : si B > A, échanger A et B\nL2: SUB B, A, T\n    BLE L3\n    ADD A, B, A\n    SUB A, B, B\n    SUB A, B, A\n\nL3: WRITE A\n    WRITE B\n    WRITE C\n    END\n"
  }
];
  if (typeof module === 'object' && module.exports) module.exports = samples;
  else (root.V8086 = root.V8086 || {}).samples = samples;
})(typeof window !== 'undefined' ? window : globalThis);
