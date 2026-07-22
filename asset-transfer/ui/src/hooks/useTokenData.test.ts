import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../tokenLedger', () => ({
  queryHoldings: vi.fn(),
  queryInstructions: vi.fn(),
}));

import { queryHoldings, queryInstructions } from '../tokenLedger';
import { useHoldings, useIncomingTransfers, useOutgoingTransfers } from './useTokenData';

const instrumentId = { admin: 'Reg::r', id: 'GOLD' };
const emptyMeta = { values: {} };

const holding = (contractId: string, owner: string, amount: string, isLocked: boolean) => ({
  contractId,
  payload: {
    owner,
    instrumentId,
    amount,
    lock: isLocked ? { holders: [owner], expiresAt: null, expiresAfter: null, context: null } : null,
    meta: emptyMeta,
  },
});

const instruction = (contractId: string, sender: string, receiver: string, amount: string) => ({
  contractId,
  payload: {
    admin: 'Reg::r',
    lockedCid: 'locked-1',
    transfer: {
      sender, receiver, amount, instrumentId,
      requestedAt: '2026-07-17T00:00:00Z',
      executeBefore: '2026-07-18T00:00:00Z',
      inputHoldingCids: [], meta: emptyMeta,
    },
  },
});

beforeEach(() => { vi.clearAllMocks(); });

describe('useHoldings', () => {
  it('keeps holdings owned by the party, including locked ones', async () => {
    vi.mocked(queryHoldings).mockResolvedValue([
      holding('h1', 'Alice::a', '70.0', false),
      holding('h2', 'Alice::a', '30.0', true),
      holding('h3', 'Bob::b', '10.0', false),
    ]);
    const { result } = renderHook(() => useHoldings('Alice::a'));
    await waitFor(() => expect(result.current.contracts).toHaveLength(2));
    expect(result.current.contracts.map((c) => c.contractId)).toEqual(['h1', 'h2']);
  });
});

describe('useIncomingTransfers', () => {
  it('keeps only instructions where the receiver is the party', async () => {
    vi.mocked(queryInstructions).mockResolvedValue([
      instruction('i1', 'Alice::a', 'Bob::b', '30.0'),
      instruction('i2', 'Bob::b', 'Alice::a', '10.0'),
    ]);
    const { result } = renderHook(() => useIncomingTransfers('Bob::b'));
    await waitFor(() => expect(result.current.contracts).toHaveLength(1));
    expect(result.current.contracts[0].contractId).toBe('i1');
    expect(result.current.contracts[0].payload.transfer.receiver).toBe('Bob::b');
  });
});

describe('useOutgoingTransfers', () => {
  it('keeps only instructions where the sender is the party', async () => {
    vi.mocked(queryInstructions).mockResolvedValue([
      instruction('i1', 'Alice::a', 'Bob::b', '30.0'),
      instruction('i2', 'Bob::b', 'Alice::a', '10.0'),
    ]);
    const { result } = renderHook(() => useOutgoingTransfers('Bob::b'));
    await waitFor(() => expect(result.current.contracts).toHaveLength(1));
    expect(result.current.contracts[0].contractId).toBe('i2');
    expect(result.current.contracts[0].payload.transfer.sender).toBe('Bob::b');
  });
});
