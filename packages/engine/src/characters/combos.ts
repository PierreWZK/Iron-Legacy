import { BASE_MOVES } from './baseMoves';
import type { BaseMoveId, CharacterDef, ComboDef, ComboMoveId, ComboTier, Limb, MoveDef, MoveId } from './types';

/**
 * Combos de chaque personnage.
 *
 * 1. Triple appui (`lp lp lp`, `rk rk rk`…) : trois coups, boutons mélangeables (huit coups `lp2`…`rk3`).
 * 2. Spéciaux après un double appui vers l'avant : `ff+rp` roulade offensive, `ff+rk` projection.
 * 3. Vingt combos par personnage au total (7 faciles, 7 moyens, 6 difficiles), générés de façon déterministe
 *    d'après son style : directions (avant, arrière, bas, haut), longueurs de 3 à 10 entrées, noms propres.
 *
 * Les entrées s'écrivent `lp`, `f+rk`, `df+rp`, `u+lk`, `ff+lp` (voir `ComboDef`).
 */
export type ComboStyle = 'karate' | 'boxer' | 'feral' | 'heavy' | 'ninja' | 'judo' | 'shadow' | 'mech' | 'kick';

const CHAIN_IDS = ['lp2', 'lp3', 'rp2', 'rp3', 'lk2', 'lk3', 'rk2', 'rk3'] as const satisfies readonly MoveId[];

interface StyleDef {
  /** Animation et nom de chacun des 8 coups, dans l'ordre de CHAIN_IDS. */
  limbs: readonly Limb[];
  labels: readonly string[];
  /** Multiplicateurs de rythme (frames) et de puissance par rapport au personnage. */
  speed: number;
  power: number;
  /** Part de coups de pied dans les combos générés (0 à 1). */
  kicks: number;
  /** Noms des spéciaux à double appui avant : roulade (+ poing droit) et projection (+ pied droit). */
  roll: string;
  grab: string;
  grabLimb: Limb;
  /** Compléments de nom des combos générés (« Rafale du dragon »). */
  of: readonly string[];
}

