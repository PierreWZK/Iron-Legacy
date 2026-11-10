# Assets 3D : inventaire

Fichiers bruts dans `assets/incoming/` (zips, non versionnés) et `assets/extracted/` (non versionné). Les chemins suivants sont relatifs à `assets/extracted/`.

## Reçus

### Ultimate Animated Animals (Quaternius, CC0)
Dossier : `Ultimate_Animated_Animals_-_July_2021-.../Ultimate Animated Animals - July 2021/glTF/`

| Fichier | Clips d'animation |
|---|---|
| Wolf.gltf, Fox.gltf, Husky.gltf, ShibaInu.gltf | Attack, Death, Eating, Gallop, Gallop_Jump, Idle, Idle_2, Idle_2_HeadLow, Idle_HitReact1, Idle_HitReact2, Jump_ToIdle, Walk |
| Stag.gltf, Bull.gltf, Deer.gltf, Cow.gltf, Alpaca.gltf, Donkey.gltf, Horse.gltf, Horse_White.gltf | Attack_Headbutt, Attack_Kick, Death, Eating, Gallop, Gallop_Jump, Idle, Idle_2, Idle_Headlow, Idle_HitReact1, Idle_HitReact2, Jump_toIdle, Walk |

- Squelette : armature d'animal propre à chaque fichier (pas le même que les humanoïdes).
- Pas de pack robot ni d'ours dans ce dossier.

### Universal Base Characters (Quaternius, CC0)
Dossier : `Universal_Base_Characters_Standard_/.../Base Characters/Godot - UE/`
- `Superhero_Male_FullBody.gltf`, `Superhero_Female_FullBody.gltf` : humanoïdes, **0 animation**. Squelette avec noms `upperarm_l`, `thigh_r`, `spine_01`… (Unreal-like).
- Coiffures et sourcils en glTF séparés (`Hair_*.gltf`, `Eyebrows_*.gltf`).

### Modular Sci-Fi MegaKit (Quaternius, CC0)
Dossier : `Modular_SciFi_MegaKit_Standard_/.../FBX/` (et glTF si présent). Modules de labo : colonnes, décalcomanies, aliens (statiques), portes, murs, sols. Format de travail : FBX à convertir en glTF.

### KayKit Character Animations 1.2 (CC0)
Fichier : `kaykit_character_animations_1.2/Animations/gltf/KayKit_AnimatedCharacter_v1.2.glb`
- 30 clips humanoïdes : Attack(1h), AttackCombo, AttackSpinning, HeavyAttack, Block, Defeat, Roll, DashFront/Back/Left/Right, Hop, Jump, Idle, Walk, Run, Cheer, Wave…
- **Squelette incompatible** avec Universal Base Characters : seulement 8 nœuds (Body, armLeft, armRight, handSlot…). Pas utilisable tel quel sur les humanoïdes Quaternius.
- Non demandé au départ : gardé pour référence.

## Manquants (à télécharger)

| Pack | Pourquoi | Lien |
|---|---|---|
| Universal Animation Library (1 ou 2) | Animations humanoïdes pour Universal Base Characters (coups de poing, de pied, réactions) | https://quaternius.com/packs/universalanimationlibrary2.html |
| Animated Robot Pack | Robot du roster (FBX seulement, à convertir) | https://quaternius.com/packs/animatedrobot.html |
| Stylized Nature MegaKit | Décors forêt | https://quaternius.com/packs/stylizednaturemegakit.html |

## Décisions à prendre après ces téléchargements
- Humanoïdes : animations de la Universal Animation Library (même armature que Universal Base Characters).
- Animaux : animations Attack / Attack_Kick / Attack_Headbutt / Death / HitReact du pack Animaux.
- Conversion FBX vers glTF : outil à choisir (Blender en ligne de commande ou `fbx2gltf`).
