# Asset Transfer — Two-Step Approval (learning project)

A minimal DAML/Canton app demonstrating the propose/accept pattern: an owner-signed,
splittable `Asset` transferred via a `TransferProposal` the recipient must `Accept`
(or `Reject`), and the owner can `Cancel` while pending. Each proposal also carries a
ledger-time **expiry**, after which it can no longer be accepted and can be swept back
to the owner (see *Proposal expiry* below).

## Prerequisites
- `dpm` (Daml SDK 3.5.2), JDK 17+
- Node + `yarn` (v1)

## Run the ledger model tests
```bash
dpm build --all
# Daml Script tests run inside each test package:
cd test && dpm test           # hand-rolled Asset/TransferProposal model
cd ../token-test && dpm test  # Canton Token Standard model
```

## Run the full app

The app ships **two models** behind a toggle at the top — the hand-rolled two-step transfer
and the Canton Token Standard view — so the sandbox needs **both** DARs loaded.

```bash
# 1. build all packages
dpm build --all

# 2. start the sandbox with BOTH DARs loaded (JSON Ledger API on :7575) — leave running
dpm sandbox \
  --dar main/.daml/dist/learnDaml-main-0.0.1.dar \
  --dar token/.daml/dist/learnDaml-token-0.0.1.dar \
  --json-api-port 7575

# 3. start the UI (Vite dev server on :5173)
cd ui && yarn install && yarn dev
```

Open **http://localhost:5173**. The browser talks only to the Vite dev server, which
**proxies** `/v2/*` calls to the sandbox on `:7575` (see `ui/vite.config.ts`) — that's why
the page never hits `:7575` directly and there's no CORS setup to do.

> Optional: `dpm codegen-js token/.daml/dist/learnDaml-token-0.0.1.dar -o ui/src/generated`
> generates TypeScript bindings for reference only — the app does **not** import them (it uses
> a hand-written typed facade), so this step is not required to run.

### Hand-rolled model (default toggle)
1. Click **Seed demo data** (allocates Alice & Bob, mints Alice GOLD 100 / SILVER 50).
2. **Acting as Alice**, propose e.g. 30 GOLD to Bob (set **Expires in (hours)**; default 24).
3. Switch to **Bob** — the proposal is under *Incoming proposals* with its deadline and an
   **Active** status; **Accept** it.
4. Bob now holds 30 GOLD; Alice holds 70 GOLD. Try **Reject** and **Cancel** too.

## Proposal expiry (ledger time)

Each `TransferProposal` carries an absolute `expiresAt`, computed at propose time from a
TTL: `ProposeTransfer` takes `ttlSeconds`, reads `getTime`, and stores `getTime + ttlSeconds`.
After the deadline:

- `Accept` is rejected (guard `now <= expiresAt`) and is disabled in the UI.
- Any single stakeholder (owner, recipient, or issuer) can run `ExpireCleanup` to return
  the escrowed amount to the owner — the **Clean up** button on the incoming/outgoing
  panels. Reject and Cancel remain available at any time.

Ledger time differs by environment: **Daml Script tests run in static-time mode** (the clock
starts at the Unix epoch; `passTime`/`setTime` move it forward only), while **`dpm sandbox`
runs in wall-clock mode** (ledger time is real UTC), which is what the UI compares against.
To watch a proposal expire quickly in the UI, set **Expires in (hours)** to a small fraction
such as `0.02` (~72 seconds): the status flips to **Expired** on its own, Accept disables, and
**Clean up** returns the escrow to the owner.

## Token Standard (CIP-0056) view

Alongside the hand-rolled two-step model, the app ships a second, interoperable
implementation built on the **Canton Token Standard** (CIP-0056): an owner-signed
`Holding` that implements the standard `Splice.Api.Token.HoldingV1.Holding` interface,
plus a `TransferFactory` / `TransferInstruction` pair implementing the standard
`TransferInstructionV1` interfaces. The UI's **Token Standard** toggle drives this model.

### Run it

