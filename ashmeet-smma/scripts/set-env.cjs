// Sets NAME=value pairs in .env.local without printing the values.
// Usage: node scripts/set-env.cjs NAME=value [NAME=value ...]
const fs = require('fs')

const pairs = process.argv.slice(2).map((a) => {
  const i = a.indexOf('=')
  if (i < 1) throw new Error('expected NAME=value, got: ' + a.slice(0, 20))
  return [a.slice(0, i), a.slice(i + 1)]
})
const names = pairs.map(([n]) => n)
const lines = fs
  .readFileSync('.env.local', 'utf8')
  .split(/\r?\n/)
  .filter((l) => l.startsWith('#') || (/^[A-Z][A-Z0-9_]*=/.test(l) && !names.some((n) => l.startsWith(n + '='))))
for (const [n, v] of pairs) lines.push(n + '=' + v)
fs.writeFileSync('.env.local', lines.join('\n') + '\n')
console.log('set', names.join(', '))
