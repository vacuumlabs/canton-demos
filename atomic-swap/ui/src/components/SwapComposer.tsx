import { useEffect, useMemo, useState } from 'react'
import type { Contract, DemoHolding, DemoTokenRules, InstrumentId, Party } from '../types'
import { ArrowSwap, AssetIcon, ChevronDown, UserIcon } from './Icons'
import { ReviewDialog } from './ReviewDialog'

interface Props {
  holdings: Contract<DemoHolding>[]
  rules: Contract<DemoTokenRules>[]
  parties: Party[]
  actingParty: string
  busy: boolean
  onSubmit: (counterparty: string, holding: Contract<DemoHolding>, sendAmount: string, receive: InstrumentId, receiveAmount: string) => Promise<void>
}

function suggestedAmount(instrument: string) {
  return instrument.toUpperCase().includes('USD') ? '1000' : '2'
}

export function SwapComposer({ holdings, rules, parties, actingParty, busy, onSubmit }: Props) {
  const myHoldings = useMemo(() => holdings.filter((holding) => holding.payload.owner === actingParty), [holdings, actingParty])
  const receiveOptions = useMemo(() => rules.flatMap((rule) => rule.payload.supportedInstrumentIds.map((id) => ({ admin: rule.payload.admin, id, key: `${rule.payload.admin}|${id}` }))), [rules])
  const people = useMemo(() => parties.filter((party) => party.party !== actingParty), [parties, actingParty])
  const [holdingCid, setHoldingCid] = useState('')
  const [sendAmount, setSendAmount] = useState('')
  const [receiveKey, setReceiveKey] = useState('')
  const [receiveAmount, setReceiveAmount] = useState('')
  const [counterparty, setCounterparty] = useState('')
  const [reviewing, setReviewing] = useState(false)

  const holding = myHoldings.find((item) => item.contractId === holdingCid) ?? myHoldings[0]
  const receive = receiveOptions.find((item) => item.key === receiveKey)
    ?? receiveOptions.find((item) => item.key !== `${holding?.payload.instrumentId.admin}|${holding?.payload.instrumentId.id}`)
    ?? receiveOptions[0]
  const person = people.find((item) => item.party === counterparty) ?? people[0]

  useEffect(() => {
    const first = myHoldings[0]
    setHoldingCid(first?.contractId ?? '')
    setSendAmount(first ? suggestedAmount(first.payload.instrumentId.id) : '')
    setReceiveKey('')
    setReceiveAmount('')
    setCounterparty('')
    setReviewing(false)
  }, [actingParty])

  useEffect(() => {
    if (holding && !sendAmount) setSendAmount(suggestedAmount(holding.payload.instrumentId.id))
    if (receive && !receiveAmount) setReceiveAmount(suggestedAmount(receive.id))
  }, [holding, receive, sendAmount, receiveAmount])

  const enoughBalance = holding ? Number(sendAmount) > 0 && Number(sendAmount) <= Number(holding.payload.amount) : false
  const ready = Boolean(holding && receive && person && enoughBalance && Number(receiveAmount) > 0)

  function selectHolding(cid: string) {
    const next = myHoldings.find((item) => item.contractId === cid)
    setHoldingCid(cid)
    if (next) setSendAmount(suggestedAmount(next.payload.instrumentId.id))
  }

  function swapDirections() {
    if (!holding || !receive) return
    const reverseHolding = myHoldings.find((item) => item.payload.instrumentId.admin === receive.admin && item.payload.instrumentId.id === receive.id)
    if (!reverseHolding) return
    setHoldingCid(reverseHolding.contractId)
    setSendAmount(receiveAmount)
    setReceiveKey(`${holding.payload.instrumentId.admin}|${holding.payload.instrumentId.id}`)
    setReceiveAmount(sendAmount)
  }

  return <>
    <section className="swap-composer" aria-labelledby="swap-composer-title">
      <h2 id="swap-composer-title" className="sr-only">Create a swap</h2>
      <div className="amount-group">
        <label htmlFor="send-amount">You send</label>
        <div className="amount-control">
          <input id="send-amount" type="number" min="0" step="any" inputMode="decimal" value={sendAmount} onChange={(event) => setSendAmount(event.target.value)} />
          <div className="select-shell asset-select">
            {holding ? <AssetIcon instrument={holding.payload.instrumentId.id} className={holding.payload.instrumentId.id.toUpperCase().includes('USD') ? 'cash' : 'bond'} /> : null}
            <select aria-label="Asset to send" value={holding?.contractId ?? ''} onChange={(event) => selectHolding(event.target.value)}>
              {myHoldings.map((item) => <option key={item.contractId} value={item.contractId}>{item.payload.instrumentId.id}</option>)}
            </select>
            <ChevronDown />
          </div>
        </div>
        <p className={enoughBalance || !sendAmount ? 'balance-copy' : 'balance-copy balance-copy--error'}>
          Balance: {holding ? `${Number(holding.payload.amount).toLocaleString('en-US')} ${holding.payload.instrumentId.id}` : '—'}
        </p>
      </div>

      <button className="direction-button" type="button" aria-label="Switch swap direction" onClick={swapDirections} disabled={!holding || !receive}><ArrowSwap /></button>

      <div className="amount-group">
        <label htmlFor="receive-amount">You receive</label>
        <div className="amount-control">
          <input id="receive-amount" type="number" min="0" step="any" inputMode="decimal" value={receiveAmount} onChange={(event) => setReceiveAmount(event.target.value)} />
          <div className="select-shell asset-select">
            {receive ? <AssetIcon instrument={receive.id} className={receive.id.toUpperCase().includes('USD') ? 'cash' : 'bond'} /> : null}
            <select aria-label="Asset to receive" value={receive?.key ?? ''} onChange={(event) => { const next = receiveOptions.find((item) => item.key === event.target.value); setReceiveKey(event.target.value); if (next) setReceiveAmount(suggestedAmount(next.id)) }}>
              {receiveOptions.map((item) => <option key={item.key} value={item.key}>{item.id}</option>)}
            </select>
            <ChevronDown />
          </div>
        </div>
      </div>

      <div className="person-group">
        <label htmlFor="swap-person">Swap with</label>
        <div className="select-shell person-select"><UserIcon /><select id="swap-person" value={person?.party ?? ''} onChange={(event) => setCounterparty(event.target.value)}>{people.map((party) => <option key={party.party} value={party.party}>{party.hint}</option>)}</select><ChevronDown /></div>
      </div>

      <button className="primary-button" disabled={busy || !ready} onClick={() => setReviewing(true)}>Review swap</button>
    </section>
    <ReviewDialog open={reviewing} holding={holding} sendAmount={sendAmount} receiveInstrument={receive?.id ?? ''} receiveAmount={receiveAmount} counterparty={person} busy={busy} onClose={() => setReviewing(false)} onConfirm={async () => {
      if (!holding || !receive || !person) return
      await onSubmit(person.party, holding, sendAmount, { admin: receive.admin, id: receive.id }, receiveAmount)
      setReviewing(false)
    }} />
  </>
}
