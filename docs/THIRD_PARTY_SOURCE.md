# Cockpit App Store Static Source Protocol

Protocol version 1 describes a read-only, HTTPS-hosted application catalog. A source publishes static JSON and package files; it does not provide an installation API or imply that templates are compatible with Cockpit.

## Endpoints

The source root publishes:

- `source.json` - source identity, protocol version, maintainer, homepage, repository, revision, and index path.
- `source/index.json` - catalog summaries and relative application-manifest paths.
- `source/apps/<key>.json` - application metadata and version entries.
- Compose files and icons referenced by relative URLs from the index or application manifest.

All resource URLs are relative to the JSON document that contains them. This allows a source to be hosted at a domain root or beneath a path prefix.

## Identity and versions

`sourceId` must be a stable reverse-domain-like identifier controlled by the source maintainer. An application identity is `<sourceId>/<key>`; clients should not merge applications from different sources solely by display name. `schemaVersion` is an integer. A client must reject an unsupported major protocol version and should ignore unknown optional fields.

Each app manifest contains version entries with architecture declarations, configuration-field descriptions, and optionally a Compose artifact. The artifact includes a relative URL and SHA-256 digest. Clients must verify the digest before saving or processing the downloaded file.

`latestVersion` is null unless the maintainer explicitly selects a valid version through `preferredVersions` in `website/src/config/catalog-overrides.yaml`. Clients must not infer a recommended/latest version from list order or arbitrary version labels. Source `license` describes this catalog; individual application licenses must be checked upstream.

Compose artifacts in this source currently declare `compatibility: "unverified"` and `installable: false`. A client must treat them as reference/download-only content and must not silently execute them as an installation plan.

## Example

`source.json`:

```json
{
  "schemaVersion": 1,
  "sourceId": "example.community",
  "name": "Example Community Apps",
  "maintainer": "Example Maintainer",
  "homepage": "https://example.org",
  "repository": "https://github.com/example/apps",
  "license": "MIT",
  "index": "source/index.json",
  "revision": "0123456789abcdef",
  "appCount": 1
}
```

`source/index.json`:

```json
{
  "schemaVersion": 1,
  "sourceId": "example.community",
  "revision": "0123456789abcdef",
  "appCount": 1,
  "catalog": [
    {
      "id": "example.community/myapp",
      "key": "myapp",
      "name": "My App",
      "summary": "An example application",
      "categories": ["Tools"],
      "manifest": "apps/myapp.json",
      "latestVersion": "1.2.3"
    }
  ]
}
```

## Consuming a source

Clients fetch `source.json`, resolve its `index` against the source root, then resolve each app `manifest` against the index URL. Artifact URLs are resolved against their app-manifest URL. Clients should cache using `revision` or HTTP validators such as ETag/Last-Modified, keep the last known-good index if refresh fails, and show source attribution alongside results.

This repository generates the protocol files during `npm run build`; generated outputs are not committed. To customize source identity, edit `website/src/config/source.json`. `npm run data:validate` validates the generated source and artifact hashes. CI build output contains the complete static source.

The protocol currently provides transport integrity hashes, not publisher authenticity. Do not treat HTTPS or SHA-256 alone as proof that a publisher is trusted. A future protocol revision may add detached Ed25519 signatures and explicit platform-adapter attestations.
