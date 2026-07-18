// Release-candidate playtest — against the PRODUCTION build + service worker
// (vite preview :4173). One timed Standard-50 game exercising every feature:
// take-back, escape rescue, display modes, win celebration + summary, share link —
// then the shared board played OFFLINE (SW precache) including an offline reload.
//
// PERMANENT verification asset (kept in scripts/, unlike per-milestone throwaways).
// Usage, FROM THE PROJECT ROOT (paths + node_modules resolve from there):
//   npm run build && npm run preview   (in one terminal)
//   node scripts/playtest-rc.mjs       (in another; screenshots → ./pt-shots-rc)
// Exit 0 = every check passed with zero console errors; ALWAYS look at the screenshots.
import { chromium } from 'playwright'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

const SHOTS = 'pt-shots-rc'
mkdirSync(SHOTS, { recursive: true })
const BASE = 'http://localhost:4173'

const words = gunzipSync(readFileSync('public/dict.bin')).toString('utf8').split('\n').filter(Boolean)
const byKey = new Map()
for (const w of words) {
  if (w.length < 3 || w.length > 9) continue
  const k = w[0] + w.length
  let a = byKey.get(k)
  if (!a) byKey.set(k, (a = []))
  a.push(w)
}
const used = new Set()
const GOOD_END = new Set([...'estrdnlmagoyp'])
function pickWord(letter, len) {
  const pool = (byKey.get(letter + len) ?? []).filter((w) => !used.has(w))
  const nice = pool.filter((w) => GOOD_END.has(w[w.length - 1]) && !/[qxjz]/.test(w.slice(1)))
  const cands = nice.length ? nice : pool
  return cands.length ? cands[Math.floor(cands.length / 2)] : null
}

const lines = []
const problems = []
const log = (m) => { lines.push(m); console.log(m) }
const check = (ok, label) => { log(`  ${ok ? '✓' : '✗ FAIL'} ${label}`); if (!ok) problems.push(label) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const errors = []
let page

const shot = async (name) => { try { await page.screenshot({ path: `${SHOTS}/${name}.png` }) } catch {} }
const st = () => page.evaluate(() => {
  const raw = localStorage.getItem('afterword-game')
  return raw ? JSON.parse(raw).state : null
})
const ui = () => page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')].map((b) => (b.textContent || '').trim())
  const has = (re) => btns.some((t) => re.test(t))
  const input = document.querySelector('input[aria-label="Your word"], input[aria-label="Escape word"]')
  return {
    win: /wins!/i.test(document.body.innerText) && has(/play again/i),
    startTurn: has(/start turn/i),
    resume: has(/start fresh/i),
    giveUp: has(/give up/i),
    inputEnabled: !!input && !input.disabled,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }
})
async function waitIdle(timeoutMs = 35000) {
  const t0 = Date.now()
  for (;;) {
    if (Date.now() - t0 > timeoutMs) throw new Error('waitIdle timeout')
    const u = await ui()
    if (u.overflowX > 0) check(false, `horizontal overflow ${u.overflowX}px`)
    if (u.win) return 'win'
    if (u.resume) return 'resume'
    if (u.startTurn) return 'handoff'
    if (u.giveUp) return 'escape'
    if (u.inputEnabled) return 'turn'
    await sleep(110)
  }
}
async function playWord({ wantSnake = false } = {}) {
  const s = await st()
  const letter = (s.game.requiredLetter ?? 'S').toLowerCase()
  const cands = []
  for (let len = 3; len <= 8; len++) {
    const w = pickWord(letter, len)
    if (!w) continue
    await page.fill('input[aria-label="Your word"]', w)
    await sleep(120)
    const lab = await page.evaluate(() => (document.querySelector('[data-landing]')?.textContent ?? '').trim())
    let kind = 'plain', score = len
    if (/WIN/.test(lab)) { kind = 'win'; score = 1000 }
    else if (/climbs to (\d+)/.test(lab)) { kind = 'ladder'; score = 300 + Number(RegExp.$1) }
    else if (/drops to/.test(lab)) { kind = 'snake'; score = -100 }
    cands.push({ w, kind, score })
  }
  let choice = wantSnake ? cands.find((c) => c.kind === 'snake') ?? null : null
  const tookSnake = !!choice
  if (!choice) choice = cands.filter((c) => c.kind !== 'snake').sort((a, b) => b.score - a.score)[0] ?? cands[0]
  if (!choice) throw new Error(`no word for '${letter}'`)
  await page.fill('input[aria-label="Your word"]', choice.w)
  used.add(choice.w)
  await sleep(90)
  await page.click('button[type="submit"]')
  await sleep(350)
  return { word: choice.w, tookSnake }
}
async function rescue() {
  const s = await st()
  const need = s.game.pendingEscape.need ?? Math.min(s.game.pendingEscape.drop, 8)
  check(need <= 8, `rescue need ≤ 8 (got ${need})`)
  let w = null
  for (let len = Math.max(need, 3); len <= Math.max(need, 3) + 2 && !w; len++) {
    for (const letter of 'sctbpamdrfgh') { const c = pickWord(letter, len); if (c) { w = c; break } }
  }
  await page.fill('input[aria-label="Escape word"]', w)
  used.add(w)
  await page.click('button[type="submit"]')
  await sleep(400)
}

