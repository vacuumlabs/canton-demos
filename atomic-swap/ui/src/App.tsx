import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AtomicSwap, Contract, DemoAllocation, DemoHolding, DemoTokenRules, ExtraArgs, InstrumentId, Party, SwapProposal, SwapTerms } from './types'
import * as api from './api'
import { ConsumerSwaps, type CompletedSwap } from './components/ConsumerSwaps'
import { ChevronDown, SwapMark, UserIcon } from './components/Icons'
import { Onboarding } from './components/Onboarding'
import { SwapComposer } from './components/SwapComposer'
import { WalletPanel } from './components/WalletPanel'

const DEMO_MODULE = 'OTC.DemoToken'
const ALLOCATION_PACKAGE = '#splice-api-token-allocation-instruction-v1'
const ALLOCATION_MODULE = 'Splice.Api.Token.AllocationInstructionV1'
const EMPTY_EXTRA_ARGS: ExtraArgs = { context: { values: {} }, meta: { values: {} } }

type Connection = 'checking' | 'online' | 'offline'
type Notice = { kind: 'success' | 'error'; message: string }

function isoAfter(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

function isCustomer(party: Party) {
  return !/(bank|issuer)/i.test(party.hint)
}

export default function App() {
  const [base, setBase] = useState(() => localStorage.getItem('otc.base') ?? '')
  const [connection, setConnection] = useState<Connection>('checking')
  const [parties, setParties] = useState<Party[]>([])
  const [actingParty, setActingParty] = useState('')
  const [holdings, setHoldings] = useState<Contract<DemoHolding>[]>([])
  const [rules, setRules] = useState<Contract<DemoTokenRules>[]>([])
  const [allocations, setAllocations] = useState<Contract<DemoAllocation>[]>([])
  const [proposals, setProposals] = useState<Contract<SwapProposal>[]>([])
  const [swaps, setSwaps] = useState<Contract<AtomicSwap>[]>([])
  const [completed, setCompleted] = useState<CompletedSwap[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const customerParties = useMemo(() => parties.filter(isCustomer), [parties])
  const hasDemoWallet = customerParties.some((party) => party.hint === 'Alice') && customerParties.some((party) => party.hint === 'Bob')

  const refreshContracts = useCallback(async (party: string) => {
    if (!party) return
    const [nextHoldings, nextRules, nextAllocations, nextProposals, nextSwaps] = await Promise.all([
      api.queryContracts<DemoHolding>(base, party, 'DemoHolding', DEMO_MODULE),
      api.queryContracts<DemoTokenRules>(base, party, 'DemoTokenRules', DEMO_MODULE),
      api.queryContracts<DemoAllocation>(base, party, 'DemoAllocation', DEMO_MODULE),
      api.queryContracts<SwapProposal>(base, party, 'SwapProposal'),
      api.queryContracts<AtomicSwap>(base, party, 'AtomicSwap'),
    ])
    setHoldings(nextHoldings)
    setRules(nextRules)
    setAllocations(nextAllocations)
    setProposals(nextProposals)
    setSwaps(nextSwaps)
  }, [base])

  const refreshParties = useCallback(async () => {
    setConnection('checking')
    try {
      const next = await api.listParties(base)
      setParties(next)
      setConnection('online')
      setActingParty((current) => next.some((party) => party.party === current) ? current : next.find((party) => party.hint === 'Alice')?.party ?? next.filter(isCustomer)[0]?.party ?? '')
    } catch (error) {
      console.error(error)
      setConnection('offline')
    }
  }, [base])

  useEffect(() => {
    localStorage.setItem('otc.base', base)
    void refreshParties()
  }, [base, refreshParties])

  useEffect(() => {
    if (!actingParty || connection !== 'online') return
    refreshContracts(actingParty).catch((error) => {
      console.error(error)
      setNotice({ kind: 'error', message: 'We could not refresh your wallet. Please try again.' })
    })
  }, [actingParty, connection, refreshContracts])

  async function perform(successMessage: string, action: () => Promise<void>) {
    setBusy(true)
    setNotice(null)
    try {
      await action()
      if (actingParty) await refreshContracts(actingParty)
      setNotice({ kind: 'success', message: successMessage })
    } catch (error) {
      console.error(error)
      setNotice({ kind: 'error', message: 'Something went wrong. Please try again.' })
      throw error
    } finally {
      setBusy(false)
    }
  }

  async function setupDemo() {
    setBusy(true)
    setNotice(null)
    try {
      const known = await api.listParties(base)
      async function findOrCreate(hint: string) {
        const existing = known.find((party) => party.hint === hint)
        if (existing) return existing
        const created = await api.allocateParty(base, hint)
        known.push(created)
        return created
      }
      const [alice, bob, usdBank, bondIssuer] = await Promise.all([
        findOrCreate('Alice'), findOrCreate('Bob'), findOrCreate('USD-Bank'), findOrCreate('Bond-Issuer'),
      ])
      const [aliceRules, aliceHoldings, bobHoldings] = await Promise.all([
        api.queryContracts<DemoTokenRules>(base, alice.party, 'DemoTokenRules', DEMO_MODULE),
        api.queryContracts<DemoHolding>(base, alice.party, 'DemoHolding', DEMO_MODULE),
        api.queryContracts<DemoHolding>(base, bob.party, 'DemoHolding', DEMO_MODULE),
      ])
      if (!aliceRules.some((rule) => rule.payload.admin === usdBank.party && rule.payload.supportedInstrumentIds.includes('USD'))) {
        await api.createContract(base, usdBank.party, 'DemoTokenRules', { admin: usdBank.party, supportedInstrumentIds: ['USD'], observers: [alice.party, bob.party] }, DEMO_MODULE)
      }
      if (!aliceRules.some((rule) => rule.payload.admin === bondIssuer.party && rule.payload.supportedInstrumentIds.includes('BOND-001'))) {
        await api.createContract(base, bondIssuer.party, 'DemoTokenRules', { admin: bondIssuer.party, supportedInstrumentIds: ['BOND-001'], observers: [alice.party, bob.party] }, DEMO_MODULE)
      }
      if (!aliceHoldings.some((holding) => holding.payload.owner === alice.party && holding.payload.instrumentId.admin === usdBank.party && holding.payload.instrumentId.id === 'USD')) {
        await api.createContract(base, [usdBank.party, alice.party], 'DemoHolding', { admin: usdBank.party, owner: alice.party, instrumentId: { admin: usdBank.party, id: 'USD' }, amount: '1200.0' }, DEMO_MODULE)
      }
      if (!bobHoldings.some((holding) => holding.payload.owner === bob.party && holding.payload.instrumentId.admin === bondIssuer.party && holding.payload.instrumentId.id === 'BOND-001')) {
        await api.createContract(base, [bondIssuer.party, bob.party], 'DemoHolding', { admin: bondIssuer.party, owner: bob.party, instrumentId: { admin: bondIssuer.party, id: 'BOND-001' }, amount: '5.0' }, DEMO_MODULE)
      }
      setParties([...known].sort((a, b) => a.hint.localeCompare(b.hint)))
      setActingParty(alice.party)
      await refreshContracts(alice.party)
      setConnection('online')
      setNotice({ kind: 'success', message: 'Your demo wallet is ready.' })
    } catch (error) {
      console.error(error)
      setNotice({ kind: 'error', message: 'We could not set up the demo wallet. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  async function createProposal(counterparty: string, holding: Contract<DemoHolding>, sendAmount: string, receive: InstrumentId, receiveAmount: string) {
    const terms: SwapTerms = {
      tradeId: `trade-${Date.now()}`,
      offeredInstrument: holding.payload.instrumentId,
      offeredAmount: sendAmount,
      requestedInstrument: receive,
      requestedAmount: receiveAmount,
      requestedAt: new Date().toISOString(),
      allocateBefore: isoAfter(15),
      settleBefore: isoAfter(30),
    }
    await perform('Swap request sent.', () => api.createContract(base, actingParty, 'SwapProposal', { proposer: actingParty, counterparty, terms }).then(() => undefined))
  }

  function allocationSpecification(swap: Contract<AtomicSwap>) {
    const offered = {
      settlement: {
        executor: swap.payload.proposer,
        settlementRef: { id: swap.payload.terms.tradeId, cid: swap.payload.tradeCid },
        requestedAt: swap.payload.terms.requestedAt,
        allocateBefore: swap.payload.terms.allocateBefore,
        settleBefore: swap.payload.terms.settleBefore,
        meta: { values: {} },
      },
      transferLegId: 'offered',
      transferLeg: {
        sender: swap.payload.proposer,
        receiver: swap.payload.counterparty,
        amount: swap.payload.terms.offeredAmount,
        instrumentId: swap.payload.terms.offeredInstrument,
        meta: { values: {} },
      },
    }
    return actingParty === swap.payload.proposer ? offered : {
      ...offered,
      transferLegId: 'requested',
      transferLeg: {
        sender: swap.payload.counterparty,
        receiver: swap.payload.proposer,
        amount: swap.payload.terms.requestedAmount,
        instrumentId: swap.payload.terms.requestedInstrument,
        meta: { values: {} },
      },
    }
  }

  const currentParty = customerParties.find((party) => party.party === actingParty)

  return <div className="app-shell">
    <header className="app-header">
      <a className="brand" href="#top" aria-label="Canton Swap home"><SwapMark /><span>Canton Swap</span></a>
      {hasDemoWallet ? <div className="profile-select"><UserIcon /><select aria-label="Choose person" value={actingParty} onChange={(event) => { setNotice(null); setActingParty(event.target.value) }}>{customerParties.map((party) => <option key={party.party} value={party.party}>{party.hint}</option>)}</select><ChevronDown /></div> : null}
    </header>

    {notice ? <div className={`notice notice--${notice.kind}`} role="status">{notice.message}<button aria-label="Dismiss message" onClick={() => setNotice(null)}>×</button></div> : null}

    {!hasDemoWallet || connection !== 'online' ? <Onboarding online={connection === 'online'} checking={connection === 'checking'} busy={busy} base={base} onBaseChange={setBase} onRetry={() => void refreshParties()} onSetup={() => void setupDemo()} /> : <main id="top" className="app-main">
      <div className="hero-copy"><h1>Swap assets</h1><p>Choose what you send and what you want back.<br className="desktop-only" /> Both sides move together—or nothing moves.</p></div>
      <div className="app-grid">
        <SwapComposer holdings={holdings} rules={rules} parties={customerParties} actingParty={actingParty} busy={busy} onSubmit={createProposal} />
        <aside className="app-rail">
          <WalletPanel holdings={holdings} rules={rules} owner={actingParty} />
          <ConsumerSwaps proposals={proposals} swaps={swaps} allocations={allocations} holdings={holdings} rules={rules} parties={customerParties} actingParty={actingParty} completed={completed} busy={busy}
            onAccept={(cid) => void perform('Swap accepted. Now make your assets ready.', () => api.exerciseChoice(base, actingParty, 'SwapProposal', cid, 'Accept', {}))}
            onDecline={(cid) => void perform('Swap declined.', () => api.exerciseChoice(base, actingParty, 'SwapProposal', cid, 'Reject', {}))}
            onCancel={(cid) => void perform('Swap request cancelled.', () => api.exerciseChoice(base, actingParty, 'SwapProposal', cid, 'Cancel', {}))}
            onReserve={(swap, holdingCid, rulesCid) => void perform('Your assets are ready for the swap.', async () => {
              const specification = allocationSpecification(swap)
              await api.exerciseInterfaceChoice(base, actingParty, ALLOCATION_PACKAGE, ALLOCATION_MODULE, 'AllocationFactory', rulesCid, 'AllocationFactory_Allocate', {
                expectedAdmin: specification.transferLeg.instrumentId.admin,
                allocation: specification,
                requestedAt: new Date().toISOString(),
                inputHoldingCids: [holdingCid],
                extraArgs: EMPTY_EXTRA_ARGS,
              })
            })}
            onComplete={(swap, offeredCid, requestedCid) => void perform('Swap complete. Your wallet has been updated.', async () => {
              await api.exerciseChoice(base, actingParty, 'AtomicSwap', swap.contractId, 'Settle', { offeredAllocationCid: offeredCid, requestedAllocationCid: requestedCid, offeredExtraArgs: EMPTY_EXTRA_ARGS, requestedExtraArgs: EMPTY_EXTRA_ARGS })
              setCompleted((items) => [{ id: swap.payload.terms.tradeId, otherParty: customerParties.find((party) => party.party === swap.payload.counterparty)?.hint ?? 'Bob', terms: swap.payload.terms }, ...items])
            })}
          />
        </aside>
      </div>
      <footer><span>Connected to the demo network</span><details><summary>Advanced</summary><label>Network address<input value={base} onChange={(event) => setBase(event.target.value)} placeholder="Use local proxy" /></label></details></footer>
    </main>}
    {currentParty ? <span className="sr-only">Currently using {currentParty.hint}'s wallet</span> : null}
  </div>
}
