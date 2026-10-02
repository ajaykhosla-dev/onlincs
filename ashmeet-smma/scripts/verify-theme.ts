/**
 * Theme token verification script (Phase 0, Checkpoint 1).
 * Run: npx tsx scripts/verify-theme.ts
 */

import fs from 'fs'
import path from 'path'

const root = path.resolve(process.cwd())
const themeCss = fs.readFileSync(path.join(root, 'src/styles/theme.css'), 'utf-8')
const tailwindConfig = fs.readFileSync(path.join(root, 'tailwind.config.ts'), 'utf-8')
const layout = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf-8')
const globals = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf-8')

let passed = 0
let failed = 0

function check(name: string, condition: boolean, detail?: string) {
  if (condition) { console.log('  ✓ ' + name); passed++ }
  else { console.error('  ✗ ' + name + (detail ? ' — ' + detail : '')); failed++ }
}

console.log('\n=== Theme Verification ===\n')

// 1. Font
console.log('1. Font:')
check('Plus Jakarta Sans in theme.css', themeCss.includes('Plus Jakarta Sans'))
check('Plus Jakarta Sans in layout.tsx', layout.includes('Plus_Jakarta_Sans'))
check('Plus Jakarta Sans in tailwind config', tailwindConfig.includes('Plus Jakarta Sans'))
check('Font weights 400-800 in theme.css import', themeCss.includes('wght@400') && themeCss.includes('800'))
check('Font weights 400-800 in layout.tsx', layout.includes("'400'") && layout.includes("'800'"))
check('globals.css imports theme.css', globals.includes("import '../styles/theme.css'"))

// 2. CSS custom properties
console.log('\n2. CSS Custom Properties:')
const cssVars = [
  '--violet:', '--violet-deep:', '--violet-soft:',
  '--ink:', '--ink-soft:', '--muted:',
  '--page:', '--surface:', '--tint:',
  '--mint:', '--mint-ink:', '--pink:', '--pink-ink:',
  '--amber:', '--amber-ink:', '--sky:', '--sky-ink:',
  '--lavender:', '--navy:',
  '--r-shell:', '--r-card:', '--r-ctl:',
  '--shadow-card:', '--shadow-shell:',
  '--font:',
]
for (let i = 0; i < cssVars.length; i++) {
  check('CSS var ' + cssVars[i], themeCss.includes(cssVars[i]))
}

// 3. Tailwind config mirrors CSS vars
console.log('\n3. Tailwind Config matches CSS:')
const colorChecks = [
  'violet', 'violet-deep', 'ink', 'mint-ink', 'pink-ink', 'amber-ink', 'sky-ink'
]
const colorValues = ['#6C5CE7', '#5A4AD8', '#1B1B3A', '#0F7A52', '#CE2F66', '#AE6100', '#1D63C0']
for (let i = 0; i < colorChecks.length; i++) {
  check(colorChecks[i] + ' color', tailwindConfig.includes(colorValues[i]) && themeCss.includes(colorValues[i]))
}

// 4. Border radius
console.log('\n4. Border Radius:')
check('r-shell: 30px', themeCss.includes('30px') && tailwindConfig.includes("shell: '30px'"))
check('r-card: 22px', themeCss.includes('22px') && tailwindConfig.includes("card: '22px'"))
check('r-ctl: 14px', themeCss.includes('14px') && tailwindConfig.includes("ctl: '14px'"))

// 5. Shadows
console.log('\n5. Shadows:')
check('boxShadow in tailwind config', tailwindConfig.includes('boxShadow'))
check('shadow-card value in tailwind config', tailwindConfig.includes("card: '0 2px 6px"))
check('shadow-shell value in tailwind config', tailwindConfig.includes("shell: '0 24px 70px"))
check('--shadow-card in CSS', themeCss.includes('--shadow-card'))
check('--shadow-shell in CSS', themeCss.includes('--shadow-shell'))

// 6. Env file
console.log('\n6. Env file:')
const envLocal = fs.readFileSync(path.join(root, '.env.local'), 'utf-8')
check('.env.local exists', envLocal.length > 0)
check('GOOGLE_CLIENT_ID set', envLocal.includes('GOOGLE_CLIENT_ID='))
check('GOOGLE_SHARED_DRIVE_ID set', envLocal.includes('GOOGLE_SHARED_DRIVE_ID='))
check('SUPABASE_URL set', envLocal.includes('NEXT_PUBLIC_SUPABASE_URL='))
check('SUPABASE_SERVICE_ROLE_KEY set', envLocal.includes('SUPABASE_SERVICE_ROLE_KEY='))
check('AUTH_SECRET set', envLocal.includes('AUTH_SECRET='))

// 7. App structure
console.log('\n7. App Structure:')
check('src/app/layout.tsx exists', fs.existsSync(path.join(root, 'src/app/layout.tsx')))
check('src/app/globals.css exists', fs.existsSync(path.join(root, 'src/app/globals.css')))
check('src/styles/theme.css exists', fs.existsSync(path.join(root, 'src/styles/theme.css')))
check('tailwind.config.ts exists', fs.existsSync(path.join(root, 'tailwind.config.ts')))

console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===\n')
process.exit(failed > 0 ? 1 : 0)
