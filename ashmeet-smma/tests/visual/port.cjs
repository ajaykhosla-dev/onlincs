// Porting helper.
//   node port.cjs css  <proto.html> <out.css>            -> writes the inline <style> block (verbatim, minus .screen switching rules)
//   node port.cjs jsx  <proto.html> <startLine> <endLine> -> prints JSX for that line range (1-based, inclusive)
//   node port.cjs js   <proto.html>                       -> prints the inline <script> block
const fs = require('fs')
const { htmlToJsx } = require('html-to-jsx-transform')
const [, , mode, file, a, b] = process.argv
const src = fs.readFileSync(require('path').join(__dirname, 'protos', file), 'utf8')

if (mode === 'css') {
  const m = src.match(/<style>([\s\S]*?)<\/style>/)
  let css = m[1].trim()
  css = css.replace(/^\.screen\s*\{[^}]*\}\s*$/gm, '').replace(/^\.screen\.is-visible\s*\{[^}]*\}\s*$/gm, '')
  fs.writeFileSync(a, css + '\n')
  console.log('wrote', a, css.split('\n').length, 'lines')
} else if (mode === 'jsx') {
  const lines = src.split('\n').slice(Number(a) - 1, Number(b))
  let out = htmlToJsx(lines.join('\n'))
  // the converter emits JS escapes inside JSX attribute strings, which JSX would print literally
  out = out.replace(/\\x([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  out = out.replace(/\\u([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  // uncontrolled inputs: value -> defaultValue, checked -> defaultChecked
  out = out.replace(/<(input|textarea)\b[^>]*>/g, (tag) => tag.replace(/ value=/g, ' defaultValue=').replace(/ checked=\{true\}/g, ' defaultChecked'))
  console.log(out)
} else if (mode === 'js') {
  const m = src.match(/<script>([\s\S]*?)<\/script>/)
  console.log(m ? m[1] : '(no script)')
}
