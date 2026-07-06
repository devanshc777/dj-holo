import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { engine, useStore, dispatchControl } from '../state/store';
import { DeckId } from '../control/events';

const DECK_COLOR: Record<DeckId, string> = { 0: '#00e5ff', 1: '#ff2ec4' };

/** Fresnel rim + scanlines + additive glow = hologram look. */
function holoMaterial(color: string) {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uEnergy: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      varying vec3 vPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        vPos = position;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uEnergy;
      varying vec3 vNormal;
      varying vec3 vView;
      varying vec3 vPos;
      void main() {
        float fresnel = pow(1.0 - abs(dot(vNormal, vView)), 2.0);
        float scan = 0.65 + 0.35 * sin(vPos.y * 60.0 + uTime * 4.0);
        float flicker = 0.92 + 0.08 * sin(uTime * 23.0);
        float a = (0.18 + fresnel * 0.9) * scan * flicker * (0.7 + uEnergy * 0.6);
        gl_FragColor = vec4(uColor * (0.8 + uEnergy), a);
      }
    `,
  });
}

/** Low-band energy 0..1 from the master analyser (shared per frame). */
function useFFT() {
  const buf = useMemo(() => new Uint8Array(new ArrayBuffer(engine.fftSize)), []);
  return () => {
    engine.getFFT(buf);
    return buf;
  };
}

function DeckDisc({ deck }: { deck: DeckId }) {
  const group = useRef<THREE.Group>(null);
  const mat = useMemo(() => holoMaterial(DECK_COLOR[deck]), [deck]);
  const ringMat = useMemo(() => holoMaterial(DECK_COLOR[deck]), [deck]);
  const getFFT = useFFT();

  useFrame((state) => {
    const d = engine.deck(deck);
    const t = state.clock.elapsedTime;
    mat.uniforms.uTime.value = t;
    ringMat.uniforms.uTime.value = t;

    const fft = getFFT();
    let low = 0;
    for (let i = 2; i < 24; i++) low += fft[i];
    const energy = d.playing ? low / (22 * 255) : 0;
    mat.uniforms.uEnergy.value = energy;
    ringMat.uniforms.uEnergy.value = energy;

    if (group.current && d.playing) {
      group.current.rotation.y += 0.6 * d.effectiveRate() * (1 / 60);
    }
  });

  const x = deck === 0 ? -2.4 : 2.4;
  return (
    <group
      ref={group}
      position={[x, 0, 0]}
      onClick={() => dispatchControl({ type: 'deck', deck, action: 'toggle' })}
    >
      <mesh material={mat}>
        <cylinderGeometry args={[1.3, 1.3, 0.08, 64, 1, true]} />
      </mesh>
      <mesh material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[1.3, 64]} />
      </mesh>
      <mesh material={ringMat} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.02, 8, 96]} />
      </mesh>
    </group>
  );
}

/** Static peak waveform ribbon floating behind each deck; brightens with play. */
function WaveRibbon({ deck }: { deck: DeckId }) {
  const peaks = useStore((s) => s.decks[deck].peaks);
  const lineRef = useRef<THREE.Line>(null);

  const geometry = useMemo(() => {
    const n = 256;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      let amp = 0.05;
      if (peaks) {
        const idx = Math.floor((i / n) * (peaks.length / 2)) * 2;
        amp = Math.max(0.03, (peaks[idx + 1] - peaks[idx]) * 0.6);
      }
      pts.push(new THREE.Vector3((i / n - 0.5) * 3.4, Math.sin(i * 0.7) * 0.02 + amp * Math.sin(i * 2.1), 0));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [peaks]);

  useFrame(() => {
    if (!lineRef.current) return;
    const m = lineRef.current.material as THREE.LineBasicMaterial;
    m.opacity = engine.deck(deck).playing ? 0.9 : 0.35;
  });

  const x = deck === 0 ? -2.4 : 2.4;
  return (
    <primitive
      ref={lineRef}
      object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: DECK_COLOR[deck], transparent: true }))}
      position={[x, -1.9, -0.5]}
    />
  );
}

/** FFT ring: 96 bars around the center scaling with the master spectrum. */
function SpectrumRing() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const getFFT = useFFT();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const N = 96;

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const fft = getFFT();
    for (let i = 0; i < N; i++) {
      const v = fft[Math.floor((i / N) * 300)] / 255;
      const angle = (i / N) * Math.PI * 2;
      const r = 3.6;
      dummy.position.set(Math.cos(angle) * r, -1.2 + v * 0.5, Math.sin(angle) * r - 1);
      dummy.scale.set(1, 0.2 + v * 3, 1);
      dummy.rotation.y = -angle;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, N]}>
      <boxGeometry args={[0.06, 0.5, 0.06]} />
      <meshBasicMaterial color="#4b5fff" transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  );
}

/** Tracked hands as glowing spheres floating in the scene. */
function HandSpheres() {
  const points = useStore((s) => s.handPoints);
  return (
    <>
      {points.map((p) => (
        <mesh key={p.deck} position={[(p.x - 0.5) * 9, (0.5 - p.y) * 5, 1.5]}>
          <sphereGeometry args={[p.pose === 'pinch' ? 0.1 : 0.16, 24, 24]} />
          <meshBasicMaterial
            color={DECK_COLOR[p.deck]}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

/** Slow-drifting ambient particle field. */
function Dust() {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const n = 600;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) pos[i] = (Math.random() - 0.5) * 16;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.02;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={0.025} color="#3a4a8f" transparent opacity={0.8} depthWrite={false} />
    </points>
  );
}

export default function HoloScene() {
  return (
    <div style={{ flex: 1, minHeight: 0 }}>
      <Canvas camera={{ position: [0, 1.2, 6.5], fov: 55 }} gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={['#04050a']} />
        <fog attach="fog" args={['#04050a', 8, 18]} />
        <DeckDisc deck={0} />
        <DeckDisc deck={1} />
        <WaveRibbon deck={0} />
        <WaveRibbon deck={1} />
        <SpectrumRing />
        <HandSpheres />
        <Dust />
      </Canvas>
    </div>
  );
}
