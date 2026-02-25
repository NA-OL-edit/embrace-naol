import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment } from '@react-three/drei';
import * as THREE from 'three';

function GoldTorus({ position, scale = 1, speed = 1 }: { position: [number, number, number]; scale?: number; speed?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3 * speed) * 0.5;
      ref.current.rotation.y += 0.003 * speed;
    }
  });

  return (
    <Float speed={1.5 * speed} rotationIntensity={0.4} floatIntensity={0.8}>
      <mesh ref={ref} position={position} scale={scale}>
        <torusGeometry args={[1, 0.4, 32, 64]} />
        <meshStandardMaterial
          color="#c9a84c"
          metalness={1}
          roughness={0.15}
          envMapIntensity={2}
        />
      </mesh>
    </Float>
  );
}

function GoldSphere({ position, scale = 0.3 }: { position: [number, number, number]; scale?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
    }
  });

  return (
    <mesh ref={ref} position={position} scale={scale}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        color="#d4a843"
        metalness={1}
        roughness={0.1}
        envMapIntensity={2.5}
      />
    </mesh>
  );
}

function GoldOctahedron({ position, scale = 0.5 }: { position: [number, number, number]; scale?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.005;
      ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.4) * 0.3;
    }
  });

  return (
    <Float speed={1} rotationIntensity={0.6} floatIntensity={0.5}>
      <mesh ref={ref} position={position} scale={scale}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#b8942e"
          metalness={1}
          roughness={0.2}
          envMapIntensity={2}
        />
      </mesh>
    </Float>
  );
}

function GlassPanel({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation || [0, 0, 0]}>
      <planeGeometry args={[2, 3]} />
      <meshStandardMaterial
        color="#d4a843"
        transparent
        opacity={0.04}
        metalness={0.8}
        roughness={0.1}
      />
    </mesh>
  );
}

function Particles() {
  const count = 60;
  const ref = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.02;
      const posArray = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        posArray[i * 3 + 1] += Math.sin(state.clock.elapsedTime * 0.3 + i) * 0.002;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#d4a843"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

export default function HeroScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 5, 5]} intensity={1} color="#f5d77a" />
        <directionalLight position={[-3, 2, 4]} intensity={0.5} color="#c9a84c" />
        <pointLight position={[0, 0, 3]} intensity={0.8} color="#d4a843" />
        
        <GoldTorus position={[-3.5, 0.8, -1]} scale={0.7} speed={0.7} />
        <GoldTorus position={[3.8, -0.5, -1.5]} scale={0.5} speed={1.2} />
        <GoldSphere position={[3.5, 1.8, 0.5]} scale={0.2} />
        <GoldSphere position={[-3.2, -1.5, 1]} scale={0.15} />
        <GoldOctahedron position={[4, 1.2, -0.5]} scale={0.3} />
        <GoldOctahedron position={[-4, -0.8, -1]} scale={0.25} />
        <GlassPanel position={[-3, 0, -3]} rotation={[0, 0.3, 0]} />
        <GlassPanel position={[3.5, 0.5, -3]} rotation={[0, -0.2, 0.1]} />
        <Particles />
        
        <Environment preset="studio" />
      </Canvas>
    </div>
  );
}
