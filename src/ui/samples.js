/* Fichier généré par tools/build-samples.js à partir de docs/exemples.md : ne pas modifier à la main. */
(function (root) {
  'use strict';
  const samples = [
  {
    "id": "s1",
    "label": "1. Branchements conditionnels (BGT)",
    "source": "MODE 1\nDATA A, 15\nDATA B, 10\nDATA ZERO, 0\nDATA UN, 1\n\nLOAD A                # AC reçoit A (15)\nSUB B                 # AC reçoit 15 − 10 = 5 : le registre drapeau reçoit 5\nBGT EST_POSITIF       # 5 > 0 : saut à EST_POSITIF\n\nLOAD ZERO             # cette partie est ignorée en cas de saut\nSTORE RESULTAT\nBR FIN\n\nEST_POSITIF: LOAD UN\nSTORE RESULTAT        # RESULTAT reçoit 1 : A est plus grand que B\nFIN: WRITE RESULTAT\nEND\n"
  },
  {
    "id": "s2",
    "label": "2. Format 3 adresses (destination à la fin)",
    "source": "MODE 3\nDATA A, 10\nDATA B, 5\nDATA TROIS, 3\nDATA DEUX, 2\n\nADD A, B, T1          # T1 reçoit A + B = 15\nSUB T1, TROIS, T2     # T2 reçoit T1 − 3 = 12\nMPY T1, T2, X         # X reçoit T1 × T2 = 180\nDIV X, DEUX, RES      # RES reçoit X ÷ 2 = 90\nWRITE RES\nEND\n"
  },
  {
    "id": "s3",
    "label": "3. Format 0 adresse (pile)",
    "source": "MODE 0\nDATA A, 10\nDATA B, 5\nDATA C, 3\n\nPUSH A                # empile A (10)\nPUSH B                # empile B (5)\nADD                   # dépile 5 et 10, empile 15\nPUSH C                # empile C (3)\nMPY                   # dépile 3 et 15, empile 45\nPOP RES               # dépile dans RES\nWRITE RES\nEND\n"
  },
  {
    "id": "s4",
    "label": "4. Boucle de décompte (BEZ, BR)",
    "source": "MODE 1\nDATA N, 4\nDATA UN, 1\nDATA ZERO, 0\n\nLOAD N\nSTORE COMPTEUR        # COMPTEUR reçoit N (4)\nLOAD ZERO\nSTORE SOMME           # SOMME reçoit 0\n\nBOUCLE: LOAD COMPTEUR\n        SUB ZERO      # le registre drapeau reçoit COMPTEUR\n        BEZ FIN       # COMPTEUR = 0 : sortie de la boucle\n        LOAD SOMME\n        ADD COMPTEUR\n        STORE SOMME   # SOMME reçoit SOMME + COMPTEUR\n        LOAD COMPTEUR\n        SUB UN\n        STORE COMPTEUR\n        BR BOUCLE     # retour au début de la boucle\nFIN:    LOAD SOMME\n        STORE RES     # RES contient la somme totale\n        WRITE RES\n        END\n"
  },
  {
    "id": "s5",
    "label": "5. Format 1 adresse (accumulateur)",
    "source": "MODE 1\nDATA A, 10\nDATA B, 5\nDATA C, 3\n\nLOAD A                # AC reçoit 10\nSUB B                 # AC reçoit 10 − 5 = 5\nMPY C                 # AC reçoit 5 × 3 = 15\nSTORE RES             # RES reçoit 15\nWRITE RES\nEND\n"
  }
];
  if (typeof module === 'object' && module.exports) module.exports = samples;
  else (root.V8086 = root.V8086 || {}).samples = samples;
})(typeof window !== 'undefined' ? window : globalThis);
