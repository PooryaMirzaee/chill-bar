import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Group } from 'three'
import type { IceCreamBuild } from '../data/iceCreamBuilder'
import {
  makeBaseMaterial,
  makeChocolateMaterial,
  makeFillingMaterial,
  makeIceMaterial,
  makeWavyCoatCap,
  makeWavyCoatCylinder,
} from '../lib/iceCream3D'
import { getBaseProfile, getCoatingProfile } from '../lib/iceCreamVisualProfiles'
import { darken, lighten } from '../lib/iceCreamGraphics'
import { cn } from '@/lib/utils'
import { Canvas3DBoundary } from './Canvas3DBoundary'
import type { RenderMode } from './IceCreamBarRenderer'

/* ── Collage-style cylindrical popsicle (matches menu photos) ── */
const R = 0.235
const H = 1.34
const BASE_H = 0.28
const COAT_SHELL = 0.014
const STICK_H = 0.5
const STICK_W = 0.082
const STICK_D = 0.016
const COLLAR_R = 0.27
const GROUP_Y = 0.22

const NUT_PALETTES: Record<string, string[]> = {
  hazelnut: ['#c4956a', '#a67c52', '#8b6914', '#d4b896'],
  almond: ['#d4b896', '#c4a882', '#a08060', '#e8d0b0'],
  pistachio: ['#bcd89c', '#9fcc7c', '#7cb85a', '#d4e8b8'],
  walnut: ['#9b7a55', '#6b5344', '#4a3828', '#b89870'],
}

interface CrunchPiece {
  position: [number, number, number]
  scale: [number, number, number]
  rotation: [number, number, number]
  color: string
}

function CrunchPieceMesh({ piece }: { piece: CrunchPiece }) {
  const mat = useMemo(
    () => makeIceMaterial(piece.color, { roughness: 0.55, clearcoat: 0.15 }),
    [piece.color],
  )
  return (
    <mesh position={piece.position} rotation={piece.rotation} scale={piece.scale} material={mat}>
      <boxGeometry args={[1, 1, 1]} />
    </mesh>
  )
}

function scatterCrunchOnCylinder(
  seed: number,
  texture: string | undefined,
  yMin: number,
  yMax: number,
  count: number,
): CrunchPiece[] {
  const palette = NUT_PALETTES[texture || 'hazelnut'] || NUT_PALETTES.hazelnut
  let s = seed * 9301 + 49297
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return (s % 100000) / 100000
  }
  const out: CrunchPiece[] = []
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2
    const y = yMin + rand() * (yMax - yMin)
    const bulge = 0.006 + rand() * 0.012
    const r = R + COAT_SHELL + bulge
    const sx = 0.022 + rand() * 0.028
    const sy = 0.012 + rand() * 0.016
    const sz = 0.018 + rand() * 0.022
    out.push({
      position: [Math.cos(angle) * r, y, Math.sin(angle) * r],
      scale: [sx, sy, sz],
      rotation: [rand() * Math.PI, angle + rand() * 0.4, rand() * Math.PI],
      color: palette[Math.floor(rand() * palette.length)],
    })
  }
  return out
}

interface BarModelProps {
  build: Partial<IceCreamBuild>
  mode?: RenderMode
  size?: 'lg' | 'sm' | 'xs'
  autoRotate?: boolean
  fitFrame?: boolean
}

