import { decodeAddress } from '@polkadot/util-crypto'
import { u8aToHex } from '@polkadot/util'
import { buildPayload, canonicalMigrationBody, isoTimestamp, payloadDigest } from './signing'

export const API_BASE = 'https://profile-api.xcavate.io'

export interface WalletMigration {
  ss58address: string
  solanaAddress: string
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function errorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => '')
  if (!text) return `Request failed (${res.status})`
  try {
    const json = JSON.parse(text)
    if (typeof json === 'string') return json
    if (json && typeof json.title === 'string') return json.title
  } catch {
    // plain-text body — fall through
  }
  return text
}

export async function getMigration(ss58address: string): Promise<WalletMigration | null> {
  const res = await fetch(`${API_BASE}/api/migrations/${encodeURIComponent(ss58address)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res))
  return res.json()
}

export async function listMigrations(): Promise<WalletMigration[]> {
  const res = await fetch(`${API_BASE}/api/migrations`)
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res))
  return res.json()
}

/**
 * Looks up the migration registered for an account. The API keys migrations
 * by the literal SS58 string, so an account registered under a different
 * SS58 prefix would miss on a direct lookup — fall back to comparing public
 * keys across the full list.
 */
export async function findMigrationFor(ss58address: string): Promise<WalletMigration | null> {
  const direct = await getMigration(ss58address)
  if (direct) return direct

  const publicKey = u8aToHex(decodeAddress(ss58address))
  const all = await listMigrations()
  return (
    all.find((m) => {
      try {
        return u8aToHex(decodeAddress(m.ss58address)) === publicKey
      } catch {
        return false
      }
    }) ?? null
  )
}

/**
 * Registers an SS58 → Solana migration. `sign` receives the 16-byte payload
 * digest and must return the sr25519 signature as 0x-prefixed hex — for the
 * polkadot.js extension that is `signer.signRaw({ type: 'bytes' })`, whose
 * `<Bytes>…</Bytes>` wrapping the server verifies against explicitly.
 */
export async function registerMigration(
  ss58address: string,
  solanaAddress: string,
  sign: (digest: Uint8Array) => Promise<string>,
): Promise<WalletMigration> {
  const body = canonicalMigrationBody(ss58address, solanaAddress)
  const timestamp = isoTimestamp()
  const payload = buildPayload('POST', '/api/migrations', body, timestamp)
  const signature = await sign(payloadDigest(payload))

  const res = await fetch(`${API_BASE}/api/migrations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-SS58-Address': ss58address,
      'X-Signature': signature,
      'X-Timestamp': timestamp,
    },
    body,
  })
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res))
  return res.json()
}
