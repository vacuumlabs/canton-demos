# CIP-0056 OTC Atomic Swap in Daml

This project demonstrates an atomic delivery-versus-payment (DvP) settlement
for tokens implementing the Canton Network Token Standard (CIP-0056).

The OTC application is registry-independent: its production model imports the
standard `InstrumentId`, `Allocation`, `AllocationFactory`, and
`AllocationRequest` interfaces. A compact `DemoToken` registry is included so
the complete workflow can be built, tested, and explored locally without a
separate token application.

## What is atomic

An accepted trade requests two allocations:

1. the proposer allocates the offered instrument and amount;
2. the counterparty allocates the requested instrument and amount;
3. `AtomicSwap.Settle` verifies that both allocation specifications exactly
   match the accepted trade;
4. it exercises both standard `Allocation_ExecuteTransfer` choices as children
   of one Daml transaction.

If either validation or transfer fails, the complete transaction is rolled
back. Neither allocation is partially executed.

Allocations also solve the reservation problem of the old implementation: the
input holdings are consumed and represented by locked holdings until the trade
settles, is cancelled, or the allocation is withdrawn according to the token
registry's rules.

## Structure

- `daml/OTC/Model.daml` — generic OTC proposal, allocation request, and atomic
  settlement model; depends only on CIP-0056 interfaces
- `daml/OTC/DemoToken.daml` — small CIP-0056-compatible Holding,
  AllocationFactory, and Allocation implementation for local development
- `daml/OTC/Test.daml` — successful two-token DvP and rollback tests
- `dars/` — pinned canonical CIP-0056 v1 interface DARs
- `ui/` — React test console using Canton JSON Ledger API v2

## Trade workflow

1. The proposer creates `SwapProposal` with two `InstrumentId` values, two
   decimal amounts, an allocation deadline, and a settlement deadline.
2. The counterparty accepts. This creates `AtomicSwap`, signed by both parties,
   which implements the standard `AllocationRequest` interface.
3. Each wallet selects suitable Holding UTXOs and exercises the relevant
   registry's `AllocationFactory_Allocate` choice.
4. The settlement app finds allocations by `tradeId`, the proposal contract
   reference, and transfer-leg ID.
5. The proposer exercises `AtomicSwap.Settle` with both allocation contract IDs
   and the registry-provided `ExtraArgs` for each leg.

For a real registry, the wallet or backend must obtain its AllocationFactory,
disclosed contracts, and choice context from that registry's standard off-ledger
API. The bundled UI drives `DemoToken` directly and uses empty choice contexts.

## Supported tokens

The OTC model can settle two different token implementations when both:

- use the CIP-0056 `InstrumentId` model;
- implement `AllocationFactory` and `Allocation` for DvP;
- provide the disclosed contracts and `ExtraArgs` their choices require;
- can place every input contract of the settlement on the same synchronizer.

Implementing only the standard `Holding` view is not sufficient for atomic
DvP. Registry-specific compliance, fees, approvals, and asynchronous allocation
workflows remain under the registry's control.

## Build and test

The project uses Daml SDK `3.4.9` and targets Daml-LF `2.1`.

```bash
dpm build
dpm test
```

Expected tests:

- `atomicStandardTokenSwapTest`
- `wrongAllocationMustRollBack`

## UI

The frontend expects a Canton JSON Ledger API v2 endpoint at
`http://localhost:17575`. Vite proxies `/v2` requests to avoid browser CORS
issues.

```bash
cd ui
npm install
npm run dev
```

Upload `.daml/dist/otc-atomic-swap-1.0.0.dar` to the participant before using
the UI. `Quick CIP-0056 demo setup` creates Alice, Bob, two registry parties,
two demo factories, and initial USD/bond holdings.

The UI is a sandbox console, not a production wallet. Production use needs
authenticated users, transaction preparation/signing, registry API discovery,
disclosed-contract handling, durable indexing, expiry automation, and explicit
failure/cancellation operations.

## Standard references

- [CIP-0056 Canton Network Token Standard](https://github.com/canton-foundation/cips/blob/main/cip-0056/cip-0056.md)
- [Canton Token Standard DvP example](https://docs.sync.global/app_dev/api/splice-token-standard-test/Splice-Tests-TestAmuletTokenDvP.html)
