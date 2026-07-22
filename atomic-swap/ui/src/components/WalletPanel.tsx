import type { DemoHolding, DemoTokenRules, Contract } from '../types'
import { AssetIcon } from './Icons'

interface WalletAsset {
  key: string
  instrument: string
  amount: number
}

function formatAmount(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 10 }).format(value)
}

export function walletAssets(holdings: Contract<DemoHolding>[], rules: Contract<DemoTokenRules>[], owner: string): WalletAsset[] {
  const byInstrument = new Map<string, WalletAsset>()
  for (const rule of rules) {
    for (const instrument of rule.payload.supportedInstrumentIds) {
      const key = `${rule.payload.admin}|${instrument}`
      byInstrument.set(key, { key, instrument, amount: 0 })
    }
  }
  for (const holding of holdings) {
    if (holding.payload.owner !== owner) continue
    const key = `${holding.payload.instrumentId.admin}|${holding.payload.instrumentId.id}`
    const current = byInstrument.get(key)
    byInstrument.set(key, {
      key,
      instrument: holding.payload.instrumentId.id,
      amount: (current?.amount ?? 0) + Number(holding.payload.amount),
    })
  }
  return [...byInstrument.values()].sort((a, b) => b.amount - a.amount || a.instrument.localeCompare(b.instrument))
}

export function WalletPanel({ holdings, rules, owner }: { holdings: Contract<DemoHolding>[]; rules: Contract<DemoTokenRules>[]; owner: string }) {
  const assets = walletAssets(holdings, rules, owner)
  return <section className="surface wallet-panel" aria-labelledby="wallet-title">
    <h2 id="wallet-title">Your wallet</h2>
    <div className="wallet-list">
      {assets.map((asset) => <div className="wallet-row" key={asset.key}>
        <span className={`asset-icon ${asset.instrument.toUpperCase().includes('USD') ? 'asset-icon--cash' : 'asset-icon--bond'}`}>
          <AssetIcon instrument={asset.instrument} />
        </span>
        <span className="wallet-name">{asset.instrument}</span>
        <strong>{formatAmount(asset.amount)}</strong>
      </div>)}
      {assets.length === 0 ? <p className="empty-copy">No assets yet.</p> : null}
    </div>
  </section>
}
