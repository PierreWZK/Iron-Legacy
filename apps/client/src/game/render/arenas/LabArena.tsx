import { ARENA_RADIUS } from '@iron/engine';
import { useLoader, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Les glTF du pack référencent leurs textures à côté du fichier ; elles sont dans un dossier commun. */
const sciManager = new THREE.LoadingManager();
sciManager.setURLModifier((url) => url.replace(/\/models\/scifi\/glTF\/[^/]+\/(T_[^/]+\.png)$/, '/models/scifi/Textures/$1'));

const FILES = [
  'Platforms/Platform_Metal', 'Walls/ShortWall_Metal2_Straight', 'Walls/TopCables_Straight',
  'Columns/Column_Astra', 'Columns/Column_Pipes', 'Props/Prop_Computer', 'Props/Prop_Crate3',
  'Props/Prop_Crate4', 'Props/Prop_Barrel_Large', 'Props/Prop_Light_Floor', 'Props/Prop_Fan_Small',
  'Props/Prop_ItemHolder',
] as const;
type Name = (typeof FILES)[number];

const HALF = 13; // demi-côté de la salle (m)

/** Clone un modèle centré sur (x,z), posé au sol, tourné de `rotY`. */
function centered(proto: THREE.Object3D, size: THREE.Vector3, center: THREE.Vector3, min: number, x: number, z: number, rotY: number, scale = 1): THREE.Object3D {
  const inner = proto.clone(true);
  inner.position.set(-center.x * scale, -min * scale, -center.z * scale);
  inner.scale.setScalar(scale);
  const g = new THREE.Group();
  g.add(inner);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  void size;
  return g;
}

/** Les matériaux métalliques du pack sont noirs sans reflets : on fournit une carte d'environnement de studio. */
function useStudioEnvironment(intensity: number): void {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const target = pmrem.fromScene(new RoomEnvironment(), 0.04);
    const previous = scene.environment;
    scene.environment = target.texture;
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = previous;
      target.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, intensity]);
}

/** Laboratoire HELIX : salle carrée en dalles métalliques, murs, colonnes et matériel (Modular Sci-Fi MegaKit, CC0). */
export function LabArena() {
  useStudioEnvironment(0.7);
  const gltfs = useLoader(GLTFLoader, FILES.map((f) => `/models/scifi/glTF/${f}.gltf`), (l) => {
    (l as GLTFLoader).manager = sciManager;
  });

  const room = useMemo(() => {
    const info = new Map<Name, { scene: THREE.Object3D; size: THREE.Vector3; center: THREE.Vector3; min: number }>();
    FILES.forEach((f, i) => {
      const scene = gltfs[i]!.scene;
      scene.traverse((c) => {
        const mesh = c as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => { m.side = THREE.DoubleSide; });
      });
      const box = new THREE.Box3().setFromObject(scene);
      info.set(f, { scene, size: box.getSize(new THREE.Vector3()), center: box.getCenter(new THREE.Vector3()), min: box.min.y });
    });
    const put = (n: Name, x: number, z: number, rotY = 0, scale = 1) => {
      const i = info.get(n)!;
      return centered(i.scene, i.size, i.center, i.min, x, z, rotY, scale);
    };

    const group = new THREE.Group();
    // Sol : grille de dalles.
    const floor = info.get('Platforms/Platform_Metal')!;
    const tile = Math.max(floor.size.x, floor.size.z) || 4;
    const n = Math.ceil((HALF * 2) / tile);
    for (let ix = 0; ix < n; ix++) {
      for (let iz = 0; iz < n; iz++) {
        const g = put('Platforms/Platform_Metal', (ix - (n - 1) / 2) * tile, (iz - (n - 1) / 2) * tile);
        g.position.y = -0.02; // sous la ligne d'arène
        group.add(g);
      }
    }
    // Murs : quatre côtés, pièces droites alignées.
    const wall = info.get('Walls/ShortWall_Metal2_Straight')!;
    const wl = Math.max(wall.size.x, wall.size.z) || 4;
    const count = Math.ceil((HALF * 2) / wl);
    for (let i = 0; i < count; i++) {
      const off = (i - (count - 1) / 2) * wl;
      group.add(put('Walls/ShortWall_Metal2_Straight', off, -HALF, 0, 1));
      group.add(put('Walls/ShortWall_Metal2_Straight', off, HALF, Math.PI, 1));
      group.add(put('Walls/ShortWall_Metal2_Straight', -HALF, off, Math.PI / 2, 1));
      group.add(put('Walls/ShortWall_Metal2_Straight', HALF, off, -Math.PI / 2, 1));
    }
    // Colonnes aux angles et au milieu des côtés.
    const cols: [number, number][] = [[-HALF, -HALF], [HALF, -HALF], [-HALF, HALF], [HALF, HALF]];
    cols.forEach(([x, z], i) => group.add(put(i % 2 === 0 ? 'Columns/Column_Astra' : 'Columns/Column_Pipes', x, z)));
    // Matériel le long des murs.
    const props: [Name, number, number, number][] = [
      ['Props/Prop_Computer', -9, -HALF + 1, 0], ['Props/Prop_Computer', 9, -HALF + 1, 0],
      ['Props/Prop_Crate3', -HALF + 1.5, 6, 0.4], ['Props/Prop_Crate4', -HALF + 1.5, 9, 0.1],
      ['Props/Prop_Barrel_Large', HALF - 1.5, -8, 0], ['Props/Prop_Barrel_Large', HALF - 1.8, -6.2, 0],
      ['Props/Prop_Fan_Small', 0, HALF - 1, Math.PI], ['Props/Prop_ItemHolder', HALF - 1.5, 7, -Math.PI / 2],
      ['Props/Prop_Light_Floor', -10, 10, 0], ['Props/Prop_Light_Floor', 10, 10, 0],
    ];
    props.forEach(([name, x, z, r]) => group.add(put(name, x, z, r)));
    return group;
  }, [gltfs]);

  if (import.meta.env.DEV) (window as unknown as { __lab?: THREE.Object3D }).__lab = room;
  return (
    <group>
      <color attach="background" args={['#05080d']} />
      <fog attach="fog" args={['#05080d', 22, 52]} />
      <ambientLight intensity={0.55} color="#8fb4d0" />
      <directionalLight
        position={[4, 14, 5]}
        intensity={1.6}
        color="#dff3ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0004}
      />
      <pointLight position={[-10, 3, 10]} intensity={14} distance={16} color="#34e0ff" />
      <pointLight position={[10, 3, 10]} intensity={14} distance={16} color="#34e0ff" />
      <mesh rotation-x={-Math.PI / 2} position-y={0.012}>
        <ringGeometry args={[ARENA_RADIUS - 0.12, ARENA_RADIUS, 96]} />
        <meshStandardMaterial color="#34e0ff" emissive="#34e0ff" emissiveIntensity={1.4} />
      </mesh>
      <primitive object={room} />
    </group>
  );
}
