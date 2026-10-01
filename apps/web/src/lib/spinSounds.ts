/** Lightweight Web Audio SFX for the spin campaign (no asset files). */

let ctx: AudioContext | null = null
let master: GainNode | null = null

const MASTER_GAIN = 1.35

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) {
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = MASTER_GAIN
    master.connect(ctx.destination)
  } else if (master) {
    master.gain.value = MASTER_GAIN
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType,
  gain = 0.45,
  when = 0,
) {
  const c = getCtx()
  if (!c || !master) return
  const t0 = c.currentTime + when
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(Math.min(1.2, gain), t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(g)
  g.connect(master)
  osc.start(t0)
  osc.stop(t0 + duration + 0.03)
}

export function unlockSpinAudio() {
  getCtx()
}

export function playSpinTick(intensity = 1) {
  const f = 860 + Math.random() * 160
  const g = 0.55 * intensity
  tone(f, 0.06, 'square', g)
  tone(f * 1.5, 0.04, 'square', g * 0.45)
}

export function playSpinStart() {
  tone(180, 0.2, 'sawtooth', 0.55)
  tone(280, 0.16, 'triangle', 0.45, 0.04)
  tone(360, 0.12, 'sine', 0.35, 0.08)
}

export function playSpinWin() {
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => {
    tone(f, 0.4, 'triangle', 0.55, i * 0.08)
    tone(f * 2, 0.28, 'sine', 0.28, i * 0.08 + 0.02)
  })
}

export function playSpinLose() {
  tone(240, 0.26, 'sine', 0.4)
  tone(160, 0.36, 'triangle', 0.35, 0.1)
}

export function playClaimSuccess() {
  tone(440, 0.14, 'sine', 0.5)
  tone(660, 0.18, 'triangle', 0.55, 0.08)
  tone(880, 0.28, 'sine', 0.45, 0.16)
}

export function playUiTap() {
  tone(560, 0.06, 'square', 0.35)
}
