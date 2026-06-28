import { useCallback, useEffect, useRef, useState } from 'react'
import type { WaitGameTuning } from '@chill-bar/shared'
import { Button } from '@/components/ui/button'
import { useSubmitWaitGame } from './useSubmitWaitGame'

interface Props {
  tuning: WaitGameTuning['chillStack']
  disabled?: boolean
  onDone?: (score: number) => void
}

interface Block {
  x: number
  w: number
}

export function ChillStack({ tuning, disabled, onDone }: Props) {
  const submit = useSubmitWaitGame()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [blocks, setBlocks] = useState<Block[]>([{ x: 40, w: 120 }])
  const [moving, setMoving] = useState({ x: 0, dir: 1 })
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const startRef = useRef(Date.now())
  const animRef = useRef<number>(0)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)
    blocks.forEach((b, i) => {
      const y = height - 24 - i * 22
      ctx.fillStyle = i % 2 === 0 ? '#F26522' : '#243447'
      ctx.fillRect(b.x, y, b.w, 18)
      ctx.font = '14px sans-serif'
      ctx.fillText('☕', b.x + b.w / 2 - 7, y - 4)
    })
    if (!gameOver) {
      const y = height - 24 - blocks.length * 22
      ctx.fillStyle = '#FF8C4D'
      ctx.fillRect(moving.x, y, blocks[blocks.length - 1]?.w ?? 120, 18)
    }
  }, [blocks, gameOver, moving.x])

  useEffect(() => {
    if (gameOver) return
    const loop = () => {
      setMoving((m) => {
        let x = m.x + m.dir * 2.5
        let dir = m.dir
        const w = blocks[blocks.length - 1]?.w ?? 120
        if (x <= 0 || x + w >= 200) dir *= -1
        x = Math.max(0, Math.min(200 - w, x + dir * 2.5))
        return { x, dir }
      })
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [gameOver, blocks])

  useEffect(() => {
    draw()
  }, [draw, moving, blocks, gameOver])

  const drop = async () => {
    if (disabled || gameOver || submitting) return
    const top = blocks[blocks.length - 1]
    const overlap = Math.min(top.x + top.w, moving.x + top.w) - Math.max(top.x, moving.x)
    if (overlap <= 8) {
      setGameOver(true)
      setSubmitting(true)
      try {
        await submit('chillStack', score, Date.now() - startRef.current)
        onDone?.(score)
      } finally {
        setSubmitting(false)
      }
      return
    }
    const newX = Math.max(top.x, moving.x)
    const newW = overlap
    setBlocks((b) => [...b, { x: newX, w: newW }])
    setScore((s) => s + tuning.blockPoints)
    if (blocks.length + 1 >= tuning.maxBlocks) {
      setGameOver(true)
      setSubmitting(true)
      try {
        await submit('chillStack', score + tuning.blockPoints, Date.now() - startRef.current)
        onDone?.(score + tuning.blockPoints)
      } finally {
        setSubmitting(false)
      }
    }
  }

  const reset = () => {
    setBlocks([{ x: 40, w: 120 }])
    setMoving({ x: 0, dir: 1 })
    setScore(0)
    setGameOver(false)
    startRef.current = Date.now()
  }

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <p className="text-sm font-medium">امتیاز: {score}</p>
      <canvas ref={canvasRef} width={200} height={280} className="rounded-xl border" />
      {!gameOver ? (
        <Button className="w-full max-w-xs" size="lg" onClick={() => void drop()} disabled={disabled}>
          رها کن
        </Button>
      ) : (
        <div className="space-y-2 text-center">
          <p className="text-sm text-muted-foreground">{submitting ? 'ثبت امتیاز…' : 'پایان!'}</p>
          <Button variant="outline" onClick={reset} disabled={disabled || submitting}>
            دوباره
          </Button>
        </div>
      )}
    </div>
  )
}