function BarModel({ build, mode = 'full', size = 'lg', autoRotate = true, fitFrame = false }: BarModelProps) {
  const groupRef = useRef<Group>(null)
  const coatProfile = getCoatingProfile(build.coating || null)
  const baseProfile = getBaseProfile(build.base || null)
  const hasCoating = !!(build.coating && build.coating.id !== 'none')
  const isCrunchy = coatProfile.style === 'crunchy'
  const showStick = size !== 'xs'
  const showFilling = mode === 'full' || mode === 'filling-only' || mode === 'mini'
  const showCoat = hasCoating && (mode === 'full' || mode === 'coating-only' || mode === 'mini' || mode === 'filling-only')
  const showBase = mode === 'full' || mode === 'base-only' || mode === 'mini' || mode === 'coating-only' || mode === 'filling-only'

  const coatYMin = -H / 2 + BASE_H + 0.02
  const coatYMax = H / 2 - 0.06

  const coatSeed = useMemo(
    () => (build.coating?.id || 'coat').split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 0.017,
    [build.coating?.id],
  )

  const coreGeo = useMemo(() => new THREE.CylinderGeometry(R * 0.98, R * 0.98, H - 0.04, 48, 1, false), [])
  const baseBandGeo = useMemo(
    () => new THREE.CylinderGeometry(R, R * 1.02, BASE_H, 48, 1, false),
    [],
  )
  const coatGeo = useMemo(
    () => makeWavyCoatCylinder(R + COAT_SHELL, coatYMax - coatYMin + 0.04, coatSeed),
    [coatYMax, coatYMin, coatSeed],
  )
  const coatCapGeo = useMemo(
    () => makeWavyCoatCap(R + COAT_SHELL, coatSeed),
    [coatSeed],
  )
  const collarGeo = useMemo(() => new THREE.CylinderGeometry(COLLAR_R, COLLAR_R * 1.04, 0.045, 48), [])

  const coreMat = useMemo(() => makeBaseMaterial(build.base || null), [build.base?.id])
  const baseBandMat = useMemo(
    () =>
      makeIceMaterial(darken(baseProfile.colors[2], 8), {
        roughness: 0.38,
        clearcoat: 0.2,
      }),
    [baseProfile.colors],
  )
  const coatMat = useMemo(
    () => makeChocolateMaterial(build.coating || null),
    [build.coating?.id, build.coating?.color],
  )
  const stickMat = useMemo(
    () => makeIceMaterial('#d4b878', { roughness: 0.78, clearcoat: 0.05 }),
    [],
  )
  const collarMat = useMemo(
    () => makeIceMaterial('#f2f0ec', { roughness: 0.35, clearcoat: 0.4 }),
    [],
  )
  const fillMat = useMemo(
    () => (build.filling ? makeFillingMaterial(build.filling) : null),
    [build.filling?.id],
  )
  const fillAccentMat = useMemo(
    () =>
      build.filling
        ? makeIceMaterial(darken(build.filling.color, 15), { roughness: 0.28, clearcoat: 0.45 })
        : null,
    [build.filling?.id, build.filling?.color],
  )

  const fillHighlightMat = useMemo(
    () =>
      build.filling
        ? makeIceMaterial(lighten(build.filling.color, 25), { roughness: 0.15, clearcoat: 0.6 })
        : null,
    [build.filling?.color],
  )

  const crunch = useMemo(() => {
    if (!isCrunchy || !showCoat || !build.coating) return []
    return scatterCrunchOnCylinder(
      build.coating.id.length + (build.coating.texture?.length || 0),
      build.coating.texture ?? undefined,
      coatYMin,
      coatYMax,
      size === 'lg' ? 52 : 28,
    )
  }, [build.coating?.id, build.coating?.texture, isCrunchy, showCoat, coatYMin, coatYMax, size])

  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.42
    }
  })

  const baseBandY = -H / 2 + BASE_H / 2
  const coatCenterY = (coatYMin + coatYMax) / 2
  const stickY = -H / 2 - STICK_H / 2 - 0.02
  const frameScale = fitFrame ? 0.92 : 1
  const frameY = fitFrame ? 0.14 : GROUP_Y

  return (
    <group ref={groupRef} position={[0, frameY, 0]} scale={frameScale}>
      {/* wooden stick */}
      {showStick && (
        <group position={[0, stickY, 0]}>
          <mesh material={stickMat}>
            <boxGeometry args={[STICK_W, STICK_H, STICK_D]} />
          </mesh>
        </group>
      )}

      {/* white plastic collar at stick junction */}
      {showStick && (
        <mesh geometry={collarGeo} material={collarMat} position={[0, -H / 2 - 0.01, 0]} />
      )}

      {/* inner ice-cream core (base flavor) */}
      {showBase && (
        <mesh geometry={coreGeo} material={coreMat} position={[0, 0.01, 0]} />
      )}

      {/* base band — dark bottom ring (پایه) */}
      {showBase && (
        <mesh geometry={baseBandGeo} material={baseBandMat} position={[0, baseBandY, 0]} />
      )}

      {/* chocolate coating shell (روکش) */}
      {showCoat && (
        <group>
          <mesh geometry={coatGeo} material={coatMat} position={[0, coatCenterY, 0]} />
          <mesh
            geometry={coatCapGeo}
            material={coatMat}
            position={[0, coatYMax - 0.01, 0]}
            rotation={[0, 0, 0]}
          />
        </group>
      )}

      {/* crunchy inclusions embedded in coating */}
      {crunch.map((piece, i) => (
        <CrunchPieceMesh key={i} piece={piece} />
      ))}

      {/* filling dollop on top (فیلینگ) */}
      {showFilling && fillMat && build.filling && (
        <group position={[0, H / 2 + 0.02, 0]}>
          <mesh material={fillMat} position={[0, 0.04, 0]} scale={[0.22, 0.11, 0.2]}>
            <sphereGeometry args={[1, 24, 20]} />
          </mesh>
          <mesh material={fillMat} position={[0, 0.1, 0.01]} scale={[0.14, 0.09, 0.13]}>
            <sphereGeometry args={[1, 20, 16]} />
          </mesh>
          {fillAccentMat && (
            <mesh material={fillAccentMat} position={[0.02, 0.15, 0.02]} scale={[0.09, 0.06, 0.08]}>
              <sphereGeometry args={[1, 16, 12]} />
            </mesh>
          )}
          {fillHighlightMat && (
            <mesh
              material={fillHighlightMat}
              position={[-0.04, 0.08, 0.06]}
              scale={[0.05, 0.025, 0.04]}
            >
              <sphereGeometry args={[1, 12, 10]} />
            </mesh>
          )}
        </group>
      )}
    </group>
  )
}

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.35} color="#fff8f2" />
      <hemisphereLight args={['#fffaf5', '#2a1810', 0.9]} />
      <directionalLight position={[2.5, 4, 3.5]} intensity={1.85} color="#fff8f0" castShadow={false} />
      <directionalLight position={[-2.8, 2.5, -1.5]} intensity={0.55} color="#ffd0a8" />
      <directionalLight position={[0, 2, -4]} intensity={0.65} color="#ffffff" />
      <pointLight position={[1.2, 2.2, 2.5]} intensity={0.45} color="#ffffff" distance={8} />
      <pointLight position={[-1.5, 0.5, 1.8]} intensity={0.2} color="#ffe8d0" distance={6} />
    </>
  )
}

