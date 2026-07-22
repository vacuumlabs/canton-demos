import type { AtomicSwap, Contract, DemoAllocation, DemoHolding, DemoTokenRules, Party, SwapProposal, SwapTerms } from '../types'
import { CheckIcon } from './Icons'

export interface CompletedSwap {
  id: string
  otherParty: string
  terms: SwapTerms
}

interface Props {
  proposals: Contract<SwapProposal>[]
  swaps: Contract<AtomicSwap>[]
  allocations: Contract<DemoAllocation>[]
  holdings: Contract<DemoHolding>[]
  rules: Contract<DemoTokenRules>[]
  parties: Party[]
  actingParty: string
  completed: CompletedSwap[]
  busy: boolean
  onAccept: (contractId: string) => void
  onDecline: (contractId: string) => void
  onCancel: (contractId: string) => void
  onReserve: (swap: Contract<AtomicSwap>, holdingCid: string, rulesCid: string) => void
  onComplete: (swap: Contract<AtomicSwap>, offeredAllocationCid: string, requestedAllocationCid: string) => void
}

function friendlyParty(id: string, parties: Party[]) {
  return parties.find((party) => party.party === id)?.hint ?? id.split('::')[0]
}

function friendlyAmount(amount: string) {
  return Number(amount).toLocaleString('en-US', { maximumFractionDigits: 10 })
}

function allocationFor(allocations: Contract<DemoAllocation>[], swap: Contract<AtomicSwap>, leg: string) {
  return allocations.find((allocation) => allocation.payload.allocation.settlement.settlementRef.id === swap.payload.terms.tradeId
    && allocation.payload.allocation.settlement.settlementRef.cid === swap.payload.tradeCid
    && allocation.payload.allocation.transferLegId === leg)
}

function Avatar({ name }: { name: string }) {
  return <span className="swap-avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
}

function Terms({ terms }: { terms: SwapTerms }) {
  return <span>{Number(terms.offeredAmount).toLocaleString('en-US')} {terms.offeredInstrument.id} for {Number(terms.requestedAmount).toLocaleString('en-US')} {terms.requestedInstrument.id}</span>
}

function Progress({ funded, complete }: { funded: boolean; complete: boolean }) {
  const steps = [{ label: 'Accepted', done: true }, { label: 'Funds ready', done: funded }, { label: 'Complete', done: complete }]
  return <div className="swap-progress" aria-label={`Swap progress: ${complete ? 'complete' : funded ? 'funds ready' : 'accepted'}`}>
    {steps.map((step, index) => <div className={`progress-step ${step.done ? 'progress-step--done' : ''}`} key={step.label}>
      <span className="progress-dot">{step.done ? <CheckIcon /> : index + 1}</span>
      <span>{step.label}</span>
    </div>)}
  </div>
}

export function ConsumerSwaps({ proposals, swaps, allocations, holdings, rules, parties, actingParty, completed, busy, onAccept, onDecline, onCancel, onReserve, onComplete }: Props) {
  const incoming = proposals.filter((proposal) => proposal.payload.counterparty === actingParty)
  const outgoing = proposals.filter((proposal) => proposal.payload.proposer === actingParty)
  const hasItems = incoming.length + outgoing.length + swaps.length + completed.length > 0

  return <section className="surface swaps-panel" aria-labelledby="swaps-title">
    <h2 id="swaps-title">Your swaps</h2>
    <div className="swap-list">
      {incoming.map((proposal) => {
        const name = friendlyParty(proposal.payload.proposer, parties)
        return <article className="swap-row swap-row--incoming" key={proposal.contractId}>
          <Avatar name={name} />
          <div className="swap-row-content"><strong>{name} wants to swap</strong><p><Terms terms={proposal.payload.terms} /></p></div>
          <div className="swap-actions"><button className="small-primary" disabled={busy} onClick={() => onAccept(proposal.contractId)}>Accept</button><button className="small-secondary" disabled={busy} onClick={() => onDecline(proposal.contractId)}>Not now</button></div>
        </article>
      })}

      {outgoing.map((proposal) => {
        const name = friendlyParty(proposal.payload.counterparty, parties)
        return <article className="swap-row" key={proposal.contractId}>
          <Avatar name={name} />
          <div className="swap-row-content"><strong>Waiting for {name}</strong><p><Terms terms={proposal.payload.terms} /></p></div>
          <button className="text-button row-action" disabled={busy} onClick={() => onCancel(proposal.contractId)}>Cancel</button>
        </article>
      })}

      {swaps.map((swap) => {
        const offered = allocationFor(allocations, swap, 'offered')
        const requested = allocationFor(allocations, swap, 'requested')
        const bothFunded = Boolean(offered && requested)
        const isProposer = swap.payload.proposer === actingParty
        const isCounterparty = swap.payload.counterparty === actingParty
        const leg = isProposer ? 'offered' : 'requested'
        const myAllocation = leg === 'offered' ? offered : requested
        const instrument = leg === 'offered' ? swap.payload.terms.offeredInstrument : swap.payload.terms.requestedInstrument
        const amount = leg === 'offered' ? swap.payload.terms.offeredAmount : swap.payload.terms.requestedAmount
        const holding = holdings.find((item) => item.payload.owner === actingParty && item.payload.instrumentId.admin === instrument.admin && item.payload.instrumentId.id === instrument.id && Number(item.payload.amount) >= Number(amount))
        const rule = rules.find((item) => item.payload.admin === instrument.admin && item.payload.supportedInstrumentIds.includes(instrument.id))
        const other = friendlyParty(isProposer ? swap.payload.counterparty : swap.payload.proposer, parties)
        return <article className="swap-row swap-row--active" key={swap.contractId}>
          <Avatar name={other} />
          <div className="swap-row-content swap-row-content--wide">
            <strong>Swap with {other}</strong>
            <p><Terms terms={swap.payload.terms} /></p>
            <Progress funded={bothFunded} complete={false} />
            {!myAllocation && holding && rule ? <button className="small-primary progress-action" disabled={busy} onClick={() => onReserve(swap, holding.contractId, rule.contractId)}>Make {friendlyAmount(amount)} {instrument.id} ready</button> : null}
            {!myAllocation && (!holding || !rule) ? <p className="action-help action-help--error">You do not have enough {instrument.id} for this swap.</p> : null}
            {myAllocation && !bothFunded ? <p className="action-help">Your funds are ready. Waiting for {other}.</p> : null}
            {bothFunded && isProposer && offered && requested ? <button className="small-primary progress-action" disabled={busy} onClick={() => onComplete(swap, offered.contractId, requested.contractId)}>Complete swap</button> : null}
            {bothFunded && isCounterparty ? <p className="action-help">Everything is ready. Waiting for {other} to complete.</p> : null}
          </div>
        </article>
      })}

      {completed.map((swap) => <article className="swap-row swap-row--complete" key={swap.id}>
        <Avatar name={swap.otherParty} />
        <div className="swap-row-content swap-row-content--wide"><strong>Swap with {swap.otherParty}</strong><p><Terms terms={swap.terms} /></p><Progress funded complete /></div>
      </article>)}

      {!hasItems ? <div className="empty-swaps"><span className="empty-swap-mark">↔</span><strong>No swaps yet</strong><p>Your swap requests will appear here.</p></div> : null}
    </div>
  </section>
}
