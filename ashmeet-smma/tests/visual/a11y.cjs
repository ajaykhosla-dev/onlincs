// Accessibility + hygiene audit across the 18 routes.
const path = require('path')
const pw = require(path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright-core'))
const exe = path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe')
const routes = ['admin/clients', 'admin/calendar', 'admin/den', 'admin/posting', 'admin/planner', 'admin/team', 'admin/settings',
  'manager/clients', 'manager/calendar', 'manager/den', 'manager/posting', 'manager/planner',
  'editor/todo', 'editor/redo', 'editor/library', 'cameraman/shoots', 'cameraman/pending', 'auth/login']

;(async () => {
  const b = await pw.chromium.launch({ executablePath: exe })
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  const hosts = new Set()
  let problems = 0
  for (const r of routes) {
    const p = await ctx.newPage()
    p.on('request', (q) => { try { const u = new URL(q.url()); if (u.hostname !== 'localhost') hosts.add(u.hostname) } catch {} })
    await p.goto('http://localhost:3001/' + r, { waitUntil: 'networkidle' })
    const res = await p.evaluate(() => {
      const name = (el) => (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title') || (el.textContent || '').trim())
      const unnamed = [...document.querySelectorAll('button, a[href], [role=button], input:not([type=hidden]), select, textarea')]
        .filter((el) => {
          if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
            return !(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || (el.id && document.querySelector('label[for="' + el.id + '"]')) || el.closest('label'))
          }
          return !name(el)
        })
        .map((el) => el.tagName.toLowerCase() + '.' + (el.className || '').toString().slice(0, 30))
      const posTab = [...document.querySelectorAll('[tabindex]')].filter((e) => parseInt(e.getAttribute('tabindex'), 10) > 0).length
      const ids = [...document.querySelectorAll('[id]')].map((e) => e.id)
      const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i)
      const imgNoAlt = [...document.querySelectorAll('img:not([alt])')].length
      const current = document.querySelectorAll('[aria-current]').length
      const h1 = document.querySelectorAll('h1').length
      return { unnamed, posTab, dupIds, imgNoAlt, current, h1 }
    })
    const bad = res.unnamed.length || res.posTab || res.dupIds.length || res.imgNoAlt || res.h1 !== 1
    if (bad) problems++
    console.log(`${bad ? '✗' : '✓'} ${r}: unnamed=${res.unnamed.length}${res.unnamed.length ? ' ' + res.unnamed.slice(0, 3).join(',') : ''} posTab=${res.posTab} dupIds=${res.dupIds.join(',') || 0} h1=${res.h1} aria-current=${res.current}`)
    await p.close()
  }
  console.log('external hosts contacted:', [...hosts].join(', ') || 'none')

  // visible focus ring
  const p = await ctx.newPage()
  await p.goto('http://localhost:3001/admin/clients', { waitUntil: 'networkidle' })
  const focus = await p.evaluate(async () => {
    const out = []
    for (const sel of ['.rail-btn', '.btn-dark', '.pill-select select', '.kebab', '.tab']) {
      const el = document.querySelector(sel); if (!el) continue
      el.focus({ focusVisible: true }); const cs = getComputedStyle(el)
      out.push(sel + ': outline=' + cs.outlineStyle + ' ' + cs.outlineWidth + ' shadow=' + (cs.boxShadow !== 'none'))
    }
    return out
  })
  console.log('focus styles:\n  ' + focus.join('\n  '))
  await b.close()
  console.log(problems ? `\n${problems} route(s) with problems` : '\nall routes clean')
})()