const STYLES: Record<ComboStyle, StyleDef> = {
  karate: {
    limbs: ['punchR', 'hook', 'punchL', 'uppercut', 'kickR', 'sideKick', 'kickL', 'spinKick'],
    labels: ['Double direct', 'Crochet du maître', 'Revers rapide', 'Montée du dragon', 'Double pied', 'Latéral final', 'Circulaire gauche', 'Tourbillon'],
    speed: 1, power: 1,
    kicks: 0.5, roll: 'Roulade du lotus', grab: 'Prise du maître', grabLimb: 'hipToss',
    of: ['du dragon', 'du maître', 'du dojo', 'de la grue', 'du tigre', 'du lotus', "de l'aube", 'de jade', 'du temple', 'de la montagne', 'du serpent', 'de la lune', "de l'empereur", 'du bambou', 'de la cascade', 'du samouraï'],
  },
  boxer: {
    limbs: ['punchR', 'uppercut', 'hook', 'risingHook', 'kickR', 'knee', 'kickL', 'kickR'],
    labels: ['Un-deux', 'Montée de boxe', 'Crochet du gauche', 'Crochet ascendant', 'Pied-poing', 'Genou de pression', 'Fouet gauche', 'Fouet final'],
    speed: 0.85, power: 0.95,
    kicks: 0.15, roll: 'Esquive roulée', grab: 'Prise de clinch', grabLimb: 'throw',
    of: ['du ring', 'du champion', "de l'arène", 'du poids lourd', 'de la cloche', 'du challenger', 'de fer', 'du knock-out', 'de la dernière reprise', 'du coin rouge', 'de la ceinture', "du gant d'or", 'de la foule', 'du sparring', 'du crochet', 'du vestiaire'],
  },
  feral: {
    limbs: ['hook', 'elbow', 'elbow', 'backFist', 'knee', 'axe', 'kickL', 'spinKick'],
    labels: ['Griffe', 'Coup de coude féroce', 'Morsure', 'Revers sauvage', 'Coup de genou', 'Coup de hache', 'Ruade', 'Ruade tournante'],
    speed: 1, power: 1.1,
    kicks: 0.45, roll: 'Bond de la meute', grab: 'Gueule du loup', grabLimb: 'suplex',
    of: ['de la meute', 'du loup', 'de la forêt', 'des crocs', 'du chasseur', 'de la nuit', 'de la bête', 'des griffes', 'du sang', 'de la lune rousse', 'de la tanière', 'du prédateur', 'de la traque', "de l'orage", 'des ronces', 'du sentier'],
  },
  heavy: {
    limbs: ['hook', 'elbow', 'elbow', 'uppercut', 'knee', 'axe', 'kickR', 'axe'],
    labels: ['Coup de masse', 'Coude écrasant', 'Marteau', 'Uppercut de taureau', 'Genou lourd', 'Hache', 'Coup de pied écrasant', 'Piétinement'],
    speed: 1.2, power: 1.2,
    kicks: 0.35, roll: 'Roulé-boulé du colosse', grab: 'Étau du titan', grabLimb: 'throw',
    of: ['du titan', 'de la forge', 'de la montagne', 'de plomb', 'du colosse', 'du bélier', "de l'enclume", 'de pierre', 'du géant', "de l'écrasement", 'du taureau', 'du mur', 'du bûcheron', 'de fonte', 'du roc', 'de la charge'],
  },
  ninja: {
    limbs: ['punchR', 'backFist', 'backFist', 'spinKick', 'kickR', 'spinKick', 'sideKick', 'spinKick'],
    labels: ['Kunaï double', "Revers de l'ombre", 'Lame arrière', 'Vrille', 'Pied de vent', 'Tourbillon final', 'Faucille', 'Lame du vent'],
    speed: 0.8, power: 0.9,
    kicks: 0.6, roll: "Roulade de l'ombre", grab: 'Prise du serpent', grabLimb: 'legThrow',
    of: ["de l'ombre", 'du vent', 'de la lame', 'des toits', 'du kunaï', 'de la brume', 'du clan', 'de la nuit', 'du faucon', 'du lotus noir', 'du silence', "de l'éclair", 'du fantôme', 'de la lune', 'du dragon noir', 'du sabre'],
  },
  judo: {
    limbs: ['punchR', 'elbow', 'elbow', 'hook', 'kickR', 'knee', 'sideKick', 'axe'],
    labels: ['Frappe de main', 'Coude de judo', 'Pression', 'Crochet de col', 'Fauchage', 'Genou de hanche', 'Balayage latéral', 'Hache de judo'],
    speed: 1.05, power: 1.05,
    kicks: 0.4, roll: 'Roulade de tatami', grab: 'Projection du sensei', grabLimb: 'hipToss',
    of: ['du tatami', 'de la ceinture noire', 'du sensei', 'de la hanche', 'du col', "de l'équilibre", "de l'eau", 'du dojo', 'de la prise', 'de la chute', 'du kimono', "de l'arbitre", 'du poids', "de l'élan", 'du souple', 'de la voie'],
  },
  shadow: {
    limbs: ['punchR', 'backFist', 'punchL', 'risingHook', 'kickR', 'axe', 'sideKick', 'spinKick'],
    labels: ['Riposte double', 'Revers fantôme', 'Contre-poing', "Montée de l'ombre", 'Pied fantôme', 'Chute de hache', 'Contre latéral', 'Dernier contre'],
    speed: 0.9, power: 1,
    kicks: 0.5, roll: 'Roulade du spectre', grab: "Prise de l'ombre", grabLimb: 'legThrow',
    of: ['du reflet', 'du double', 'du contre', "de l'écho", 'du miroir', "de l'éclipse", 'du spectre', 'de minuit', 'du voile', 'du silence', 'de la brume', 'du revenant', 'du crépuscule', 'du néant', 'du fantôme', "de l'ombre"],
  },
  mech: {
    limbs: ['punchR', 'elbow', 'punchL', 'hook', 'kickR', 'knee', 'kickL', 'axe'],
    labels: ['Piston double', 'Coude hydraulique', 'Piston gauche', 'Crochet mécanique', 'Frappe de pied', 'Genou renforcé', 'Balayage du vérin', 'Marteau final'],
    speed: 1, power: 1,
    kicks: 0.4, roll: 'Roulade blindée', grab: 'Pince hydraulique', grabLimb: 'suplex',
    of: ['du piston', 'du vérin', "de l'acier", 'du circuit', 'du réacteur', "de l'engrenage", 'du serveur', 'du plasma', 'du laser', 'du turbo', 'de la presse', 'du boulon', 'de la chaîne', 'du processeur', 'du moteur', 'de la surcharge'],
  },
  kick: {
    limbs: ['punchR', 'elbow', 'punchL', 'hook', 'kickR', 'axe', 'sideKick', 'spinKick'],
    labels: ['Direct bref', 'Coude rapide', 'Revers court', 'Crochet', 'Double coup de pied', 'Coup de hache', 'Latéral rapide', 'Tournant royal'],
    speed: 0.95, power: 1,
    kicks: 0.8, roll: 'Roulade acrobate', grab: 'Prise de cheville', grabLimb: 'legThrow',
    of: ['du talon', 'du tonnerre', 'de la danse', 'du cyclone', "de l'éclair", 'du sprint', 'du ressort', "de l'acrobate", 'de la pointe', 'du vent', 'du dragon', 'du saut', "de l'orbite", 'de la roue', 'du champion', 'de la cadence'],
  },
};

