import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../ledger', () => ({
  listParties: vi.fn(),
  queryContracts: vi.fn(),
}));

import { listParties, queryContracts } from '../ledger';
import { useAssets, useIncomingProposals, useParties } from './useLedgerData';

beforeEach(() => { vi.clearAllMocks(); });

describe('useParties', () => {
  it('exposes fetched parties', async () => {
    vi.mocked(listParties).mockResolvedValue([{ party: 'Alice::a', hint: 'Alice' }]);
    const { result } = renderHook(() => useParties());
    await waitFor(() => expect(result.current.parties).toHaveLength(1));
    expect(result.current.parties[0].hint).toBe('Alice');
  });
});

describe('useAssets', () => {
  it('filters to assets owned by the party', async () => {
    vi.mocked(queryContracts).mockResolvedValue([
      { contractId: 'c1', payload: { owner: 'Alice::a', issuer: 'Alice::a', name: 'GOLD', quantity: '70.0' } },
      { contractId: 'c2', payload: { owner: 'Bob::b', issuer: 'Alice::a', name: 'GOLD', quantity: '30.0' } },
    ]);
    const { result } = renderHook(() => useAssets('Alice::a'));
    await waitFor(() => expect(result.current.contracts).toHaveLength(1));
    expect(result.current.contracts[0].payload.quantity).toBe('70.0');
  });
});

describe('useIncomingProposals', () => {
  it('keeps only proposals where recipient is the party', async () => {
    vi.mocked(queryContracts).mockResolvedValue([
      { contractId: 'p1', payload: { owner: 'Alice::a', recipient: 'Bob::b', issuer: 'Alice::a', name: 'GOLD', amount: '30.0' } },
      { contractId: 'p2', payload: { owner: 'Bob::b', recipient: 'Alice::a', issuer: 'Alice::a', name: 'GOLD', amount: '10.0' } },
    ]);
    const { result } = renderHook(() => useIncomingProposals('Bob::b'));
    await waitFor(() => expect(result.current.contracts).toHaveLength(1));
    expect(result.current.contracts[0].contractId).toBe('p1');
    expect(result.current.contracts[0].payload.recipient).toBe('Bob::b');
  });
});
