/**
 * What the client can honestly show after a successful registration. The API
 * echoes back only the pair it stored, so the signature and the moment of
 * signing come from this session rather than from the server.
 */
export interface Receipt {
  from: string
  to: string
  signature: string
  signedAt: string
}

export function receiptJson(receipt: Receipt): string {
  return JSON.stringify(
    {
      from_polkadot: receipt.from,
      to_solana: receipt.to,
      signature: receipt.signature,
      signed_at: receipt.signedAt,
    },
    null,
    2,
  )
}