/** Style de combo de chaque personnage (les robots du mode robots y compris). */
export const COMBO_STYLE: Record<string, ComboStyle> = {
  kairo: 'karate', vera: 'boxer', wolf: 'feral', fox: 'ninja', bull: 'heavy', stag: 'kick', husky: 'feral', robot: 'mech',
  shin: 'ninja', brutus: 'heavy', akira: 'judo', nyx: 'shadow', titan: 'mech',
  scout: 'boxer', guardian: 'heavy', assassin: 'ninja', heavy: 'heavy', elite: 'karate',
};

// ---------------------------------------------------------------------------------------------
// Entrées et coups modèles
// ---------------------------------------------------------------------------------------------

/** Coup modèle de chaque entrée (la même table sert aux ouvertures et aux coups d'enchaînement). */
const TEMPLATE: Record<string, BaseMoveId> = {
  lp: 'jab', rp: 'cross', lk: 'frontKick', rk: 'roundhouse',
  'f+lp': 'lunge', 'f+rp': 'elbow', 'f+lk': 'kneeLift', 'f+rk': 'axeKick',
  'b+rp': 'backFist', 'b+lk': 'sideKick', 'b+rk': 'spinKick',
  'd+lp': 'lowJab', 'd+rp': 'uppercut', 'd+lk': 'lowKick', 'd+rk': 'sweep',
  'df+lp': 'hookPunch', 'df+rp': 'risingHook', 'df+lk': 'slideKick', 'df+rk': 'dragonKick',
  'u+lp': 'risingHook', 'u+rp': 'uppercut', 'u+lk': 'kneeLift', 'u+rk': 'dragonKick',
  'db+lp': 'backFist', 'db+rp': 'backFist', 'db+lk': 'sideKick', 'db+rk': 'spinKick',
  'ff+lp': 'dashLP', 'ff+rp': 'dashRP', 'ff+lk': 'dashLK', 'ff+rk': 'dashRK',
};

/** Ouvertures utilisables par les combos générés (coups qui ne font pas tomber l'adversaire). */
const OPENERS = ['lp', 'rp', 'lk', 'rk', 'f+lp', 'b+rp', 'b+lk', 'd+lp', 'd+lk', 'df+lp', 'ff+lp', 'ff+lk'];
/** Coups intermédiaires. */
const MIDS = ['lp', 'rp', 'lk', 'rk', 'f+lp', 'f+rp', 'f+lk', 'b+rp', 'b+lk', 'd+lp', 'd+lk', 'df+lp', 'db+lk', 'u+lp'];
/** Coups finaux (font tomber ou lancent l'adversaire). */
const FINISHERS = ['rk', 'rp', 'f+rk', 'f+rp', 'b+rk', 'd+rk', 'd+rp', 'df+rk', 'df+rp', 'u+rk', 'u+rp', 'db+rk'];