interface Props {
  build: Partial<IceCreamBuild>
  mode?: RenderMode
  size?: 'lg' | 'sm' | 'xs' | 'fill'
  interactive?: boolean
  fitFrame?: boolean
}

export function IceCreamBar3D({
  build,
  mode = 'full',
  size = 'lg',
  interactive = true,
  fitFrame = false,
}: Props) {
  const isFill = size === 'fill'
  const dims = isFill
    ? null
    : size === 'lg'
      ? { w: 280, h: 380 }
      : size === 'sm'
        ? { w: 72, h: 110 }
        : { w: 48, h: 72 }

  const useFit = isFill || fitFrame
  const cameraZ = useFit ? 3.05 : size === 'lg' ? 2.85 : 3.2
  const cameraY = useFit ? 0.02 : 0.06
  const cameraFov = useFit ? 34 : size === 'lg' ? 32 : 38

  return (
    <div
      className={cn('touch-none', isFill ? 'ice-canvas h-full w-full' : `ice-bar-3d ice-bar-3d--${size}`)}
      style={dims ? { width: dims.w, height: dims.h } : undefined}
      aria-hidden
    >
      <Canvas3DBoundary fallback={<div className="ice-bar-3d-fallback">🍦</div>}>
        <Canvas
          camera={{ position: [0, cameraY, cameraZ], fov: cameraFov }}
          gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
          dpr={isFill || size === 'lg' ? [1, 2] : 1}
        >
          <color attach="background" args={['transparent']} />
          <SceneLights />
          <Suspense fallback={null}>
            <BarModel
              build={build}
              mode={mode}
              size={isFill ? 'lg' : size}
              autoRotate={isFill || size === 'lg'}
              fitFrame={useFit}
            />
            {(isFill || size === 'lg') && (
              <ContactShadows
                position={[0, useFit ? -0.48 : -0.72, 0]}
                opacity={0.28}
                scale={useFit ? 2.4 : 2.4}
                blur={2.8}
                far={2.2}
                color="#3d2314"
              />
            )}
          </Suspense>
          {interactive && (isFill || size === 'lg') && (
            <OrbitControls
              enablePan={false}
              enableZoom={false}
              minPolarAngle={useFit ? Math.PI / 4 : Math.PI / 3.5}
              maxPolarAngle={useFit ? Math.PI / 1.55 : Math.PI / 1.7}
              minAzimuthAngle={-Math.PI / 2.2}
              maxAzimuthAngle={Math.PI / 2.2}
              target={[0, useFit ? 0.12 : 0.1, 0]}
            />
          )}
        </Canvas>
      </Canvas3DBoundary>
    </div>
  )
}