Launch exactly as in [Run the full app](#run-the-full-app) above — both DARs must be loaded
(the token DAR carries its `splice-api-token-*` data-dependencies with it). Then in the
browser, flip the top toggle to **Token Standard** and:
1. **Seed demo data** — allocates a `Registry` admin plus `Alice`/`Bob`, creates the GOLD
   `Instrument` + `TransferFactory` (as the admin), and mints Alice 100 / Bob 50 GOLD.
2. **Acting as Alice**, transfer e.g. 30 GOLD to Bob. This splits Alice's holding into a
   70 change holding (hers) and a 30 *locked* holding earmarked for Bob, and creates a
   pending `TransferInstruction`.
3. Switch to **Bob** and **Accept** it (or Alice can **Withdraw**, Bob can **Reject**). On
   Accept, Bob holds 30 GOLD unlocked and Alice holds 70.

### Querying holdings via the interface view

Balances are read with an **interface** ACS query, not a concrete-template one: a
`POST /v2/state/active-contracts` whose `eventFormat` filter is an `InterfaceFilter`
naming the `Holding` interface id with `includeInterfaceView: true`. The response then
carries the decoded standard view at
`contractEntry.JsActiveContract.createdEvent.interfaceViews[0].viewValue`
(`{ owner, instrumentId, amount, lock, meta }`) — regardless of which concrete template
implements the interface. That is what makes the standard *interoperable*: a wallet can
list holdings of any registry's token without knowing its implementing package. See
`ui/src/tokenLedger.ts` (`buildInterfaceAcsRequest` / `extractHoldings`).

### Wire-format facts (verified end-to-end against a live sandbox)

Two JSON Ledger API v2 rules were confirmed by a headless seed→transfer→accept run and
are baked into `ui/src/tokenConfig.ts`:

- **Identifiers use the `#package-name` alias, not a content-hash package-id.** The API
  rejects a raw package-id in a template/interface filter with
  `INVALID_FIELD: … expected a package name`. Names + versions are also stable across
  builds where content hashes are not.
- **Standard choices are exercised on the interface id, not the concrete template.** Our
  concrete templates carry no choices of their own — only the interface instances — so
  `TransferFactory_Transfer` and `TransferInstruction_Accept|Reject|Withdraw` target the
  `splice-api-token-transfer-instruction-v1` interface ids (`TOKEN_INTERFACE_IDS`).
  Exercising them on the concrete-template id fails with `INVALID_ARGUMENT: Invalid
  template … or choice`.

### Teaching notes

- **Owner-signed `Holding` vs. registry-signed Canton Coin.** Real Canton Coin makes the
  registry `admin` a *signatory* of every holding, so any movement needs the registry's
  authority and an off-ledger *choice context*. Here `Holding` is **owner-signed** (the
  admin is only an observer), which makes transfers self-authorizing — the owner alone can
  spend — with no registry context to thread. This is a deliberate simplification for
  clarity, not a faithful production model (see `token/daml/Token.daml`).
- **`readAs: [sender, admin]` substitution.** The `TransferFactory` is `signatory admin`
  with no observers, so a real registry would hand the sender a `disclosedContracts` entry
  (plus the choice context) to see it. This open, single-participant sandbox has no such
  backend, so the UI instead queries the factory *as the admin* and submits the transfer
  with `readAs: [sender, admin]` — the admin `readAs` makes the admin-signed factory
  readable within the sender's submission. This works **only** on the open sandbox.
- **Vendored token DARs are locally built from Splice `0.5.0` sources**, compiled here with
  SDK 3.5.2 rather than pulled from a published release. They are fit for a **local sandbox
  only**: because a package-id is a content hash over the compiled Daml-LF, these ids
  **differ from the packages a production registry has vetted on-ledger**. Package names and
  versions (`splice-api-token-*-v1`, `1.0.0`) are stable regardless. Re-vendor the exact
  production DARs before wiring up against a live registry — see `token/INTERFACE_NOTES.md`.

## Notes
- The sandbox runs open (no auth) for local dev; the UI sets `actAs`/`readAs` to the selected party.
- Decimal amounts are strings on the JSON wire and echoed normalized to 10 dp. `Int64` (e.g.
  `ttlSeconds`) is likewise a string on the wire; `Time` (e.g. `expiresAt`) is an ISO-8601 string.
- `docs/` (design/plan/reference) and markdown files are intentionally not committed.
