// Scopes a prototype's inline CSS under a role root class so it cannot leak across roles.
// usage: node scope.cjs <protoHtml> <rootClass> <outCss>
const fs = require('fs'), path = require('path')
const postcss = require('postcss')
const prefixer = require('postcss-prefix-selector')
const [, , file, root, out] = process.argv
const html = fs.readFileSync(path.join(__dirname, 'protos', file), 'utf8')
let css = html.match(/<style>([\s\S]*?)<\/style>/)[1]
// the prototype's JS-driven screen switching is replaced by routing
css = css.replace(/^\.screen\s*\{[^}]*\}\s*$/gm, '').replace(/^\.screen\.is-visible\s*\{[^}]*\}\s*$/gm, '')
postcss([
  prefixer({
    prefix: '.' + root,
    transform(prefix, selector, prefixed) {
      if (/^(html|body|:root)\b/.test(selector.trim())) return selector.trim().replace(/^(html|body|:root)\b/, prefix)
      if (selector.trim().startsWith('.' + root)) return selector
      return prefixed
    },
  }),
])
  .process(css, { from: undefined })
  .then((r) => {
    fs.writeFileSync(out, '/* Scoped from ' + file + ' (inline <style>) under .' + root + ' */\n' + r.css.trim() + '\n')
    console.log('wrote', out, r.css.split('\n').length, 'lines')
  })
