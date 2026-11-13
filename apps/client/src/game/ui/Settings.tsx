import { backToMenu } from '../store';
import { setTouchPrefs, useTouchPrefs, type TouchPrefs } from '../input/touch';
import { Screen, SlantButton, Title } from './kit';

function Choice<T extends string | boolean>({ value, options, onPick }: { value: T; options: [T, string][]; onPick: (v: T) => void }) {
  return (
    <div className="flex gap-2">
      {options.map(([v, label]) => (
        <SlantButton key={label} small primary={v === value} onClick={() => onPick(v)}>{label}</SlantButton>
      ))}
    </div>
  );
}

/** Réglages communs (menu principal et pause) : côté des commandes tactiles, affichage des commandes tactiles. */
export function SettingsPanel() {
  const prefs = useTouchPrefs();
  return (
    <div className="w-[min(30rem,90vw)] space-y-4">
      <div>
        <div className="mb-1 text-sm text-white/80">Attaques (écran tactile)</div>
        <Choice value={prefs.attacksRight} options={[[true, 'À DROITE'], [false, 'À GAUCHE']]} onPick={(v) => setTouchPrefs({ attacksRight: v })} />
        <p className="mt-1 text-xs text-white/50">Le déplacement passe de l'autre côté.</p>
      </div>
      <div>
        <div className="mb-1 text-sm text-white/80">Commandes tactiles</div>
        <Choice<TouchPrefs['controls']> value={prefs.controls} options={[['auto', 'AUTO'], ['on', 'OUI'], ['off', 'NON']]} onPick={(v) => setTouchPrefs({ controls: v })} />
        <p className="mt-1 text-xs text-white/50">Auto : affichées sur téléphone et tablette seulement.</p>
      </div>
    </div>
  );
}

export function SettingsScreen() {
  return (
    <Screen>
      <div className="flex h-full flex-col gap-6 overflow-y-auto px-8 py-8 sm:px-14">
        <Title sub="TACTILE ET COMMANDES">RÉGLAGES</Title>
        <SettingsPanel />
        <p className="max-w-md text-xs text-white/50">Les touches du clavier se changent pendant un combat : Échap, puis COMMANDES.</p>
        <div><SlantButton onClick={backToMenu}>RETOUR</SlantButton></div>
      </div>
    </Screen>
  );
}
