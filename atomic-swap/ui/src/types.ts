export interface InstrumentId {
  admin: string
  id: string
}

export interface Metadata {
  values: Record<string, string>
}

export interface ExtraArgs {
  context: { values: Record<string, unknown> }
  meta: Metadata
}

export interface SwapTerms {
  tradeId: string
  offeredInstrument: InstrumentId
  offeredAmount: string
  requestedInstrument: InstrumentId
  requestedAmount: string
  requestedAt: string
  allocateBefore: string
  settleBefore: string
}

export interface SwapProposal {
  proposer: string
  counterparty: string
  terms: SwapTerms
}

export interface AtomicSwap {
  proposer: string
  counterparty: string
  tradeCid: string
  terms: SwapTerms
}

export interface SettlementInfo {
  executor: string
  settlementRef: { id: string; cid: string | null }
  requestedAt: string
  allocateBefore: string
  settleBefore: string
  meta: Metadata
}

export interface TransferLeg {
  sender: string
  receiver: string
  amount: string
  instrumentId: InstrumentId
  meta: Metadata
}

export interface AllocationSpecification {
  settlement: SettlementInfo
  transferLegId: string
  transferLeg: TransferLeg
}

export interface DemoHolding {
  admin: string
  owner: string
  instrumentId: InstrumentId
  amount: string
}

export interface DemoTokenRules {
  admin: string
  supportedInstrumentIds: string[]
  observers: string[]
}

export interface DemoAllocation {
  admin: string
  allocation: AllocationSpecification
  lockedHoldingCid: string
}

export interface Contract<T> {
  contractId: string
  templateId: string
  payload: T
}

export interface Party {
  party: string
  hint: string
}
