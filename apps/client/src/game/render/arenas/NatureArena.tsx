import { ARENA_RADIUS } from '@iron/engine';
import { useLoader } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type NatureTheme = 'forest' | 'autumn' | 'canyon' | 'snow' | 'tundra';

interface Theme {
  sky: string;
  fogNear: number;
  fogFar: number;
  ground: string;
  floor: string;
  ring: string;
  ambient: number;
  ambientColor: string;
  sun: string;
  sunPower: number;
  /** Teinte multipliée sur les matériaux des modèles (null = couleurs d'origine). */
  tint: string | null;
  trees: string[];
  treeCount: number;
  treeScale: number;
  props: string[];
  propCount: number;
  propScale: number;
}

/** Un décor par thème, tous composés avec les mêmes pièces du Stylized Nature MegaKit (CC0). */
const THEMES: Record<NatureTheme, Theme> = {
  forest: {
    sky: '#0b1410', fogNear: 22, fogFar: 62, ground: '#1c2a18', floor: '#4a3d2a', ring: '#9fd8ff',
    ambient: 0.45, ambientColor: '#7f9fb5', sun: '#cfe6ff', sunPower: 1.6, tint: null,
    trees: ['CommonTree_1', 'CommonTree_2', 'CommonTree_3', 'Pine_1', 'Pine_2', 'TwistedTree_1'],
    treeCount: 56, treeScale: 1.4,
    props: ['Bush_Common', 'Fern_1', 'Mushroom_Common', 'Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3', 'Grass_Common_Tall'],
    propCount: 26, propScale: 1.3,
  },
  autumn: {
    sky: '#2a1608', fogNear: 22, fogFar: 62, ground: '#4a2e14', floor: '#6b4a28', ring: '#ffb020',
    ambient: 0.55, ambientColor: '#d9a070', sun: '#ffd9a0', sunPower: 2.0, tint: '#ffb066',
    trees: ['CommonTree_1', 'CommonTree_2', 'CommonTree_3', 'TwistedTree_2'],
    treeCount: 52, treeScale: 1.4,
    props: ['Bush_Common_Flowers', 'Bush_Common', 'Mushroom_Common', 'Rock_Medium_1', 'Grass_Wispy_Short'],
    propCount: 24, propScale: 1.3,
  },
  canyon: {
    sky: '#d8a55e', fogNear: 22, fogFar: 62, ground: '#b8894f', floor: '#d8bb85', ring: '#ff6a3a',
    ambient: 0.7, ambientColor: '#ffe0b0', sun: '#fff0cc', sunPower: 2.6, tint: '#d9b27a',
    trees: ['Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3', 'DeadTree_1', 'DeadTree_2'],
    treeCount: 20, treeScale: 2.8,
    props: ['Rock_Medium_1', 'Rock_Medium_2', 'Pebble_Round_1'],
    propCount: 16, propScale: 1.2,
  },
  snow: {
    sky: '#aabfd6', fogNear: 22, fogFar: 62, ground: '#eef3f8', floor: '#f6f9fc', ring: '#9fc4ff',
    ambient: 0.8, ambientColor: '#cfdcec', sun: '#ffffff', sunPower: 1.8, tint: '#e8f0ff',
    trees: ['Pine_1', 'Pine_2', 'Pine_3'],
    treeCount: 56, treeScale: 1.5,
    props: ['Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3'],
    propCount: 14, propScale: 1.3,
  },
  tundra: {
    sky: '#8fb2c9', fogNear: 22, fogFar: 62, ground: '#cfe2ee', floor: '#e8f3fa', ring: '#7fd4ff',
    ambient: 0.8, ambientColor: '#bcd2e4', sun: '#eaf6ff', sunPower: 1.7, tint: '#cfe6f5',
    trees: ['DeadTree_1', 'DeadTree_2'],
    treeCount: 14, treeScale: 1.8,
    props: ['Rock_Medium_1', 'Rock_Medium_2', 'Pebble_Round_1'],
    propCount: 20, propScale: 1.3,
  },
};

/** La caméra de combat peut s'éloigner jusqu'à ~21 m du centre : les grands éléments restent au-delà. */
const FAR_MIN = 23;

/** Générateur pseudo-aléatoire à graine : le décor est identique à chaque chargement. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Copie un modèle en teintant ses matériaux (les instances suivantes partagent ces matériaux). */
function tintedProto(scene: THREE.Object3D, tint: string | null): THREE.Object3D {
  const o = scene.clone(true);
  const tintColor = tint ? new THREE.Color(tint) : null;
  o.traverse((c) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (!tintColor) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const tinted = mats.map((m) => {
      const t = m.clone() as THREE.MeshStandardMaterial;
      if (t.color) t.color.multiply(tintColor);
      return t;
    });
    mesh.material = Array.isArray(mesh.material) ? tinted : tinted[0]!;
  });
  return o;
}

export function NatureArena({ theme }: { theme: NatureTheme }) {
  const T = THEMES[theme];
  const names = useMemo(() => [...new Set([...T.trees, ...T.props])], [T]);
  const gltfs = useLoader(GLTFLoader, names.map((n) => `/models/nature/glTF/${n}.gltf`));

  const scenery = useMemo(() => {
    const protos = new Map<string, THREE.Object3D>();
    names.forEach((n, i) => protos.set(n, tintedProto(gltfs[i]!.scene, T.tint)));
    const rnd = mulberry32(theme.length * 7919 + theme.charCodeAt(0));
    const group = new THREE.Group();
    const place = (name: string, radius: number, scale: number) => {
      const o = protos.get(name)!.clone(true);
      const angle = rnd() * Math.PI * 2;
      o.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      o.rotation.y = rnd() * Math.PI * 2;
      o.scale.setScalar(scale);
      group.add(o);
    };
    // Grands éléments en couronne lointaine (au-delà de FAR_MIN) : la caméra ne les traverse jamais.
    for (let i = 0; i < T.treeCount; i++) {
      place(T.trees[Math.floor(rnd() * T.trees.length)]!, FAR_MIN + rnd() * 13, T.treeScale * (0.8 + rnd() * 0.6));
    }
    // Petits éléments juste hors de l'arène.
    for (let i = 0; i < T.propCount; i++) {
      place(T.props[Math.floor(rnd() * T.props.length)]!, ARENA_RADIUS + 1.2 + rnd() * 6, T.propScale * (0.7 + rnd() * 0.6));
    }
    return group;
  }, [gltfs, names, T, theme]);

  return (
    <group>
      <color attach="background" args={[T.sky]} />
      <fog attach="fog" args={[T.sky, T.fogNear, T.fogFar]} />
      <ambientLight intensity={T.ambient} color={T.ambientColor} />
      <directionalLight
        position={[5, 12, 6]}
        intensity={T.sunPower}
        color={T.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0004}
      />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[70, 48]} />
        <meshStandardMaterial color={T.ground} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.005} receiveShadow>
        <circleGeometry args={[ARENA_RADIUS, 64]} />
        <meshStandardMaterial color={T.floor} roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
        <ringGeometry args={[ARENA_RADIUS - 0.12, ARENA_RADIUS, 96]} />
        <meshStandardMaterial color={T.ring} emissive={T.ring} emissiveIntensity={1.1} />
      </mesh>
      <primitive object={scenery} />
    </group>
  );
}
