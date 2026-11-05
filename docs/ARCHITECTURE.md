# Cockpit App Store — Architecture

## Repository layout

This repository is a **single Git project**, with one canonical application catalog and one static website.

- `apps/<key>/` — upstream application package metadata, icons, README, and version-specific Docker Compose files
- `data.yaml` — catalog-wide tags/categories and basic project metadata
- `website/` — Astro static site, catalog generator, renderer, and tests
- `.github/workflows/cockpit-site.yml` — monorepo website validation/build and optional publishing
- `.github/workflows/renovate*.yml` — existing application update automation; retained

No submodule, second checkout, `repository_dispatch` event, or application database is required.

## Data flow

```text
data.yaml + apps/<key>/data.yml + apps/<key>/<version>/data.yml
        + README.md + logo.png + docker-compose.yml (read only)
                           |
                 website/scripts/generate-catalog.mjs
                           |
         +-----------------+-----------------+
         |                                   |
website/src/data/catalog.json       website/public/data/apps.json
website/src/data/details/*          website/public/icons/*
         |                                   |
         +------------ Astro SSG ------------+
                           |
                    website/dist/
                           |
               Nginx / GitHub Pages / CDN
```

The browser downloads static assets. Directory search/filter/sort is entirely client-side; the site has no runtime search API or database.

## Project policy

1. Keep upstream `apps/**` directory structure and deploy templates unchanged until a separate, validated Cockpit adapter exists. `PANEL_*` variables and `1panel-network` are original package dependencies, not Cockpit support.
2. Display branding and editorial exclusions are configured in `website/src/config/`. Pages must not claim official Cockpit affiliation or one-click installation.
3. Third-party product names and legally required source credits remain accurate. `LICENSE` is retained.
4. New apps must be automatically included from `apps/`; do not hardcode the application count. The excluded keys `ai-gateway` and `ai-portal` are currently source-platform products.
5. Changes in `apps/`, `data.yaml` or `website/` trigger the same CI workflow. An invalid build must never replace the working published version.
6. `website/src/data/`, `website/public/data/`, `website/public/icons/`, and `website/dist/` are generated outputs and must not be committed.

## CI and deployment

`npm run setup`, `npm run check`, `npm run build` run from the repository root. The website build reads the parent `apps/` and `data.yaml` by default.

GitHub Actions uploads `website/dist/` as a downloadable artifact on push or PR. Pages deployment is intentionally **disabled by default**. To activate from branch `dev`, enable Pages > GitHub Actions and define these repository variables:

- `COCKPIT_DEPLOY_PAGES=true`
- `SITE_URL=https://<owner>.github.io` or the custom site origin
- `SITE_BASE=/appstore/` for project Pages (or `/` for an apex/custom domain)

The source data is checked out once from this same repository. Deployment permissions are scoped to the publish job.

## Future work

Any direct Cockpit installation experience must be implemented only after examining the Cockpit extension model, defining compatible package semantics, and validating deployment security. Such a feature is explicitly out of scope for the static catalog.
