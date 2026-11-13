import { CHARACTER_IDS } from '@iron/engine';
import { DUMMY_MODES, type DummyMode } from '../runtime';
import { selectBack, useSelect } from '../select';
import { startFight, useApp } from '../store';
import { useProgress } from '../progress';
import { fr } from '../../i18n/fr';
import { FighterSelect } from './FighterSelect';
import { SlantButton } from './kit';

const LEVELS = ['NOVICE', 'FACILE', 'NORMAL', 'DIFFICILE', 'EXPERT'];

/** Combat rapide / entraînement : choix du combattant, de l'adversaire, du niveau ou du mannequin. */
export function SelectScreen() {
  const { kind, step } = useSelect();
  const cfg = useApp((s) => s.config);
  const unlocked = useProgress((s) => s.unlocked);
  const patch = (p: Partial<typeof cfg>) => useApp.setState((s) => ({ config: { ...s.config, ...p } }));
  const title = kind === 'versus' ? 'COMBAT' : 'ENTRAÎNEMENT';

  if (step === 'p1') {
    return (
      <FighterSelect
        title={title}
        sub="CHOISIS TON COMBATTANT"
        unlocked={unlocked}
        value={unlocked.includes(cfg.p1) ? cfg.p1 : unlocked[0]!}
        onChange={(id) => patch({ p1: id })}
        onConfirm={() => useSelect.setState({ step: 'p2' })}
        confirmLabel="VALIDER"
        onBack={selectBack}
      />
    );
  }
  return (
    <FighterSelect
      title={title}
      sub={kind === 'versus' ? 'CHOISIS TON ADVERSAIRE' : 'CHOISIS TON MANNEQUIN'}
      unlocked={CHARACTER_IDS}
      value={cfg.p2}
      onChange={(id) => patch({ p2: id })}
      onConfirm={startFight}
      confirmLabel={fr.menu.start}
      onBack={selectBack}
      tag="CPU"
      footer={
        kind === 'versus' ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="mr-2 text-[11px] tracking-[0.3em] text-white/50">NIVEAU</span>
            {LEVELS.map((label, i) => (
              <SlantButton key={label} small primary={cfg.level === i + 1} onClick={() => patch({ level: i + 1 })}>{label}</SlantButton>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="mr-2 text-[11px] tracking-[0.3em] text-white/50">MANNEQUIN</span>
            {DUMMY_MODES.map((m: DummyMode) => (
              <SlantButton key={m} small primary={cfg.dummy === m} onClick={() => patch({ dummy: m })}>{fr.menu.dummyModes[m]!.toUpperCase()}</SlantButton>
            ))}
          </div>
        )
      }
    />
  );
}
