import { decodeAddress } from '@polkadot/util-crypto'
import { u8aToHex } from '@polkadot/util'
import { getMigration, listMigrations, type WalletMigration } from './api'

/**
 * Address-aware lookup over the migration list. It lives apart from `api.ts`
 * because it is the only caller of the SS58 crypto: keeping the transport
 * layer free of that import lets pages that merely read the list — the /csv
 * export — load without the WASM bundle behind it.
 */

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
