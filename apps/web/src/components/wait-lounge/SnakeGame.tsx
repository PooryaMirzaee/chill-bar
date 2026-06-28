import { useCallback, useEffect, useRef, useState } from 'react'
import type { WaitGameTuning } from '@chill-bar/shared'
import { Button } from '@/components/ui/button'
import { useSubmitWaitGame } from './useSubmitWaitGame'

interface Props {
  tuning: WaitGameTuning['snakeGame']
  disabled?: boolean
  onDone?: (score: number) => void
}

const FOODS = ['🍯', '🌰', '🍵', '🧆', '🍬'] as const
const GRID = 16
const CELL = 18

type Point = { x: number; y: number }

export function SnakeGame({ tuning, disabled, onDone }: Props) {
  const submit = useSubmitWaitGame()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [snake, setSnake] = useState<Point[]>([{ x: 8, y: 8 }])
  const [dir, setDir] = useState<Point>({ x: 1, y: 0 })
  const [food, setFood] = useState<Point>({ x: 4, y: 4 })
  const [foodEmoji, setFoodEmoji] = useState<string>(FOODS[0])
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const startRef = useRef(Date.now())
  const dirRef = useRef(dir)

  useEffect(() => {
    dirRef.current = dir
  }, [dir])

  const randomFood = useCallback((body: Point[]) => {
    let p: Point
    do {
      p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }
    } while (body.some((s) => s.x === p.x && s.y === p.y))
    setFoodEmoji(FOODS[Math.floor(Math.random() * FOODS.length)])
    return p
  }, [])

  const draw = useCallback(
    (body: Point[], f: Point) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = '#16213e'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#F26522'
      body.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? '#F26522' : '#e8a87c'
        ctx.fillRect(s.x * CELL, s.y * CELL, CELL - 1, CELL - 1)
      })
      ctx.font = `${CELL - 4}px serif`
      ctx.fillText(foodEmoji, f.x * CELL + 1, f.y * CELL + CELL - 4)
    },
    [foodEmoji],
  )

  useEffect(() => {
    if (!running || gameOver) return
    const id = window.setInterval(() => {
      setSnake((prev) => {
        const d = dirRef.current
        const head = { x: prev[0].x + d.x, y: prev[0].y + d.y }
        if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID) {
          setGameOver(true)
          setRunning(false)
          return prev
        }
        if (prev.some((s) => s.x === head.x && s.y === head.y)) {
          setGameOver(true)
          setRunning(false)
          return prev
        }
        const next = [head, ...prev]
        if (head.x === food.x && head.y === food.y) {
          const pts = Math.min(tuning.maxPoints, score + tuning.pointsPerFood)
          setScore(pts)
          setFood(randomFood(next))
        } else {
          next.pop()
        }
        draw(next, food)
        return next
      })
    }, 140)
    return () => window.clearInterval(id)
  }, [running, gameOver, food, draw, randomFood, score, tuning])

  useEffect(() => {
    draw(snake, food)
  }, [draw, snake, food])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Point> = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
      }
      const next = map[e.key]
      if (!next) return
      e.preventDefault()
      setDir((d) => {
        if (d.x + next.x === 0 && d.y + next.y === 0) return d
        return next
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const endGame = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await submit('snakeGame', score, Date.now() - startRef.current)
      onDone?.(score)
    } finally {
      setSubmitting(false)
    }
  }, [onDone, score, submit, submitting])

  useEffect(() => {
    if (gameOver && score > 0) void endGame()
  }, [gameOver, score, endGame])

  const start = () => {
    if (disabled) return
    setSnake([{ x: 8, y: 8 }])
    setDir({ x: 1, y: 0 })
    setFood(randomFood([{ x: 8, y: 8 }]))
    setScore(0)
    setGameOver(false)
    setRunning(true)
    startRef.current = Date.now()
  }

  const steer = (d: Point) => {
    setDir((cur) => {
      if (cur.x + d.x === 0 && cur.y + d.y === 0) return cur
      return d
    })
  }

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <p className="text-sm font-medium">امتیاز: {score}</p>
      <canvas ref={canvasRef} width={GRID * CELL} height={GRID * CELL} className="rounded-xl border" />
      {!running && !gameOver && (
        <Button className="w-full max-w-xs" onClick={start} disabled={disabled}>
          شروع
        </Button>
      )}
      {running && (
        <div className="grid grid-cols-3 gap-1">
          <div />
          <Button size="icon" variant="outline" onClick={() => steer({ x: 0, y: -1 })}>↑</Button>
          <div />
          <Button size="icon" variant="outline" onClick={() => steer({ x: -1, y: 0 })}>←</Button>
          <Button size="icon" variant="outline" onClick={() => steer({ x: 0, y: 1 })}>↓</Button>
          <Button size="icon" variant="outline" onClick={() => steer({ x: 1, y: 0 })}>→</Button>
        </div>
      )}
      {gameOver && (
        <p className="text-sm text-muted-foreground">{submitting ? 'ثبت…' : 'بازی تمام شد'}</p>
      )}
    </div>
  )
}