const isKick = (t: string): boolean => t.endsWith('lk') || t.endsWith('rk');
const isPlain = (t: string): boolean => !t.includes('+');

const PUNCH_NOUNS = ['Rafale', 'Marteau', 'Pluie de coups', 'Fureur', 'Série', 'Déluge', 'Frappe', 'Salve', 'Assaut', 'Combinaison', 'Enchaînement', 'Poigne', 'Orage', 'Brasier', 'Choc', 'Percée'];
const KICK_NOUNS = ['Tempête', 'Cyclone', 'Faucheuse', 'Éclair', 'Tourbillon', 'Ouragan', 'Danse', 'Fouet', 'Chute', 'Spirale', 'Vague', 'Foudre', 'Vrille', 'Écrasement', 'Moulinet', 'Salto'];

const PUNCH_LIMBS: readonly Limb[] = ['punchL', 'punchR', 'hook', 'backFist', 'elbow', 'uppercut', 'risingHook'];
const KICK_LIMBS: readonly Limb[] = ['kickL', 'kickR', 'knee', 'axe', 'sideKick', 'spinKick'];
const LIMB_NAMES: Partial<Record<Limb, string>> = {
  punchL: 'Direct gauche', punchR: 'Direct droit', hook: 'Crochet', backFist: 'Revers', elbow: 'Coude', uppercut: 'Uppercut',
  risingHook: 'Crochet ascendant', kickL: 'Pied gauche', kickR: 'Pied droit', knee: 'Genou', axe: 'Coup de hache',
  sideKick: 'Latéral', spinKick: 'Tournant',
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Séquences déjà prises par un autre personnage : chaque personnage a ses propres combos longs. */
const taken = new Set<string>();

/** Entrées effectives d'une séquence (un double appui avant compte pour trois entrées). */
export function inputCount(inputs: readonly string[]): number {
  return inputs.reduce((n, t) => n + (t.startsWith('ff+') ? 3 : 1), 0);
}

function makeSequence(rng: () => number, tier: ComboTier, kickShare: number): string[] {
  const [lo, hi] = tier === 'easy' ? [3, 4] : tier === 'medium' ? [5, 6] : [8, 10];
  const pick = (list: string[]): string => {
    const w = list.map((t) => (isKick(t) ? kickShare + 0.15 : 1 - kickShare + 0.15));
    let r = rng() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) {
      r -= w[i]!;
      if (r <= 0) return list[i]!;
    }
    return list[list.length - 1]!;
  };
  for (let attempt = 0; attempt < 60; attempt++) {
    const len = lo + Math.floor(rng() * (hi - lo + 1));
    const seq = [pick(OPENERS)];
    const presses = () => inputCount(seq);
    while (presses() < len - 1) {
      const dirOnly = seq.length === 1 && isPlain(seq[0]!);
      let t = pick(dirOnly ? MIDS.filter((x) => !isPlain(x)) : MIDS);
      if (t === seq[seq.length - 1] && t === seq[seq.length - 2]) t = pick(MIDS.filter((x) => x !== t));
      seq.push(t);
    }
    let fin = pick(FINISHERS);
    if (fin === seq[seq.length - 1]) fin = pick(FINISHERS.filter((x) => x !== fin));
    seq.push(fin);
    // Un opener simple suivi d'un coup simple est réservé au triple appui (voir `chain`).
    if (isPlain(seq[0]!) && isPlain(seq[1]!)) continue;
    const dirs = new Set(seq.filter((t) => !isPlain(t)).map((t) => t.split('+')[0]!));
    if (tier === 'medium' && dirs.size < 1) continue;
    if (tier === 'hard' && (dirs.size < 2 || seq.filter((t) => !isPlain(t)).length < 3)) continue;
    if (inputCount(seq) > hi || inputCount(seq) < lo) continue;
    if (new Set(seq).size < Math.min(seq.length, tier === 'easy' ? 3 : tier === 'medium' ? 4 : 6)) continue;
    const key = seq.join(' ');
    if (taken.has(key)) continue;
    taken.add(key);
    return seq;
  }
  // Repli : une séquence valide même si elle recoupe celle d'un autre personnage.
  return tier === 'easy' ? ['f+lp', 'rp', 'f+rk'] : tier === 'medium' ? ['df+lp', 'rp', 'lk', 'b+rp', 'f+rk'] : ['lp', 'f+rp', 'lk', 'd+lp', 'rk', 'b+lk', 'rp', 'df+lp', 'f+rk'];
}

