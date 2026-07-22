import { SEED_PARTY_HINTS, TEMPLATE_IDS } from './config';
import { allocateParty, createContract, listParties, queryContracts } from './ledger';
import type { AssetType } from './types';

/**
 * Idempotent-ish demo seeding: ensure Alice and Bob exist, then mint Alice
 * a couple of starter assets if she has none. Safe to run more than once.
 */
export const seedDemoData = async (): Promise<void> => {
  const existing = await listParties();
  const byHint = new Map(existing.map((p) => [p.hint, p.party]));

  for (const hint of SEED_PARTY_HINTS) {
    if (!byHint.has(hint)) {
      const party = await allocateParty(hint);
      byHint.set(hint, party);
    }
  }

  const alice = byHint.get('Alice');
  if (!alice) throw new Error('Seeding failed: Alice was not allocated');

  const aliceAssets = await queryContracts<AssetType>(TEMPLATE_IDS.Asset, alice);
  if (aliceAssets.length === 0) {
    await createContract(TEMPLATE_IDS.Asset, { owner: alice, issuer: alice, name: 'GOLD', quantity: '100.0' }, alice);
    await createContract(TEMPLATE_IDS.Asset, { owner: alice, issuer: alice, name: 'SILVER', quantity: '50.0' }, alice);
  }
};
