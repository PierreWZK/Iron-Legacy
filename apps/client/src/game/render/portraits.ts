import * as THREE from 'three';
import { RigPlayer } from './RigPlayer';
import { visualFor } from './visuals';

/**
 * Portraits en buste, rendus une fois par le même rig 3D que le combat (aucune image externe) puis
 * mis en cache sous forme d'URL de données. Servent à la sélection, aux dialogues et aux écrans VS.
 */
const SMALL = 256;
export const PORTRAIT_BIG = 640;
const cache = new Map<string, Promise<string>>();
let renderer: THREE.WebGLRenderer | null = null;
let queue: Promise<unknown> = Promise.resolve();

function getRenderer(size: number): THREE.WebGLRenderer {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
  }
  renderer.setSize(size, size, false);
  return renderer;
}

function draw(id: string, size: number): string {
  const r = getRenderer(size);
  const player = new RigPlayer(id, 0.012);
  // Pose de portrait : bras le long du corps, torse bombé, regard légèrement relevé.
  const b = player.rig.bones;
  b.upperArmL.rotation.set(0.1, 0, 0.32);
  b.upperArmR.rotation.set(0.1, 0, -0.32);
  b.forearmL.rotation.set(-0.5, 0, 0);
  b.forearmR.rotation.set(-0.5, 0, 0);
  b.thighL.rotation.set(0, 0, 0);
  b.thighR.rotation.set(0, 0, 0);
  b.shinL.rotation.set(0, 0, 0);
  b.shinR.rotation.set(0, 0, 0);
  b.spine.rotation.set(-0.05, 0, 0);
  b.head.rotation.set(-0.06, 0.1, 0);
  const scene = new THREE.Scene();
  scene.add(player.rig.root);
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(2, 3, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(visualFor(id).accent, 3.2);
  rim.position.set(-3, 2, -2);
  scene.add(rim);

  player.rig.root.rotation.y = -0.45;
  player.rig.root.updateMatrixWorld(true);
  const head = new THREE.Vector3();
  player.rig.bones.head.getWorldPosition(head);
  const box = new THREE.Box3().setFromObject(player.rig.bones.head);
  const top = box.max.y + 0.06;
  const bottom = head.y - 0.5 * visualFor(id).height;
  const height = Math.max(0.8, top - bottom);
  const cy = (top + bottom) / 2;
  const cam = new THREE.PerspectiveCamera(22, 1, 0.1, 50);
  const dist = height / 2 / Math.tan((22 * Math.PI) / 360);
  cam.position.set(0, cy + 0.04, dist + head.z);
  cam.lookAt(0, cy, head.z);
  r.render(scene, cam);
  const url = r.domElement.toDataURL('image/png');
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
  });
  return url;
}

/** URL d'un portrait (rendu à la demande, un à la fois). */
export function getPortrait(id: string, size = SMALL): Promise<string> {
  const key = `${id}:${size}`;
  let p = cache.get(key);
  if (!p) {
    p = new Promise<string>((resolve) => {
      queue = queue.then(
        () => new Promise<void>((done) => {
          // Un rendu par image d'animation pour ne pas bloquer l'interface.
          window.requestAnimationFrame(() => {
            try {
              resolve(draw(id, size));
            } catch {
              resolve('');
            }
            done();
          });
        }),
      );
    });
    cache.set(key, p);
  }
  return p;
}
