import { blake2b } from 'blakejs'

/**
 * Request signing for the XcavateProfile API.
 *
 * Every state-changing request signs the payload string
 *
 *     {METHOD}:{path}:{blake2b_128_hex_of_body}:{timestamp}
 *
 * where the body hash is the Blake2b-128 digest of the canonical JSON body,
 * hex-encoded exactly the way the server's `Utils.Bytes2HexString` emits it
 * (`0x` prefix, UPPERCASE digits), and the timestamp uses .NET's round-trip
 * format with 7 fractional-second digits. An sr25519 signer signs the
 * Blake2b-128 digest of the payload, not the payload text — and the
 * polkadot.js extension additionally wraps whatever it signs in
 * `<Bytes>…</Bytes>`, which the server accepts explicitly.
 */

const encoder = new TextEncoder()

/** `0x` + UPPERCASE hex — must match the server's Utils.Bytes2HexString. */
export function hexUpper(bytes: Uint8Array): string {
  return (
    '0x' +
    Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  )
}

/**
 * The canonical JSON the server hashes for a WalletMigration body: compact,
 * with fields in C# declaration order. The exact string returned here must
 * also be sent as the request body so hash and body cannot drift apart.
 */
export function canonicalMigrationBody(ss58address: string, solanaAddress: string): string {
  return JSON.stringify({ ss58address, solanaAddress })
}

/**
 * ISO-8601 UTC timestamp padded to 7 fractional digits, matching the .NET
 * round-trip ("o") format the server re-serializes X-Timestamp with.
 */
export function isoTimestamp(): string {
  return new Date().toISOString().replace('Z', '0000Z')
}

/** Builds `{METHOD}:{path}:{bodyHash}:{timestamp}`. */
export function buildPayload(method: string, path: string, body: string, timestamp: string): string {
  const bodyHash = hexUpper(blake2b(encoder.encode(body), undefined, 16))
  return `${method}:${path}:${bodyHash}:${timestamp}`
}

/** The 16-byte Blake2b-128 digest of the payload — what sr25519 signs. */
export function payloadDigest(payload: string): Uint8Array {
  return blake2b(encoder.encode(payload), undefined, 16)
}
