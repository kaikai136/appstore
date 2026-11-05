# Cockpit App Store — Website

This directory is the **website module of the root Cockpit App Store repository**, not a separate Git project. Built with Astro + TypeScript; the production site is entirely static.

## From repository root

```bash
npm run setup
npm run dev
npm run check
npm run build
npm run preview
```

Or run `npm run ...` directly inside `website/` after `npm ci`.

## Shared local catalog

`website/scripts/generate-catalog.mjs` reads these files **from the parent repository**:

- `../data.yaml` — category definitions
- `../apps/<key>/data.yml` — app metadata
- `../apps/<key>/README*.md` and `logo.png` — content and icons
- `../apps/<key>/<version>/data.yml` and `docker-compose.yml` — version information and dependency detection

It generates:

```text
website/src/data/catalog.json       (build-only app index)
website/src/data/details/*.json     (build-only app details)
website/public/data/apps.json       (static JSON catalog)
website/public/data/manifest.json   (source SHA, build timestamp, counts)
website/public/icons/*.png          (copied application icons)
website/dist/                       (published Astro site)
```

All generated files are Git-ignored. `APPSTORE_SOURCE` is an optional local override only for explicit testing against another app directory; the normal setup needs **no override**.

The catalog cards and filters are rendered and searched locally in the browser; there is no runtime search endpoint. Each `/apps/<key>/` detail is generated as static HTML.

## Branding & safety

Website branding lives in `src/config/brand.ts`. Display exclusions/priority are in `src/config/catalog-overrides.yaml`. The source deployment templates under `../apps/` are not modified by website builds.

The site does not claim to be a Cockpit official app or an installer. Existing upstream template variables are not blindly replaced. Required source attribution remains visible on the legal page.

## Deploy

The **only website CI** is `../.github/workflows/cockpit-site.yml`. It checks out this repository once, runs root `npm run setup/check/build` and uploads `website/dist/`. There are no cross-repository events, second checkout steps or website-local GitHub Actions.

GitHub Pages publishing is opt-in using `COCKPIT_DEPLOY_PAGES`, `SITE_URL` and `SITE_BASE` repository variables. Otherwise use the dist artifact for Nginx/CDN. See `../docs/ARCHITECTURE.md`.
