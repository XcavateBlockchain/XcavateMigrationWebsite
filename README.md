# XcavateMigrationWebsite

Migration website for migrating accounts from Polkadot to Solana.

Users connect a Polkadot wallet (via the polkadot.js extension), pick the account to migrate,
choose a Solana destination (by connecting a Solana wallet such as Phantom/Solflare, or by
pasting an address), and press **CONVERT**. The app asks the Polkadot wallet for one sr25519
signature and registers the pair with the [XcavateProfile API](https://github.com/pyrahermesagent/XcavateProfile)
at `https://profile-api.xcavate.io`. If the connected account is already migrated, its
registered Solana destination is shown instead.

Built with Vue 3 + Vite + TypeScript, styled after the realXmarket design system.

## How the signing works

`POST /api/migrations` requires the XcavateProfile signature headers
(`X-SS58-Address`, `X-Signature`, `X-Timestamp`). The app:

1. Builds the canonical body `{"ss58address":…,"solanaAddress":…}` (compact JSON, C# field order)
   and sends exactly that string as the request body.
2. Hashes it with Blake2b-128 and hex-encodes the digest uppercase with a `0x` prefix.
3. Builds the payload `POST:/api/migrations:{bodyHash}:{timestamp}`, where the timestamp is
   ISO-8601 UTC padded to 7 fractional digits (the .NET round-trip format).
4. Signs the Blake2b-128 digest of that payload via the extension's `signRaw` — the
   `<Bytes>…</Bytes>` wrapping the extension applies is verified explicitly by the server.

Migration status checks are prefix-tolerant: if a direct `GET /api/migrations/{address}` lookup
misses, the app compares public keys across the full migration list, so an account registered
under a different SS58 prefix is still recognised.

## Development

```bash
npm install
npm run dev     # local dev server
npm run build   # type-check + production build into dist/
```

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes it to
GitHub Pages. One-time setup: in the repository settings, set **Settings → Pages → Source** to
**GitHub Actions**.

The workflow builds with `BASE_PATH=/<repo-name>/` so assets resolve under the project page URL.
If you serve the site from a custom domain instead, remove that env var from the workflow.
