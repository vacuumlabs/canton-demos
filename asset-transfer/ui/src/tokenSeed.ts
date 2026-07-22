import { allocateParty, createContract, listParties } from './ledger';
import { EMPTY_METADATA, queryFactoryAsAdmin, queryHoldings } from './tokenLedger';
import { TOKEN_TEMPLATE_IDS } from './tokenConfig';

/**
 * One-click seeding for the token-standard view (mirrors seed.ts).
 *
 * Ensures a `Registry` admin plus `Alice`/`Bob` exist, then (idempotently, keyed
 * off whether a `TransferFactory` already exists) creates the GOLD `Instrument`
 * and `TransferFactory` as the admin, and finally mints starter `Holding`s.
 *
 * Authority split mirrors the Daml model (token/daml/Token.daml):
 *   - `Instrument`/`TransferFactory` are `signatory admin`  -> submitted by admin.
 *   - `Holding` is `signatory owner` (admin is only an observer via
 *     `instrumentId.admin`) -> submitted by the OWNER, so no admin auth is needed.
 *
 * The Registry admin id stays discoverable by the rest of the UI: it comes back
 * from `listParties` with hint `Registry`, and is also `instrumentId.admin` on
 * every minted holding.
 */
export const seedTokenData = async (): Promise<void> => {
  const existing = await listParties();
  const byHint = new Map(existing.map((p) => [p.hint, p.party]));

  for (const hint of ['Registry', 'Alice', 'Bob']) {
    if (!byHint.has(hint)) {
      byHint.set(hint, await allocateParty(hint));
    }
  }

  const admin = byHint.get('Registry');
  const alice = byHint.get('Alice');
  const bob = byHint.get('Bob');
  if (!admin || !alice || !bob) throw new Error('Token seeding failed: parties were not allocated');

  const instrumentId = { admin, id: 'GOLD' };

  // Idempotency anchor: the admin-signed factory (see queryFactoryAsAdmin). If it
  // is already present the instrument/factory pair has been created before.
  const factories = await queryFactoryAsAdmin(admin);
  if (factories.length === 0) {
    await createContract(TOKEN_TEMPLATE_IDS.Instrument, { admin, id: 'GOLD', name: 'Gold', symbol: 'XAU' }, admin);
    await createContract(TOKEN_TEMPLATE_IDS.TransferFactory, { admin }, admin);
  }

  // Holdings are owner-signed, so each is submitted by its owner. Decimals are
  // strings on the JSON Ledger API wire. Minting is per-owner idempotent (like
  // seed.ts): a starter Holding is minted only if the owner currently holds
  // none, so clicking Seed twice does not stack balances. The owner is a
  // stakeholder of its own holdings, so queryHoldings(owner) sees them.
  await mintStarterHolding(alice, '100.0', instrumentId);
  await mintStarterHolding(bob, '50.0', instrumentId);
};

/** Mint a starter GOLD holding for `owner` unless they already hold something. */
const mintStarterHolding = async (
  owner: string,
  amount: string,
  instrumentId: { admin: string; id: string },
): Promise<void> => {
  const holdings = await queryHoldings(owner);
  if (holdings.length === 0) {
    await createContract(
      TOKEN_TEMPLATE_IDS.Holding,
      { instrumentId, owner, amount, lock: null, meta: EMPTY_METADATA },
      owner,
    );
  }
};
