import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('./ledger', () => ({
  listParties: vi.fn(),
  queryContracts: vi.fn(),
  exerciseChoice: vi.fn(),
  hintOf: (party: string) => party.split('::')[0],
}));
vi.mock('./tokenLedger', () => ({
  EMPTY_METADATA: { values: {} },
  queryHoldings: vi.fn(),
  queryInstructions: vi.fn(),
  queryFactoryAsAdmin: vi.fn(),
  submitTransfer: vi.fn(),
  acceptInstruction: vi.fn(),
  rejectInstruction: vi.fn(),
  withdrawInstruction: vi.fn(),
}));
vi.mock('./seed', () => ({ seedDemoData: vi.fn() }));
vi.mock('./tokenSeed', () => ({ seedTokenData: vi.fn() }));

import { listParties, queryContracts } from './ledger';
import { queryHoldings, queryInstructions } from './tokenLedger';
import { App } from './App';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listParties).mockResolvedValue([{ party: 'Alice::a', hint: 'Alice' }]);
  vi.mocked(queryContracts).mockResolvedValue([]);
  vi.mocked(queryHoldings).mockResolvedValue([]);
  vi.mocked(queryInstructions).mockResolvedValue([]);
});

describe('App model toggle', () => {
  it('switches between the hand-rolled and token panels', async () => {
    render(<App />);
    // Pick a party so panels render (wait for the async party load to settle).
    fireEvent.change(await screen.findByTestId('party-select'), { target: { value: 'Alice::a' } });

    // Hand-rolled model is the default.
    expect(await screen.findByText('My assets')).toBeInTheDocument();
    expect(screen.queryByText('My holdings')).toBeNull();

    // Toggle to the token-standard model.
    fireEvent.click(screen.getByTestId('model-toggle-token'));
    expect(await screen.findByText('My holdings')).toBeInTheDocument();
    expect(screen.queryByText('My assets')).toBeNull();

    // Toggle back.
    fireEvent.click(screen.getByTestId('model-toggle-hand-rolled'));
    expect(await screen.findByText('My assets')).toBeInTheDocument();
    expect(screen.queryByText('My holdings')).toBeNull();
  });
});