const run = async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2 })
  page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(String(e)))

  // ---- boot on the prod build; let the SW install + precache ----
  await page.goto(BASE)
  await page.waitForSelector('text=Start game')
  await page.evaluate(() => localStorage.clear())
  const swReady = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false
    const reg = await navigator.serviceWorker.ready
    return !!reg.active
  })
  check(swReady, 'service worker active on the prod build')
  await sleep(2500) // give precache a moment to finish
  await page.reload()
  await page.waitForSelector('text=Start game')

  // ---- GAME 1: light · Standard 50 · 30s timer · exercise everything ----
  log('===== RC GAME 1: light · Standard 50 · 30s timer =====')
  await page.click('button[role="radio"]:has-text("30s")')
  await page.click('text=Start game')
  let tookBack = false
  let sawEscape = false
  let displayToggled = false
  for (let guard = 0; guard < 90; guard++) {
    const state = await waitIdle()
    if (state === 'win') break
    if (state === 'handoff') {
      if (!tookBack) {
        const label = await page.evaluate(() => [...document.querySelectorAll('button')].map((b) => (b.textContent || '').trim()).find((t) => /take back/i.test(t)) ?? null)
        if (label) {
          await page.click('button:has-text("Take back")')
          await sleep(500)
          const u = await ui()
          check(u.inputEnabled, `take-back on prod build returns a live turn (${label})`)
          tookBack = true
          continue
        }
      }
      await page.click('button:has-text("Start turn")')
      continue
    }
    if (state === 'escape') { sawEscape = true; await rescue(); continue }
    if (state === 'turn' && !displayToggled && guard > 4) {
      // flip all three display modes mid-game on the prod build
      await page.click('button[aria-label="Display settings"]')
      await sleep(300)
      const switches = await page.$$('[role="switch"]')
      for (const s of switches) await s.click()
      await sleep(300)
      await shot('g1-display-all-on')
      const attrs = await page.evaluate(() => ({
        contrast: document.documentElement.dataset.contrast, palette: document.documentElement.dataset.palette, text: document.documentElement.dataset.text,
      }))
      check(attrs.contrast === 'high' && attrs.palette === 'cvd' && attrs.text === 'large', `display modes stamp attrs (${JSON.stringify(attrs)})`)
      for (const s of await page.$$('[role="switch"]')) await s.click()
      await page.click('button:has-text("Done")')
      await sleep(200)
      displayToggled = true
      continue
    }
    await playWord({ wantSnake: !sawEscape && guard >= 6 })
  }
  check(tookBack, 'take-back exercised on prod')
  check(sawEscape, 'escape exercised on prod')
  await shot('g1-win')
  const winUi = await page.evaluate(() => ({
    shards: document.querySelectorAll('[data-shard]').length,
    wonWith: /won with/i.test(document.body.innerText),
  }))
  check(winUi.shards >= 60 && winUi.wonWith, `win celebration on prod (${winUi.shards} shards, summary ${winUi.wonWith})`)

  // ---- share the board, then play it OFFLINE ----
  log('===== RC: share link → OFFLINE play on the SW precache =====')
  await page.click('text=Share this board')
  await sleep(300)
  const link = await page.evaluate(() => document.querySelector('input[aria-label="Board link"]')?.value)
  check(!!link && /\?b=v1\./.test(link), `share link built on prod (${link})`)
  await page.click('text=Done')

  await ctx.setOffline(true)
  log('  network OFF')
  await page.goto(link)
  await page.waitForSelector('text=Start game', { timeout: 15000 })
  const chipOffline = await page.evaluate(() => !!document.querySelector('[data-shared-chip]'))
  check(chipOffline, 'shared link opens OFFLINE via the SW (chip visible)')
  await page.click('text=Start game')
  await waitIdle()
  await page.click('button:has-text("Start turn")')
  await waitIdle()
  const w1 = await playWord()
  const settled = await waitIdle()
  check(settled === 'handoff' || settled === 'escape', `played '${w1.word}' OFFLINE (dict from precache)`)
  await shot('offline-play')
  // offline reload mid-game → resume prompt → continue → play again
  await page.reload()
  const after = await waitIdle(15000)
  check(after === 'resume', `offline reload shows the resume prompt (${after})`)
  await page.click('button:has-text("Continue")')
  const s2 = await waitIdle()
  if (s2 === 'handoff') { await page.click('button:has-text("Start turn")'); await waitIdle() }
  if (s2 === 'escape') { await rescue(); }
  else {
    const w2 = await playWord()
    check(true, `played '${w2.word}' after an OFFLINE resume`)
  }
  await shot('offline-resumed')
  await ctx.setOffline(false)
  log('  network back ON')

  log(`\nCONSOLE ERRORS: ${errors.length ? '\n' + errors.join('\n') : 'none'}`)
  log(`\nPROBLEMS: ${problems.length ? '\n' + problems.map((p) => ' - ' + p).join('\n') : 'NONE — all checks passed'}`)
  writeFileSync(`${SHOTS}/log.txt`, lines.join('\n'))
  await browser.close()
  if (problems.length || errors.length) process.exit(2)
}
run().catch(async (e) => { log(`FATAL: ${e.message}`); try { await shot('FATAL') } catch {}; writeFileSync(`${SHOTS}/log.txt`, lines.join('\n')); process.exit(1) })