interface Node {
  id: MoveId;
  /** Le coup est la fin d'au moins un combo. */
  last: boolean;
  tier: ComboTier;
  next: Map<string, Node>;
}

/** Ajoute à un personnage ses combos, réglés d'après sa vitesse (jab) et sa puissance (direct). */
export function withCombos(def: CharacterDef): CharacterDef {
  const style = STYLES[COMBO_STYLE[def.id] ?? 'karate'];
  const speedK = (def.moves.jab.startup / BASE_MOVES.jab.startup) * style.speed;
  const powerK = Math.min(2, Math.max(0.6, (def.moves.cross.damage / BASE_MOVES.cross.damage) * style.power));
  const moves = { ...def.moves } as CharacterDef['moves'];

  // 1. Triple appui : huit coups `lp2`…`rk3`.
  CHAIN_IDS.forEach((id, i) => {
    const base: MoveDef = BASE_MOVES[id];
    moves[id] = {
      ...base,
      label: style.labels[i]!,
      limb: style.limbs[i]!,
      startup: Math.max(3, Math.round(base.startup * speedK)),
      recovery: Math.max(6, Math.round(base.recovery * (0.7 + 0.3 * speedK))),
      damage: Math.max(2, Math.round(base.damage * powerK)),
    };
  });

  // 2. Spéciaux du double appui avant et coups depuis le sol : réglés par personnage.
  const tune = (id: BaseMoveId, patch: Partial<MoveDef>): void => {
    const base = def.moves[id] ?? BASE_MOVES[id];
    moves[id] = {
      ...base,
      startup: Math.max(4, Math.round(base.startup * (0.6 + 0.4 * speedK))),
      damage: Math.max(2, Math.round(base.damage * powerK)),
      ...patch,
    };
  };
  tune('dashLP', {});
  tune('dashLK', {});
  tune('dashRP', { label: style.roll });
  tune('dashRK', { label: style.grab, limb: style.grabLimb });
  tune('wakeKick', {});
  tune('wakeSweep', {});

  // 3. Combos générés : arbre d'entrées → coups. Les noeuds partagent leurs préfixes.
  const rng = mulberry32(hash(def.id));
  const roots = new Map<string, Node>();
  let counter = 0;
  const tierPlan: ComboTier[] = ['easy', 'medium', 'medium', 'medium', 'medium', 'medium', 'medium', 'medium', 'hard', 'hard', 'hard', 'hard', 'hard', 'hard'];
  const sequences = tierPlan.map((tier) => ({ tier, inputs: makeSequence(rng, tier, style.kicks) }));

  const openerMove = (t: string): MoveId => TEMPLATE[t]!;
  const generate = (token: string, last: boolean, tier: ComboTier, seed: number): MoveDef => {
    const tpl = def.moves[TEMPLATE[token]!] ?? BASE_MOVES[TEMPLATE[token]!];
    const local = mulberry32(seed);
    const pool = isKick(token) ? KICK_LIMBS : PUNCH_LIMBS;
    const varied = isPlain(token) || token.startsWith('f+') || token.startsWith('b+');
    const limb = varied ? pool[Math.floor(local() * pool.length)]! : tpl.limb;
    const bonus = tier === 'hard' ? 6 : tier === 'medium' ? 3 : 0;
    // Dégâts plats (peu dépendants du coup modèle) : un combo long fait 30 à 50 points quel que soit le personnage.
    const k = Math.min(1.15, Math.max(0.85, powerK));
    const damage = last ? Math.round((9 + bonus) * k) : Math.round(4 * k);
    const move: MoveDef = {
      ...tpl,
      label: LIMB_NAMES[limb] ?? tpl.label,
      limb,
      startup: Math.max(4, Math.min(11, Math.round(tpl.startup * 0.7 * speedK))),
      recovery: last ? Math.round(tpl.recovery * 0.9) : Math.max(7, Math.min(16, Math.round(tpl.recovery * 0.65))),
      damage: Math.max(2, damage),
      hitstun: Math.max(20, tpl.hitstun),
      knockback: last ? tpl.knockback : tpl.knockback * 0.6,
      lunge: Math.min(2, tpl.lunge * 0.5),
      launch: last ? tpl.launch : 0,
      knockdown: last ? tpl.knockdown || tpl.launch === 0 : false,
      cancel: false,
      string: false,
      chain: undefined,
      chainFrame: undefined,
      throw: undefined,
      sequence: undefined,
      landing: undefined,
    };
    return move;
  };

  // Ouvertures : coups de base de ce personnage ; les enchaînements y sont ajoutés.
  const mm = moves as Record<string, MoveDef>;
  const links = new Map<string, Record<string, MoveId>>();
  for (const { tier, inputs } of sequences) {
    let level = roots;
    let parent: Node | null = null;
    let path = '';
    inputs.forEach((token, i) => {
      const isLast = i === inputs.length - 1;
      path += `|${token}`;
      let node = level.get(token);
      if (!node) {
        if (i === 0) {
          node = { id: openerMove(token), last: false, tier, next: new Map() };
        } else {
          const id = `c${counter++}` as ComboMoveId;
          mm[id] = generate(token, isLast, tier, hash(def.id + path));
          node = { id, last: isLast, tier, next: new Map() };
        }
        level.set(token, node);
        if (parent) links.set(parent.id, { ...(links.get(parent.id) ?? {}), [token]: node.id });
      } else if (isLast && i > 0 && !node.last) {
        // Ce noeud devient aussi une fin de combo : il prend les propriétés d'un coup final.
        node.last = true;
        mm[node.id] = generate(token, true, tier, hash(def.id + path));
      }
      parent = node;
      level = node.next;
    });
  }
  // Les liens : coup parent → coup suivant par entrée. Les ouvertures de base gardent leur triple appui.
  for (const [parent, set] of links) {
    const m = mm[parent]!;
    mm[parent] = { ...m, chain: { ...(m.chain ?? {}), ...set } };
  }

  // 4. Liste affichée : triples, spéciaux, puis combos générés (noms propres, uniques dans le personnage).
  const offset = hash(def.id) % 16;
  const name = (i: number, inputs: string[]): string => {
    const tail = inputs[inputs.length - 1]!;
    const nouns = isKick(tail) ? KICK_NOUNS : PUNCH_NOUNS;
    return `${nouns[(i * 3 + offset) % 16]} ${style.of[(i * 5 + offset) % 16]}`;
  };
  const combos: ComboDef[] = [
    { name: style.labels[1]!, tier: 'easy', inputs: ['lp', 'lp', 'lp'] },
    { name: style.labels[3]!, tier: 'easy', inputs: ['rp', 'rp', 'rp'] },
    { name: style.labels[5]!, tier: 'easy', inputs: ['lk', 'lk', 'lk'] },
    { name: style.labels[7]!, tier: 'easy', inputs: ['rk', 'rk', 'rk'] },
    { name: style.roll, tier: 'easy', inputs: ['ff+rp'] },
    { name: style.grab, tier: 'easy', inputs: ['ff+rk'] },
  ];
  sequences.forEach(({ tier, inputs }, i) => combos.push({ name: name(i, inputs), tier, inputs }));
  return { ...def, moves, combos };
}
