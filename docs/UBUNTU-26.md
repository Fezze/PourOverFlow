# Ubuntu 26 setup

## Runtime

Recommended baseline:

- Node `24.x`
- npm `11.x`

Fallback baseline if a future Zeus release regresses on Node 24:

- Node `22.x`
- npm `10.x`

The repo currently validates against Node 24 locally and keeps Node 22 only as a documented fallback.

## Install

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 24
nvm use 24
npm ci
```

## Environment

Copy `.env.example` if you want a local shell template, then adjust paths as needed.

Typical Linux values:

```bash
export PLAYWRIGHT_COVERAGE_BROWSER=/snap/bin/chromium
export ZEPP_SIMULATOR_ROOT="${XDG_CONFIG_HOME:-$HOME/.config}/simulator"
export POF_REPORTS_ROOT=coverage
```

If VS Code runs inside Flatpak, prefer the checked-in wrapper instead of a raw browser path:

```bash
export PLAYWRIGHT_COVERAGE_BROWSER="$PWD/scripts/playwright-flatpak-host-browser.sh"
```

## Doctor

Run the repo doctor before the first full verify pass:

```bash
npm run doctor:ubuntu
```

It checks:

- Node and npm versions
- local Zeus CLI availability
- Chromium-family browser availability for the Playwright harness
- simulator root and common metadata files
- display-server hints relevant to Linux desktop runs

## Verify

The canonical CLI verify path is now:

```bash
npm run verify
```

That path now includes `npm run verify:visual`, which uses the local Chromium-family browser to render the watch preview matrix as a deterministic gate. Keep `PLAYWRIGHT_COVERAGE_BROWSER` set before full verify on Linux.

For a faster local loop:

```bash
npm run verify:fast
```

`npm run verify:fast` intentionally stays short and does not include the visual preview gate.

VS Code still exposes `Verify: all tests and coverage`; it should be treated as equivalent to the same underlying CLI stack, including the visual preview gate.

## Zeus commands

Root-level Zeus commands should go through the repo wrappers:

```bash
npm run build
npm run zepp:dev -- -t "Amazfit Balance 2"
```

The Zeus wrapper now prefers the local `node_modules/.bin/zeus` install and falls back to a global `zeus` only if the local binary is not present.
The wrapper also exports the packaged Zeus `private-modules` path through `NODE_PATH`, because the published CLI currently expects those internal modules to be resolvable at runtime.