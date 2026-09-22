# Zalopay AI Community

React + Vite implementation of the "Zalopay AI Community" design handoff bundle
(see `../README.md`, `../chats/`, `../project/*.dc.html` for the original Claude
Design source and the conversation history it came from).

## Pages

| Route | Source file | Notes |
| --- | --- | --- |
| `/` | `Zalopay AI Space v2.dc.html` | Home — hero with particle-sphere canvas + orbiting AI-tool logos, featured use cases, Questions Waiting for Answers |
| `/use-cases`, `/use-cases/:id` | `Zalopay Use Case Library v2.dc.html` | Library grid/list + detail pages for the 5 real use cases, Share a Use Case modal |
| `/questions` | `Zalopay Questions v2.dc.html` | Threads-style Q&A feed with inline replies, Ask a Question modal |
| `/profile` | `Zalopay Profile v2.dc.html` | Overview / My Posts / Saved |
| `/admin` | `Zalopay Admin Console v2.dc.html` | Hidden — no nav link, direct URL only (matches source) |

## Approach

The `.dc.html` sources are Claude Design prototypes: a custom `<x-dc>` template
DSL (`sc-if`/`sc-for`/`{{ }}` interpolation, compiled by `dc-runtime` in
`project/support.js`) plus a `DCLogic` class per page holding state and a
`renderVals()` that computes everything the template reads. This app ports
each page's real (reachable) behavior and content directly into React:

- `src/lib/style.js` — `css()` parses a CSS-declaration string into a React
  style object, so the source's `style="a:b; c:d;"` strings could be carried
  over close to verbatim instead of hand-converting every declaration into an
  object literal. `hoverClass()` mirrors the source's `style-hover="..."`
  pseudo-class strings by injecting a generated `:hover` rule.
- `src/i18n/` — the VI/EN string table ported from `project/i18n.js`, behind a
  React context (`t()`/`ta()`) instead of the source's DOM-text-walking
  translator.
- `src/components/ImageSlot.jsx` — a simplified stand-in for the source's
  `<image-slot>` (design-tool-only authoring aid with a sidecar file): here
  it's a real click/drag-to-upload placeholder backed by `localStorage`.
- `src/components/TopNav.jsx`, `PageFade.jsx` — the shared header/notifications
  and the cross-page transition fade (the source's `page-transition.js` faded
  a veil over full page reloads; this is a client-side router, so the fade
  runs on route change instead).
- `src/data/*.js` — content ported from each page's `DCLogic` static data
  (the 5 real use cases' text comes from the PDFs in `project/uploads`, as
  written during the design session).

Dead/unreachable template branches in the sources (e.g. the Use Case Library
file's leftover `isHome`/`isSpotlight` views from an earlier "copy starter
component" step, never reachable once `view` defaults to `'library'` and no
button sets it to `'home'`/`'spotlight'`) were identified by tracing state
transitions and intentionally not ported.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```
