# Assets 3D

**Le jeu n'utilise aucun modèle 3D externe.** Tous les personnages et tous les décors sont dessinés en code :

- personnages : `apps/client/src/game/render/rig.ts` (squelette humanoïde, têtes, tenues, queues) et `visuals.ts` (une fiche par personnage) ;
- décors : `apps/client/src/game/render/arenas/` (`scenery.ts` pour les éléments, `specs.ts` pour les 12 ambiances, `ThemedArena.tsx` pour le rendu, `Arena.tsx` pour le dojo) ;
- poses et chorégraphies : `apps/client/src/game/render/pose.ts`.

## Packs téléchargés précédemment (non utilisés)

Les packs Quaternius (CC0) reçus pendant la session 4 (animaux, Universal Base Characters, Modular Sci-Fi MegaKit, Stylized Nature MegaKit, Animated Robot, Universal Animation Library 2) et KayKit Character Animations 1.2 (CC0) sont dans `assets/incoming/` et `assets/extracted/`. Ces dossiers sont ignorés par git et peuvent être supprimés.

L'historique git (commit `2c3cfee`) contient une version du jeu qui chargeait ces modèles, si on veut y revenir.
