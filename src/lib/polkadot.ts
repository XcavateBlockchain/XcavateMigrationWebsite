import { u8aToHex } from '@polkadot/util'

export interface PolkadotAccount {
  address: string
  name?: string
  source: string
}

export class NoExtensionError extends Error {
  constructor() {
    super('No Polkadot extension found')
    this.name = 'NoExtensionError'
  }
}

export class NoAccountsError extends Error {
  constructor() {
    super('The extension exposes no accounts')
    this.name = 'NoAccountsError'
  }
}

/**
 * Enables the polkadot.js extension (and compatible wallets) and returns the
 * accounts it exposes. Imported lazily so the extension bundle only loads on
 * the user's click — web3Enable must run from a user gesture anyway.
 */
export async function connectPolkadot(): Promise<PolkadotAccount[]> {
  const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp')
  const extensions = await web3Enable('realXmarket migration')
  if (extensions.length === 0) throw new NoExtensionError()

  const accounts = await web3Accounts()
  if (accounts.length === 0) throw new NoAccountsError()

  return accounts.map((a) => ({
    address: a.address,
    name: a.meta.name,
    source: a.meta.source,
  }))
}

/**
 * Signs the payload digest with the extension's raw signer. The extension
 * wraps the bytes in `<Bytes>…</Bytes>` before signing; the API's sr25519
 * scheme verifies exactly that wrapping.
 */
export async function signWithPolkadot(address: string, digest: Uint8Array): Promise<string> {
  const { web3FromAddress } = await import('@polkadot/extension-dapp')
  const injector = await web3FromAddress(address)
  const signRaw = injector.signer.signRaw
  if (!signRaw) throw new Error('This wallet cannot sign raw messages')
  const { signature } = await signRaw({ address, data: u8aToHex(digest), type: 'bytes' })
  return signature
}

export function shortAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 1) return address
  return `${address.slice(0, chars)}…${address.slice(-chars)}`
}
