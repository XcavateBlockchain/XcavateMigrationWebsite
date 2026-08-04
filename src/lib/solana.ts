import bs58 from 'bs58'

export interface SolanaWallet {
  name: string
  address: string
}

export class NoSolanaWalletError extends Error {
  constructor() {
    super('No Solana wallet found')
    this.name = 'NoSolanaWalletError'
  }
}

interface SolanaProvider {
  isPhantom?: boolean
  publicKey?: { toBase58?: () => string; toString: () => string } | null
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<unknown>
}

function detectProvider(): { name: string; provider: SolanaProvider } | null {
  const w = window as any
  if (w.phantom?.solana?.isPhantom) return { name: 'Phantom', provider: w.phantom.solana }
  if (w.solana?.isPhantom) return { name: 'Phantom', provider: w.solana }
  if (w.solflare) return { name: 'Solflare', provider: w.solflare }
  if (w.backpack?.solana) return { name: 'Backpack', provider: w.backpack.solana }
  if (w.solana) return { name: 'Solana wallet', provider: w.solana }
  return null
}

export async function connectSolanaWallet(): Promise<SolanaWallet> {
  const found = detectProvider()
  if (!found) throw new NoSolanaWalletError()

  const result = (await found.provider.connect()) as { publicKey?: SolanaProvider['publicKey'] } | boolean
  const key = (typeof result === 'object' && result?.publicKey) || found.provider.publicKey
  if (!key) throw new Error('The wallet did not return a public key')

  const address = typeof key.toBase58 === 'function' ? key.toBase58() : key.toString()
  return { name: found.name, address }
}

/** A Solana address is base58 for exactly 32 bytes of ed25519 public key. */
export function isValidSolanaAddress(address: string): boolean {
  try {
    return bs58.decode(address.trim()).length === 32
  } catch {
    return false
  }
}
