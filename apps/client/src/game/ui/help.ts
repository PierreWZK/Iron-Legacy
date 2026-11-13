import { getCharacter, type MoveId } from '@iron/engine';
import { create } from 'zustand';
import { keyLabel, type Bindings } from '../input/bindings';

const KEY = 'iron-legacy.help';

function loadOpen(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}

/** Affichage du texte d'aide en combat (bouton AIDE, touche H, menu pause). */
export const useHelp = create<{ open: boolean }>(() => ({ open: loadOpen() }));

export function toggleHelp(): void {
  const open = !useHelp.getState().open;
  useHelp.setState({ open });
  try {
    window.localStorage.setItem(KEY, open ? '1' : '0');
  } catch {
    // Préférence non sauvegardée : valable pour la session.
  }
}

export interface HelpSection {
  title: string;
  lines: string[];
}

const OPENERS: Record<'lp' | 'rp' | 'lk' | 'rk', MoveId> = { lp: 'jab', rp: 'cross', lk: 'frontKick', rk: 'roundhouse' };

/** Texte d'aide d'après les touches réglées et les vrais coups du personnage joué. */
export function helpSections(b: Bindings, characterId: string): HelpSection[] {
  const k = (a: keyof Bindings): string => keyLabel(b[a][0]);
  const moves = getCharacter(characterId).moves;
  const combo = (btn: 'lp' | 'rp' | 'lk' | 'rk'): string => {
    const key = k(btn);
    const second = moves[`${btn}2` as MoveId]!.label;
    const third = moves[`${btn}3` as MoveId]!.label;
    return `${key} ${key} ${key} : ${moves[OPENERS[btn]]!.label} › ${second} › ${third}`;
  };
  return [
    {
      title: 'Commandes',
      lines: [
        `${k('screenLeft')} / ${k('screenRight')} : gauche / droite de l'écran · double appui vers l'adversaire (tenu) : sprint`,
        `${k('jump')} : saut · ${k('crouch')} : accroupi · double appui ${k('jump')} ou ${k('crouch')} (tenu) : tourner autour de l'adversaire`,
        `${k('lp')} / ${k('rp')} : poing gauche / droit · ${k('lk')} / ${k('rk')} : pied gauche / droit`,
        `Direction + bouton = coup différent : avant, arrière, ${k('crouch')} (accroupi), ${k('crouch')} + avant`,
        `Ex. : ${k('crouch')} + ${k('lk')} = balayette · ${k('crouch')} + ${k('rk')} = balayage · avant + ${k('rk')} = coup de hache`,
        `${k('shift')} + avant (course) puis un bouton : charge ou coup volant`,
        `Deux boutons ensemble (un léger décalage passe) : projection (${k('lp')}+${k('rp')}, ${k('lp')}+${k('lk')}, ${k('rp')}+${k('rk')}, ${k('lk')}+${k('rk')})`,
        `Le même coup répété coup sur coup devient plus lent et plus faible : varie tes coups`,
        `Arrière + ${k('lp')} : parade · ${k('shift')} + côté ou arrière : esquive`,
        'Échap : pause et réglage des touches · Entrée : recommencer · T mannequin · I vie infinie',
      ],
    },
    {
      title: `Combos de ${getCharacter(characterId).name}`,
      lines: [
        combo('lp'),
        combo('rp'),
        combo('lk'),
        combo('rk'),
        `Les boutons se mélangent : ${k('lp')} ${k('rp')} ${k('rk')} = ${moves.jab.label} › ${moves.rp2.label} › ${moves.rk3.label}`,
        'Appuie sans attendre : un appui en avance est gardé en mémoire et part au bon moment.',
        `Les 20 combos (directions, double appui) : ${'É'}chap puis COMBOS.`,
      ],
    },
  ];
}
