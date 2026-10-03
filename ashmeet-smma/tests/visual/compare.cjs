// Screenshot-diff harness: prototype HTML vs running Next app.
// Usage: node compare.cjs [width] [filterSubstring]
const path = require('path')
const fs = require('fs')
const { PNG } = require('pngjs')
const pixelmatch = require('pixelmatch')
const pw = require(path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright-core'))

const W = Number(process.argv[2] || 1440)
const H = W < 600 ? 844 : 900
const filter = process.argv[3] || ''
const APP = process.env.APP_URL || 'http://localhost:3000'
const protoUrl = (f) => 'file:///' + path.join(__dirname, 'protos', f).replace(/\\/g, '/')

const cases = [
  ...['clients', 'calendar', 'den', 'posting', 'planner', 'team', 'settings'].map((s) => ({ id: `admin-${s}`, file: 'admin.html', screen: s, url: `/admin/${s}` })),
  ...['clients', 'calendar', 'den', 'posting', 'planner'].map((s) => ({ id: `manager-${s}`, file: 'brand-manager.html', screen: s, url: `/manager/${s}` })),
  ...['todo', 'redo', 'library'].map((s) => ({ id: `editor-${s}`, file: 'editor.html', screen: s, url: `/editor/${s}` })),
  ...['shoots', 'pending'].map((s) => ({ id: `cameraman-${s}`, file: 'cameraman.html', screen: s, url: `/cameraman/${s}` })),
  { id: 'login', file: 'login.html', screen: null, url: '/auth/login' },
].filter((c) => c.id.includes(filter))

;(async () => {
  const browser = await pw.chromium.launch({ executablePath: path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe') })
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: 'reduce' })
  const out = path.join(__dirname, 'shots', String(W))
  fs.mkdirSync(out, { recursive: true })
  const rows = []
  for (const c of cases) {
    const p = await ctx.newPage()
    const errs = []
    p.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 100)))
    // prototype
    await p.goto(protoUrl(c.file), { waitUntil: 'networkidle' })
    if (c.screen) {
      // click through the DOM so it works even where the rail is hidden (mobile)
      await p.evaluate((sc) => { const b = document.querySelector('.rail-btn[data-screen="' + sc + '"]') || document.querySelector('[data-screen="' + sc + '"]'); if (b) b.click() }, c.screen)
    }
    await p.addStyleTag({ content: '#offline-banner{display:none !important}' })
    await p.waitForTimeout(400)
    const a = await p.screenshot()
    const protoH = await p.evaluate(() => document.documentElement.scrollHeight)
    // app
    await p.goto(APP + c.url, { waitUntil: 'networkidle' })
    await p.waitForTimeout(600)
    const b = await p.screenshot()
    const appH = await p.evaluate(() => document.documentElement.scrollHeight)
    const pa = PNG.sync.read(a), pb = PNG.sync.read(b)
    const w = Math.min(pa.width, pb.width), h = Math.min(pa.height, pb.height)
    const crop = (img) => { const o = new PNG({ width: w, height: h }); PNG.bitblt(img, o, 0, 0, w, h, 0, 0); return o }
    const A = crop(pa), B = crop(pb), D = new PNG({ width: w, height: h })
    const diff = pixelmatch(A.data, B.data, D.data, w, h, { threshold: 0.12 })
    fs.writeFileSync(path.join(out, `${c.id}.proto.png`), a)
    fs.writeFileSync(path.join(out, `${c.id}.app.png`), b)
    fs.writeFileSync(path.join(out, `${c.id}.diff.png`), PNG.sync.write(D))
    rows.push({ id: c.id, diffPct: +(100 * diff / (w * h)).toFixed(1), protoH, appH, consoleErrors: errs.length })
    await p.close()
  }
  console.table(rows)
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
