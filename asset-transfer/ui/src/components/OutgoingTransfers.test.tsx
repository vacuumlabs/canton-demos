import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OutgoingTransfers } from './OutgoingTransfers';
import type { ContractType } from '../types';
import type { TransferInstructionPayloadType } from '../tokenTypes';

const instruction: ContractType<TransferInstructionPayloadType> = {
  contractId: 'o1',
  payload: {
    admin: 'Reg::r',
    lockedCid: 'locked-1',
    transfer: {
      sender: 'Alice::a', receiver: 'Bob::b', amount: '30.0',
      instrumentId: { admin: 'Reg::r', id: 'GOLD' },
      requestedAt: '2026-07-17T00:00:00Z',
      executeBefore: '2026-07-18T00:00:00Z',
      inputHoldingCids: [], meta: { values: {} },
    },
  },
};

describe('OutgoingTransfers', () => {
  it('calls onWithdraw with the instruction contract id', () => {
    const onWithdraw = vi.fn();
    render(<OutgoingTransfers instructions={[instruction]} onWithdraw={onWithdraw} />);
    fireEvent.click(screen.getByTestId('withdraw-o1'));
    expect(onWithdraw).toHaveBeenCalledWith('o1');
  });
});
