// Generates Afterword's PWA icons from an on-brand "Aw" monogram (Inkwell palette),
// rendering with Fraunces (base64-inlined so it works in headless chromium — no system font).
// Run: node scripts/gen-icons.mjs   → writes public/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fontPath = resolve(root, 'node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2')
const fontB64 = readFileSync(fontPath).toString('base64')

// Inkwell palette: ink #2B2119 bg, cream #F3EAD7 "A", teal #52B7AA "w" + underline.
// Content sits within the centre ~72% (maskable safe zone) so one source serves both.
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'Fraunces';src:url(data:font/woff2;base64,${fontB64}) format('woff2');font-weight:100 900;font-display:block;}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:100%;height:100%;}
.icon{width:100vw;height:100vh;overflow:hidden;display:grid;place-items:center;
  background:
    radial-gradient(115% 90% at 50% -6%, rgba(255,244,220,0.16), transparent 58%),
    #2B2119;}
.mono{position:relative;display:flex;align-items:baseline;
  font-family:'Fraunces';font-weight:600;font-size:44vw;line-height:1;letter-spacing:-0.03em;
  padding-bottom:9vw;}
.a{color:#F3EAD7;}
.w{color:#52B7AA;}
.mono::after{content:'';position:absolute;left:12%;right:12%;bottom:0;height:4.6vw;border-radius:3vw;
  background:#52B7AA;opacity:0.92;}
</style></head><body>
<div class="icon"><div class="mono"><span class="a">A</span><span class="w">w</span></div></div>
</body></html>`

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

const browser = await chromium.launch()
for (const t of targets) {
  const page = await browser.newPage({ viewport: { width: t.size, height: t.size }, deviceScaleFactor: 1 })
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: resolve(root, 'public', t.name) })
  await page.close()
}
await browser.close()
console.log('icons generated:', targets.map((t) => `${t.name} (${t.size})`).join(', '))
