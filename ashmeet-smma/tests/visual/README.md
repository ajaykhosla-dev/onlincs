# Phase 1 visual and behaviour checks

Playwright scripts used to audit the UI against the approved prototypes. They are not part of `npm test`.

- `compare.cjs [width] [filter]` loads each prototype (`protos/*.html` + `protos/theme.css`) and the matching route, screenshots both,
  and reports the pixel difference and page heights. Results land in `shots/<width>/`.
- `behave.cjs` clicks through rail navigation, drawers, modals, focus return, den review, planner toggle, and the cameraman calendar.
- `a11y.cjs` checks all 18 routes for unnamed controls, positive tabindex, duplicate ids, h1 count, focus rings and external hosts.
- `port.cjs` / `scope.cjs` convert a prototype's markup to JSX and scope its inline CSS under a role root class.

Setup: copy `Build files/UI Ref HTML files/*.html` and `src/styles/theme.css` (plus `src/styles/a11y-contrast.css` appended) into `tests/visual/protos/`,
run `npm install --no-save pngjs pixelmatch@5 html-to-jsx-transform postcss postcss-prefix-selector`, start the app (`APP_URL=http://localhost:3001`),
and point the scripts at a local Playwright install.
