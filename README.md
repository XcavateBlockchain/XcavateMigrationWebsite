# XcavateMigrationWebsite

Migration website for migrating accounts from Polkadot to Solana.

Users connect a Polkadot wallet (via the polkadot.js extension) and pick the account to migrate
in a modal, choose a Solana destination (by connecting a Solana wallet such as Phantom/Solflare,
or by pasting an address), then confirm and sign in step 3. The app asks the Polkadot wallet for
one sr25519 signature and registers the pair with the
[XcavateProfile API](https://github.com/pyrahermesagent/XcavateProfile) at
`https://profile-api.xcavate.io`. If the connected account is already migrated, its registered
Solana destination is shown instead.

Built with Vue 3 + Vite + TypeScript.

## Design

The page implements `Migration.dc.html` from the
[realXmarket design system](https://claude.ai/design/p/5554b34f-5fe6-4fe4-bdc3-43e8334efa4a)
project. Tokens (colour, type, radii, elevation, motion) are transcribed from that project's
`_ds/…/tokens/*.css` into `src/styles/tokens.css`; `components.css` and `page.css` build the
page's components from them. Two illustrated category marks (`public/category-tick.png`,
`public/category-exclamation.png`) are copied verbatim from the design project — per the system's
own rules those bitmaps are never redrawn.

Three places deliberately depart from the prototype, which mocked its data:

- The Polkadot panel shows the account's **wallet source and migration status** instead of the
  prototype's property-token counts; this app has no holdings API.
- The Solana panel offers one **connect** button plus an address field rather than per-wallet
  Phantom/Solflare buttons, because `connectSolanaWallet()` auto-detects the injected provider and
  pasting an address is a supported destination.
- Step 3 shows the **canonical request body** the signature authorises, not a prose message. The
  wallet is handed a Blake2b digest of `POST:/api/migrations:{bodyHash}:{timestamp}`, so a
  human-readable "message you'll sign" would misstate what is signed.

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
