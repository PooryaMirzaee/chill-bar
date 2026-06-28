import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import type { Group } from 'three'
import { BOWL_POSITIONS, cherryPosition, type BowlSize, type ScoopFlavor } from '../data/scoopBuilder'

/** Pseudo-random 3D value noise for a soft, creamy scoop surface. */
function hashNoise(x: number, y: number, z: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453
  return s - Math.floor(s)
}

function makeScoopGeometry(radius: number, seed: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(radius, 4)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const n = v.clone().normalize()
    const lumps =
      hashNoise(n.x * 3 + seed, n.y * 3, n.z * 3) * 0.5 +
      hashNoise(n.x * 7, n.y * 7 + seed, n.z * 7) * 0.25
    const displace = 1 + (lumps - 0.35) * 0.12
    // flatten the bottom a touch so it sits in the bowl
    const flat = n.y < -0.55 ? 0.86 : 1
    v.multiplyScalar(displace * flat)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals()
  return geo
}

function Scoop({
  flavor,
  position,
  radius,
  onClick,
  active,
}: {
  flavor: ScoopFlavor
  position: [number, number, number]
  radius: number
  onClick?: () => void
  active?: boolean
}) {
  const geometry = useMemo(
    () => makeScoopGeometry(radius, flavor.id.length * 1.7),
    [radius, flavor.id],
  )
  const material = useMemo(() => {
    const color = new THREE.Color(...flavor.threeColor)
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.42,
      clearcoat: 0.5,
      clearcoatRoughness: 0.35,
      sheen: 0.4,
      sheenColor: color.clone().lerp(new THREE.Color('#ffffff'), 0.4),
    })
  }, [flavor.id, flavor.threeColor])

  return (
    <group position={position}>
      <mesh
        geometry={geometry}
        material={material}
        castShadow
        onClick={
          onClick
            ? (e) => {
                e.stopPropagation()
                onClick()
              }
            : undefined
        }
      />
      {active && (
        <mesh>
          <sphereGeometry args={[radius * 1.18, 24, 24]} />
          <meshBasicMaterial color="#F26522" transparent opacity={0.16} />
        </mesh>
      )}
    </group>
  )
}

function GlassBowl({ size }: { size: BowlSize }) {
  const profile = useMemo(() => {
    // Lathe profile for a footed sundae glass bowl (x = radius, y = height)
    const r = size === 'L' ? 0.42 : 0.34
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0.0, -0.42),
      new THREE.Vector2(0.1, -0.42),
      new THREE.Vector2(0.11, -0.32),
      new THREE.Vector2(0.05, -0.26),
      new THREE.Vector2(0.06, -0.2),
      new THREE.Vector2(0.18, -0.1),
      new THREE.Vector2(r * 0.7, -0.02),
      new THREE.Vector2(r, 0.12),
      new THREE.Vector2(r + 0.012, 0.16),
    ]
    return pts
  }, [size])

  const geometry = useMemo(() => new THREE.LatheGeometry(profile, 64), [profile])
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#eaf2ff',
        transparent: true,
        opacity: 0.32,
        roughness: 0.06,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        side: THREE.DoubleSide,
      }),
    [],
  )

  return <mesh geometry={geometry} material={material} />
}

function Cherry({ position }: { position: [number, number, number] }) {
  const bodyMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#c01530',
        roughness: 0.18,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
      }),
    [],
  )
  const stemMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#5a3a1a', roughness: 0.7 }),
    [],
  )
  return (
    <group position={position}>
      <mesh material={bodyMat} castShadow>
        <sphereGeometry args={[0.07, 24, 24]} />
      </mesh>
      <mesh material={bodyMat} position={[0.005, 0.012, 0]} scale={[0.4, 0.4, 0.4]}>
        <sphereGeometry args={[0.07, 12, 12]} />
      </mesh>
      <mesh material={stemMat} position={[0.02, 0.1, 0]} rotation={[0, 0, -0.4]}>
        <cylinderGeometry args={[0.006, 0.006, 0.13, 8]} />
      </mesh>
    </group>
  )
}

export function ScoopSceneLights() {
  return (
    <>
      <hemisphereLight args={['#fff6ee', '#241420', 1.0]} />
      <directionalLight position={[3, 6, 3]} intensity={1.7} color="#fff8f0" castShadow />
      <directionalLight position={[-3, 3, -2]} intensity={0.5} color="#ffd8b0" />
      <pointLight position={[0, 2, 2]} intensity={0.5} color="#ffffff" distance={6} />
    </>
  )
}

export function ScoopScene({
  bowlSize,
  scoopCount,
  flavors,
  cherry,
  activeScoop,
  onScoopClick,
  autoRotate = true,
}: {
  bowlSize: BowlSize
  scoopCount: number
  flavors: ScoopFlavor[]
  cherry: boolean
  activeScoop: number
  onScoopClick: (idx: number) => void
  autoRotate?: boolean
}) {
  const groupRef = useRef<Group>(null)
  const positions = BOWL_POSITIONS[bowlSize][scoopCount] || BOWL_POSITIONS[bowlSize][1]
  const scoopRadius = bowlSize === 'M' ? 0.155 : 0.15

  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.35
    }
  })

  return (
    <group ref={groupRef}>
      <GlassBowl size={bowlSize} />
      {positions.slice(0, scoopCount).map((pos, i) => (
        <Scoop
          key={`scoop-${i}-${flavors[i]?.id}`}
          flavor={flavors[i] || flavors[0]}
          position={[pos[0], pos[1] + 0.12, pos[2]]}
          radius={scoopRadius}
          active={activeScoop === i}
          onClick={() => onScoopClick(i)}
        />
      ))}
      {cherry && (
        <Cherry
          position={(() => {
            const c = cherryPosition(bowlSize, scoopCount)
            return [c[0], c[1] + 0.12, c[2]]
          })()}
        />
      )}
      <ContactShadows position={[0, -0.42, 0]} opacity={0.5} scale={2.6} blur={2.6} far={2} color="#3d2314" />
    </group>
  )
}
