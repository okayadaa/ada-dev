# adamarys — interactive 3D personal site

> A single-page sunflower meadow built with Next.js and Three.js. Sky, lighting, and stars follow the visitor's local time.

[![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.183-000?style=flat-square&logo=three.js)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

![Sunflower field demo](./docs/demo.gif)

This repo powers my personal site: a single-page 3D sunflower field where the sky transitions through dawn, day, dusk, and night based on the visitor's local time. It's built with Next.js 16 (App Router) and Three.js, with procedural geometry and a small set of focused modules under `lib/`.

## Highlights

- **Time-of-day sky** — 24h gradient shader in [`lib/timeOfDay.ts`](lib/timeOfDay.ts); drives sky color, lighting, and star visibility
- **Procedural scene** — flowers, grass, clouds, and stars generated in [`app/components/threeScene.tsx`](app/components/threeScene.tsx) (no external 3D models)
- **Interactive social layer** — 3D GitHub/LinkedIn icons + HTML overlay links from [`lib/createLogos.ts`](lib/createLogos.ts); About opens [`app/components/aboutModal.tsx`](app/components/aboutModal.tsx)
- **Responsive performance** — entity counts and pixel ratio scale by viewport; full Three.js cleanup on unmount
- **Branded loader** — minimum display + fade orchestrated in [`app/components/sceneWithLoader.tsx`](app/components/sceneWithLoader.tsx)

## Architecture

```mermaid
flowchart TB
  subgraph next [Next.js App Router]
    page["app/page.tsx"]
    layout["app/layout.tsx"]
    loader["sceneWithLoader.tsx"]
    scene["threeScene.tsx"]
    modal["aboutModal.tsx"]
  end

  subgraph lib [Scene libraries]
    timeOfDay["timeOfDay.ts"]
    logos["createLogos.ts"]
    clouds["clouds.ts"]
    stars["stars.ts"]
    links["siteLinks.ts"]
  end

  page --> loader
  loader --> scene
  scene --> timeOfDay
  scene --> clouds
  scene --> stars
  scene --> logos
  logos --> links
  links --> modal
```

[`app/page.tsx`](app/page.tsx) renders a single route. [`sceneWithLoader.tsx`](app/components/sceneWithLoader.tsx) waits for scene initialization and enforces loader timing. [`threeScene.tsx`](app/components/threeScene.tsx) owns the WebGL lifecycle — renderer, camera, animation loop, resize handling, and cleanup. [`lib/`](lib/) holds isolated concerns: sky/time, clouds, stars, clickable logos, and external link config in [`siteLinks.ts`](lib/siteLinks.ts).

## Project structure

| Path | Responsibility |
|------|----------------|
| `app/page.tsx` | Single-page entry |
| `app/components/threeScene.tsx` | Main Three.js scene |
| `app/components/sceneWithLoader.tsx` | Loader + scene handoff |
| `app/components/aboutModal.tsx` | About bio modal |
| `lib/timeOfDay.ts` | Sky shader + time-based lighting |
| `lib/createLogos.ts` | 3D social icons + DOM overlays |
| `lib/clouds.ts` | Procedural cloud sprites |
| `lib/stars.ts` | Point-cloud stars (night only) |
| `lib/siteLinks.ts` | Centralized link config |
| `public/icons/` | Social icon textures |

## Local development

```bash
npm install
npm run dev
# → http://localhost:3000
```

**Preview a specific time of day** — lock the sky to any hour (0–23):

```
http://localhost:3000?hour=19
```

Other scripts:

```bash
npm run build   # production build
npm run start   # serve production build
npm run lint    # ESLint
```

## Implementation notes

- **Single route by design** — immersive homepage, not a multi-page site
- **Client-side 3D** — Three.js runs in a client component; Next.js handles shell, fonts, and metadata
- **Time sync** — sky uses the visitor's local clock; `?hour=` overrides for dev preview
- **Accessibility** — `aria-label` on links/modal, Escape to close, `100svh` on mobile
- **Assets** — 2D textures only (`public/images/`, `public/icons/`); geometry is procedural
.
