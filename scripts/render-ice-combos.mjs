#!/usr/bin/env node
/**
 * Renders every active ice cream builder combination (base × coating × filling)
 * from the database as a square transparent PNG using the web app's 3D bar model.
 *
 * Usage: node scripts/render-ice-combos.mjs [--out <dir>] [--size 2048] [--only <baseId>]
 *        [--force] [--timeout <ms>]
 * Existing PNGs are skipped unless --force is passed, so an interrupted run can resume.
 * Env:   DATABASE_URL (falls back to packages/api/.env, then .env), CHROME_PATH
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : fallback
}

const outDir = path.resolve(root, arg('out', 'exports/ice-cream-combos'))
const size = Number(arg('size', '2048'))
const onlyBase = arg('only', null)
const port = Number(arg('port', '5199'))
const force = process.argv.includes('--force')
const renderTimeoutMs = Number(arg('timeout', '60000'))

function loadEnv() {
  if (process.env.DATABASE_URL) return
  for (const file of ['packages/api/.env', '.env']) {
    const p = path.join(root, file)
    if (existsSync(p)) process.loadEnvFile(p)
    if (process.env.DATABASE_URL) return
  }
}

async function loadOptions() {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  try {
    const rows = await prisma.iceCreamOption.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    const map = (o) => ({
      id: o.id,
      name: o.name.trim(),
      color: o.color,
      texture: o.texture,
      priceMod: o.priceMod,
      emoji: o.emoji,
      hotBoost: o.hotBoost ?? undefined,
      coldBoost: o.coldBoost ?? undefined,
      visualProfile: o.visualProfile ?? null,
    })
    return {
      bases: rows.filter((o) => o.type === 'BASE').map(map),
      coatings: rows.filter((o) => o.type === 'COATING').map(map),
      fillings: rows.filter((o) => o.type === 'FILLING').map(map),
    }
  } finally {
    await prisma.$disconnect()
  }
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean)
  const found = candidates.find((p) => existsSync(p))
  if (!found) throw new Error('Chrome/Chromium not found; set CHROME_PATH')
  return found
}

async function launchChrome(userDataDir) {
  const proc = spawn(
    findChrome(),
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      `--window-size=${size},${size}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = ''
    const timer = setTimeout(() => reject(new Error('Chrome did not start')), 20000)
    proc.stderr.on('data', (d) => {
      buf += d.toString()
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/)
      if (m) {
        clearTimeout(timer)
        resolve(m[1])
      }
    })
    proc.on('exit', (code) => reject(new Error(`Chrome exited (${code})\n${buf}`)))
  })
  return { proc, debugPort: new URL(wsUrl).port }
}

function connectCdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    const pending = new Map()
    let nextId = 1
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data)
      const p = msg.id && pending.get(msg.id)
      if (!p) return
      pending.delete(msg.id)
      if (msg.error) p.reject(new Error(msg.error.message))
      else p.resolve(msg.result)
    })
    ws.addEventListener('error', reject)
    ws.addEventListener('open', () =>
      resolve({
        send(method, params = {}) {
          const id = nextId++
          ws.send(JSON.stringify({ id, method, params }))
          return new Promise((res, rej) => pending.set(id, { resolve: res, reject: rej }))
        },
        close: () => ws.close(),
      }),
    )
  })
}

async function evaluate(cdp, expression) {
  const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (exceptionDetails) {
    throw new Error(exceptionDetails.exception?.description || exceptionDetails.text)
  }
  return result.value
}

function withTimeout(promise, ms, label) {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    }),
  ]).finally(() => clearTimeout(timer))
}

async function reloadPage(cdp) {
  await cdp.send('Page.reload', { ignoreCache: true })
  const deadline = Date.now() + 60000
  while (!(await evaluate(cdp, 'window.__rendererReady === true').catch(() => false))) {
    if (Date.now() > deadline) throw new Error('Render page did not become ready')
    await new Promise((r) => setTimeout(r, 300))
  }
}

async function renderWithRetry(cdp, build, attempts = 3) {
  const expression = `window.__renderCombo(${JSON.stringify(build)})`
  for (let attempt = 1; ; attempt++) {
    try {
      return await withTimeout(evaluate(cdp, expression), renderTimeoutMs, 'Render')
    } catch (err) {
      if (attempt >= attempts) throw err
      console.warn(`  retry ${attempt}: ${err.message}`)
      await reloadPage(cdp)
    }
  }
}

async function main() {
  loadEnv()
  const { bases, coatings, fillings } = await loadOptions()
  const selectedBases = onlyBase ? bases.filter((b) => b.id === onlyBase) : bases
  const total = selectedBases.length * coatings.length * fillings.length
  console.log(
    `Active options: ${bases.length} bases, ${coatings.length} coatings, ${fillings.length} fillings → ${total} renders`,
  )
  if (total === 0) return

  const { createServer } = await import('vite')
  const webRoot = path.join(root, 'apps/web')
  const server = await createServer({
    root: webRoot,
    configFile: path.join(webRoot, 'vite.config.ts'),
    logLevel: 'warn',
    server: { port, strictPort: true, host: '127.0.0.1' },
  })
  await server.listen()

  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'ice-render-'))
  const { proc, debugPort } = await launchChrome(userDataDir)
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      proc.kill()
      server.close().finally(() => process.exit(130))
    })
  }

  try {
    const pageUrl = `http://127.0.0.1:${port}/render-combos.html?size=${size}`
    const target = await (
      await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(pageUrl)}`, {
        method: 'PUT',
      })
    ).json()
    const cdp = await connectCdp(target.webSocketDebuggerUrl)
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: size,
      height: size,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await reloadPage(cdp)

    await mkdir(outDir, { recursive: true })
    const manifest = []
    let done = 0
    for (const base of selectedBases) {
      for (const coating of coatings) {
        for (const filling of fillings) {
          const file = `${base.id}__${coating.id}__${filling.id}.png`
          const filePath = path.join(outDir, file)
          if (!force && existsSync(filePath)) {
            done++
          } else {
            const started = Date.now()
            const dataUrl = await renderWithRetry(cdp, { base, coating, filling })
            await writeFile(filePath, Buffer.from(dataUrl.split(',')[1], 'base64'))
            done++
            console.log(`${done}/${total} ${file} (${((Date.now() - started) / 1000).toFixed(1)}s)`)
          }
          manifest.push({
            file,
            base: { id: base.id, name: base.name },
            coating: { id: coating.id, name: coating.name },
            filling: { id: filling.id, name: filling.name },
          })
        }
      }
    }
    await writeFile(
      path.join(outDir, 'manifest.json'),
      JSON.stringify({ size, generatedAt: new Date().toISOString(), combos: manifest }, null, 2),
    )
    console.log(`Saved ${done} images to ${path.relative(root, outDir)}`)
    cdp.close()
  } finally {
    proc.kill()
    await server.close()
    await rm(userDataDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
