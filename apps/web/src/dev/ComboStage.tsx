/**
 * Dev-only still renderer for ice cream builder combinations.
 * Driven by scripts/render-ice-combos.mjs through window.__renderCombo.
 */
import { useEffect, useLayoutEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import type { IceCreamBuild } from '../data/iceCreamBuilder'
import { BarModel, SceneLights } from '../components/IceCreamBar3D'

const params = new URLSearchParams(window.location.search)
const OUTPUT_SIZE = Number(params.get('size')) || 2048
const SUPERSAMPLE = Number(params.get('ss')) || 2
const TARGET_Y = -0.03

type RenderApi = {
  gl: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.Camera
  invalidate: () => void
}

declare global {
  interface Window {
    __renderCombo?: (build: IceCreamBuild) => Promise<string>
    __rendererReady?: boolean
  }
}

function nextFrames(count: number) {
  return new Promise<void>((resolve) => {
    const tick = (left: number) => {
      if (left <= 0) resolve()
      else requestAnimationFrame(() => tick(left - 1))
    }
    tick(count)
  })
}

function CameraAim() {
  const camera = useThree((s) => s.camera)
  useLayoutEffect(() => {
    camera.lookAt(0, TARGET_Y, 0)
    camera.updateProjectionMatrix()
  }, [camera])
  return null
}

function ExposeRenderer({ onReady }: { onReady: (api: RenderApi) => void }) {
  const { gl, scene, camera, invalidate } = useThree()
  useEffect(
    () => onReady({ gl, scene, camera, invalidate }),
    [gl, scene, camera, invalidate, onReady],
  )
  return null
}

export function ComboStage() {
  const [build, setBuild] = useState<IceCreamBuild | null>(null)
  const [api, setApi] = useState<RenderApi | null>(null)

  useEffect(() => {
    if (!api) return
    const out = document.createElement('canvas')
    out.width = OUTPUT_SIZE
    out.height = OUTPUT_SIZE
    const ctx = out.getContext('2d')!
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    window.__renderCombo = async (next) => {
      setBuild(next)
      await nextFrames(1)
      for (let i = 0; i < 3; i++) {
        api.invalidate()
        await nextFrames(1)
      }
      api.gl.render(api.scene, api.camera)
      ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
      ctx.drawImage(api.gl.domElement, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
      return out.toDataURL('image/png')
    }
    window.__rendererReady = true
  }, [api])

  return (
    <div style={{ width: OUTPUT_SIZE, height: OUTPUT_SIZE }}>
      <Canvas
        dpr={SUPERSAMPLE}
        frameloop="demand"
        camera={{ position: [0, 0.55, 3.55], fov: 34 }}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
      >
        <CameraAim />
        <ExposeRenderer onReady={setApi} />
        <SceneLights />
        {build && (
          <>
            <BarModel build={build} mode="full" size="lg" autoRotate={false} fitFrame />
            <ContactShadows
              position={[0, -0.93, 0]}
              opacity={0.3}
              scale={2.4}
              blur={2.8}
              far={2.2}
              color="#3d2314"
            />
          </>
        )}
      </Canvas>
    </div>
  )
}
