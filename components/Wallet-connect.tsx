"use client"

import { ConnectButton } from "@iota/dapp-kit"

export function WalletConnect() {
  return (
    <div style={{ padding: "1rem", display: "flex", justifyContent: "flex-end" }}>
      <ConnectButton />
    </div>
  )
}

