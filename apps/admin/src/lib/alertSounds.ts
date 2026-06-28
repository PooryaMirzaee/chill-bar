import type { AdminAlertSoundId } from '@chill-bar/shared'

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioCtx = new Ctx()
    }
    if (audioCtx.state === 'suspended') void audioCtx.resume()
    return audioCtx
  } catch {
    return null
  }
}

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  osc.connect(gain)
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

export function playAlertSound(id: AdminAlertSoundId, volume = 0.7) {
  const ctx = getCtx()
  if (!ctx) return
  const v = Math.max(0.05, Math.min(1, volume))
  const t0 = ctx.currentTime

  switch (id) {
    case 'chime':
      tone(ctx, 880, t0, 0.28, v * 0.35)
      tone(ctx, 1175, t0 + 0.16, 0.32, v * 0.35)
      break
    case 'bell':
      tone(ctx, 784, t0, 0.45, v * 0.4, 'triangle')
      tone(ctx, 988, t0 + 0.08, 0.5, v * 0.25, 'sine')
      break
    case 'kitchen':
      tone(ctx, 520, t0, 0.12, v * 0.45, 'square')
      tone(ctx, 520, t0 + 0.2, 0.12, v * 0.45, 'square')
      tone(ctx, 660, t0 + 0.4, 0.2, v * 0.4, 'square')
      break
    case 'urgent':
      for (let i = 0; i < 4; i++) {
        tone(ctx, 940, t0 + i * 0.14, 0.1, v * 0.5, 'sawtooth')
      }
      break
    case 'soft':
      tone(ctx, 440, t0, 0.55, v * 0.22, 'sine')
      tone(ctx, 554, t0 + 0.2, 0.45, v * 0.15, 'sine')
      break
  }
}
