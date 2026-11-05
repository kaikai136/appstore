# Cockpit App Store

English | [简体中文](README_zh.md)

**Cockpit App Store** is a Git-driven, static directory of open-source and self-hosted applications. This is **one repository** containing the application catalog, a standalone Astro website, and its build/deployment workflows.

> This is an independent community catalog, **not an official Cockpit project**. It is currently informational and does not provide installation inside Cockpit or guarantee that the included Docker Compose packages are compatible with Cockpit.

## Project structure

```text
.
├── apps/                  # Application metadata, icons, README, version templates
├── data.yaml              # Store identity and category definitions
├── website/               # Astro static website and catalog generator
│   ├── src/               # Pages, components, layouts, catalog config
│   ├── scripts/           # Generate/validate catalog, audit brand, verify output
│   ├── public/            # Brand assets and generated application icons/data
│   └── dist/              # Static output (generated; Git-ignored)
├── .github/workflows/
│   ├── cockpit-site.yml   # One-repository website CI/CD
│   └── ...                # Existing application maintenance workflows
├── docs/ARCHITECTURE.md
├── package.json           # Root shortcuts into website/
└── LICENSE
```

## Quick start

Requires **Node.js 22+**. Run commands from the repository root:

```bash
npm run setup            # Install website dependencies
npm run dev              # Start Astro dev server
npm run check            # Validate data, brand and TypeScript
npm run build            # Generate full static website
npm run preview          # Preview website/dist
```

The generator reads `apps/` and `data.yaml` in this same repository. **No submodules, clone steps, additional repositories, server-side database, or web search API are required.** The generated site is located at `website/dist/` and can be hosted by Nginx, a CDN, or GitHub Pages.

For build configuration and CI publishing, see [Architecture](docs/ARCHITECTURE.md) and [Website](website/README.md).

## App catalog

Each app under `apps/<key>/` has its own `data.yml`, documentation, logo and version directories containing package metadata and optional Compose templates. Adding or updating an application automatically changes the next site build.

The website currently excludes `ai-gateway` and `ai-portal` because they are tightly coupled to another platform. Display overrides are maintained in `website/src/config/catalog-overrides.yaml`, not in the original application packages.

## Publishing

`.github/workflows/cockpit-site.yml` validates and builds the site on relevant pushes/PRs. Build artifacts can be downloaded for self-hosting.

GitHub Pages is **opt-in**. To enable Pages deployment from `dev`, configure repository variables `COCKPIT_DEPLOY_PAGES=true`, `SITE_URL` and `SITE_BASE`, and enable the GitHub Actions source in Pages settings. See [Architecture](docs/ARCHITECTURE.md).

## Attribution and compatibility

The included catalog/packages use an upstream community app package format and retain some original 1Panel-specific deployment semantics, such as `PANEL_*` environment variables and `1panel-network`. **These files are retained as-is for accuracy and have not been converted into native Cockpit installers.** Upstream source and format references: [1Panel App Store](https://github.com/1Panel-dev/appstore). This repository retains its existing [GPL-3.0 license](LICENSE); individual app names, logos and other materials may have separate rights and licenses.

Contributions should preserve technical correctness, original licenses and source attribution rather than mechanically replacing deployment variables with new brand names.
