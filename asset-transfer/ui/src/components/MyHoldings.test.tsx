import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MyHoldings } from './MyHoldings';
import type { ContractType } from '../types';
import type { HoldingViewType } from '../tokenTypes';

const instrumentId = { admin: 'Reg::r', id: 'GOLD' };
const emptyMeta = { values: {} };

const unlocked: ContractType<HoldingViewType> = {
  contractId: 'h1',
  payload: { owner: 'Alice::a', instrumentId, amount: '100.0', lock: null, meta: emptyMeta },
};
const locked: ContractType<HoldingViewType> = {
  contractId: 'h2',
  payload: {
    owner: 'Alice::a',
    instrumentId,
    amount: '25.0',
    lock: { holders: ['Reg::r'], expiresAt: null, expiresAfter: null, context: null },
    meta: emptyMeta,
  },
};

describe('MyHoldings', () => {
  it('shows a Locked badge for locked holdings and offers no transfer form for them', () => {
    render(
      <MyHoldings holdings={[unlocked, locked]} otherParties={[{ party: 'Bob::b', hint: 'Bob' }]} onTransfer={vi.fn()} />,
    );
    expect(screen.getByTestId('locked-h2')).toBeInTheDocument();
    expect(screen.queryByTestId('locked-h1')).toBeNull();
    // locked holding is excluded from the spendable transfer form
    expect(screen.queryByTestId('transfer-h2')).toBeNull();
    expect(screen.queryByTestId('recipient-h2')).toBeNull();
    // unlocked holding does offer the transfer form
    expect(screen.getByTestId('transfer-h1')).toBeInTheDocument();
  });

  it('calls onTransfer with the holding contract id, recipient and amount', () => {
    const onTransfer = vi.fn();
    render(
      <MyHoldings holdings={[unlocked]} otherParties={[{ party: 'Bob::b', hint: 'Bob' }]} onTransfer={onTransfer} />,
    );
    fireEvent.change(screen.getByTestId('recipient-h1'), { target: { value: 'Bob::b' } });
    fireEvent.change(screen.getByTestId('amount-h1'), { target: { value: '30' } });
    fireEvent.click(screen.getByTestId('transfer-h1'));
    expect(onTransfer).toHaveBeenCalledWith('h1', 'Bob::b', '30');
  });
});
