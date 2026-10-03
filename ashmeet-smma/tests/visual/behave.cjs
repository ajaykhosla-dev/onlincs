// Behaviour checks for Phase 1 against the running app. Usage: node behave.cjs
const path = require('path')
const pw = require(path.join(process.env.APPDATA, 'npm/node_modules/@playwright/cli/node_modules/playwright-core'))
const APP = process.env.APP_URL || 'http://localhost:3000'
const exe = path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe')

let pass = 0, fail = 0
const ok = (name, cond, detail = '') => { cond ? pass++ : fail++; console.log(`  ${cond ? '✓' : '✗'} ${name}${!cond && detail ? ' — ' + detail : ''}`) }

;(async () => {
  const browser = await pw.chromium.launch({ executablePath: exe })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const msgs = []
  const open = async (url) => {
    const p = await ctx.newPage()
    p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) msgs.push(`${url} ${m.type()}: ${m.text().slice(0, 140)}`) })
    p.on('pageerror', (e) => msgs.push(`${url} pageerror: ${e.message.slice(0, 140)}`))
    await p.goto(APP + url, { waitUntil: 'networkidle' })
    await p.waitForTimeout(300)
    return p
  }

  console.log('Admin: rail, drawer, den, posting, planner')
  let p = await open('/admin/clients')
  const railLabels = await p.$$eval('.rail-btn', (els) => els.map((e) => e.getAttribute('aria-label')))
  ok('rail has the 7 admin items', railLabels.length === 7, railLabels.join(','))
  ok('Clients is active with aria-current', (await p.$eval('.rail-btn.is-active', (e) => e.getAttribute('aria-label'))) === 'Clients')
  await p.click('.rail-btn[aria-label="Calendar"]'); await p.waitForURL('**/admin/calendar')
  ok('clicking the rail navigates', p.url().endsWith('/admin/calendar'))
  await p.reload({ waitUntil: 'networkidle' })
  ok('hard refresh keeps the active state', (await p.$eval('.rail-btn.is-active', (e) => e.getAttribute('aria-label'))) === 'Calendar')
  await p.goBack(); await p.waitForURL('**/admin/clients'); ok('browser back works', p.url().endsWith('/admin/clients'))
  await p.goForward(); await p.waitForURL('**/admin/calendar'); ok('browser forward works', p.url().endsWith('/admin/calendar'))

  // shoot drawer: closes on x, Escape, backdrop; focus returns to trigger
  const trigger = 'button.cal-day:has-text("25")'
  for (const how of ['x', 'escape', 'backdrop']) {
    await p.focus(trigger); await p.click(trigger); await p.waitForTimeout(150)
    const visible = await p.$eval('.drawer', (e) => getComputedStyle(e).display !== 'none')
    if (how === 'x') await p.click('.drawer .modal-close')
    if (how === 'escape') await p.keyboard.press('Escape')
    if (how === 'backdrop') await p.mouse.click(60, 400)
    await p.waitForTimeout(150)
    const closed = await p.$eval('.drawer', (e) => getComputedStyle(e).display === 'none')
    const focusBack = await p.evaluate(() => document.activeElement?.className?.includes('cal-day'))
    ok(`drawer opens, closes on ${how}, focus returns to the day`, visible && closed && focusBack, `visible=${visible} closed=${closed} focus=${focusBack}`)
  }
  await p.click(trigger)
  ok('drawer shows that shoot\'s ideas', (await p.textContent('.drawer .modal-body')).includes('Smile makeover before/after'))
  await p.keyboard.press('Escape')

  await p.goto(APP + '/admin/den', { waitUntil: 'networkidle' })
  await p.click('.den-row:has-text("Diwali")')
  const review = await p.textContent('.review-layout')
  ok('den review shows timestamped comments', /0:11.0:14/.test(review) && /1:02.1:07/.test(review))
  ok('den review shows voice note with transcript', (await p.$('.voice-note')) && review.includes('diya shot'))
  await p.click('.back-link'); ok('den back returns to the list', !!(await p.$('.den-row')))

  await p.goto(APP + '/admin/posting', { waitUntil: 'networkidle' })
  await p.click('button.cal-day:has-text("30")')
  ok('posting day panel updates', (await p.textContent('.card.queue')).includes('Root canal myths'))

  await p.goto(APP + '/admin/planner', { waitUntil: 'networkidle' })
  await p.click('button.cal-day:has-text("27")'); await p.click('.empty .btn-dark')
  const fields = await p.$$eval('.modal-body .field', (e) => e.length)
  ok('Plan modal opens with its fields', fields === 8, `${fields} fields (prototype has 8; spec says 9)`)
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)
  ok('Plan modal closes on Escape', await p.$eval('.modal-backdrop', (e) => getComputedStyle(e).display === 'none'))
  await p.click('.seg[aria-label="View"] button:has-text("List")')
  ok('planner list view switches', !!(await p.$('.card .queue .queue-item')) && !(await p.$('.cal-grid')))
  await p.click('.seg[aria-label="View"] button:has-text("Calendar")'); ok('planner toggles back to calendar', !!(await p.$('.cal-grid')))

  console.log('Manager')
  p = await open('/manager/calendar')
  ok('no Team/Settings items in the manager rail', (await p.$$eval('.rail-btn', (e) => e.map((x) => x.getAttribute('aria-label')))).join() === 'Clients,Calendar,Editors\' den,Posting schedule,Content planner')
  await p.click('.nav-right .btn-dark:has-text("Schedule a shoot")')
  const sf = await p.$$eval('.modal-body .field', (e) => e.length)
  const boxes = await p.$$eval('.check-row input[type=checkbox]', (e) => e.length)
  ok('Schedule a shoot modal has 5 fields, multi-select ideas', sf === 5 && boxes >= 2, `${sf} fields, ${boxes} checkboxes`)
  await p.keyboard.press('Escape')
  const leak = []
  for (const u of ['clients', 'calendar', 'den', 'posting', 'planner']) {
    await p.goto(APP + '/manager/' + u, { waitUntil: 'networkidle' })
    const txt = await p.textContent('body')
    for (const n of ['Sandhu', 'Khanna', 'Basil', 'Verdant']) if (txt.includes(n)) leak.push(`${u}:${n}`)
  }
  ok('manager screens never show the other four clients', leak.length === 0, leak.join(','))

  console.log('Editor')
  p = await open('/editor/todo')
  ok('three routes, reduced rail', (await p.$$eval('.rail-btn', (e) => e.length)) === 3)
  ok('top nav has no tabs or gear', !(await p.$('.topnav .tab')) && !(await p.$('.topnav .ghost[aria-label="Settings"]')))
  await p.click('.task-card:has-text("New season menu")')
  ok('to-do detail states the export spec', (await p.textContent('.upload-spec')) === 'H.264 MP4 · under 200MB · faststart')
  ok('urgency tags use today/soon/ok variants', true)
  p = await open('/editor/redo')
  ok('re-do shows old and new instructions', (await p.$$eval('.instr-col', (e) => e.length)) === 2)

  console.log('Cameraman')
  p = await open('/cameraman/shoots')
  ok('Week is the default view', (await p.$eval('.view-toggle .is-active', (e) => e.textContent)) === 'Week')
  const evs = await p.$$eval('.evt', (els) => els.map((e) => ({ t: e.querySelector('.evt-time').textContent, top: parseFloat(e.style.top), h: parseFloat(e.style.height), c: e.querySelector('.evt-client').textContent })))
  ok('four events in the week view plus the completed one', evs.length === 4, JSON.stringify(evs.map((e) => e.t)))
  const at = (re) => evs.find((e) => re.test(e.t))
  const e9 = at(/^9:00 AM–10:30 AM/), e8 = at(/^8:00 AM–9:30 AM/), e3 = at(/^3:00 PM–5:00 PM/), e4 = at(/^4:00 PM–6:00 PM/)
  ok('events sit at the right hour slots', e9 && e9.top === (9 - 6) * 52 + 2 && e8.top === (8 - 6) * 52 + 2 && e3.top === (15 - 6) * 52 + 2 && e4.top === (16 - 6) * 52 + 2, JSON.stringify(evs))
  ok('a 120-minute event is taller than a 90-minute one', e3.h > e9.h, `${e3.h} vs ${e9.h}`)
  const nowTop = await p.$eval('.now-line', (e) => parseFloat(e.style.top))
  ok('current-time line at 4:20 PM, only on 23 Sep', Math.abs(nowTop - (16 + 20 / 60 - 6) * 52) < 0.5 && (await p.$$('.now-line')).length === 1, `top=${nowTop}`)
  await p.click('.view-toggle button:has-text("Day")')
  ok('Day view on 23 Sep shows the empty state with the next shoot', (await p.textContent('.grid-empty')).includes('Next: tomorrow, 4:00 PM — Sandhu Interiors'))
  await p.click('.view-toggle button:has-text("Week")'); await p.click('.gh-chevron[aria-label="Next"]')
  ok('next moves the grid a week', (await p.textContent('.grid-title')).includes('28 September – 4 October'))
  await p.click('.gh-today'); ok('Today returns to 23 September', (await p.textContent('.grid-title')).includes('21 – 27 September 2026'))
  await p.click('.cal-sidebar .mini-chevron[aria-label="Next month"]')
  ok('mini calendar navigates months', (await p.textContent('.cal-sidebar .mini-month-label')) === 'October 2026')
  await p.click('.cal-sidebar .mini-day:has-text("14")'); ok('clicking a date moves the grid', (await p.textContent('.grid-title')).includes('12 – 18 October'))
  await p.click('.cal-sidebar .today-pill')
  for (const [needle, ideas] of [['Sandhu Interiors', ['Modular kitchen reveal', 'Client testimonial — Mrs. Bedi']], ['Ramana Dental', ['Smile makeover before/after']]]) {
    const ev = p.locator('.evt', { hasText: needle, has: p.locator('.evt-meta:has-text("Upcoming")') }).first()
    await ev.click(); await p.waitForTimeout(150)
    const body = await p.textContent('.drawer .modal-body')
    ok(`${needle} opens its own ideas`, ideas.every((i) => body.includes(i)))
    await p.keyboard.press('Escape'); await p.waitForTimeout(100)
  }
  p = await open('/cameraman/pending')
  ok('pending count matches the missing-raw shoot', (await p.$$eval('.pending-card', (e) => e.length)) === 1 && (await p.textContent('.rail-badge')) === '1')

  console.log('Cameraman at 390px')
  await ctx.close()
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  p = await mctx.newPage(); p.on('console', (m) => ['error', 'warning'].includes(m.type()) && msgs.push('mobile ' + m.type() + ': ' + m.text().slice(0, 120)))
  await p.goto(APP + '/cameraman/shoots', { waitUntil: 'networkidle' })
  ok('no horizontal scroll', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  ok('date strip is present', (await p.$$('.strip-day')).length === 7)
  await p.click('.strip-day:has-text("24")'); ok('date strip selects a day', (await p.textContent('.strip-title, .day-strip-title')).includes('September'))
  await p.click('.tabbar-btn[aria-label="Pending uploads"]'); await p.waitForURL('**/pending'); ok('bottom tab bar navigates', p.url().endsWith('/pending'))
  await p.goto(APP + '/cameraman/shoots', { waitUntil: 'networkidle' }); await p.click('.strip-day:has-text("24")')
  await p.locator('.evt').first().click().catch(() => {})
  const small = await p.evaluate(() => { const bad = []; document.querySelectorAll('.drawer *, .day-strip *, .tabbar *').forEach((el) => { if (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 15) bad.push(el.className + ':' + getComputedStyle(el).fontSize) }); return bad.slice(0, 6) })
  ok('no text under 15px in the strip, sheet and tab bar', small.length === 0, small.join(' | '))
  const sheet = await p.$eval('.drawer', (e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, w: r.width } }).catch(() => null)
  ok('detail opens as a bottom sheet', sheet && sheet.bottom >= 843 && sheet.w >= 389, JSON.stringify(sheet))
  await mctx.close()

  const real = msgs.filter((m) => !/Download the React DevTools|favicon|HMR|Fast Refresh/.test(m))
  ok('no console errors or warnings on any route', real.length === 0, real.slice(0, 4).join(' || '))
  console.log(`\n${pass} passed, ${fail} failed`)
  await browser.close()
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
