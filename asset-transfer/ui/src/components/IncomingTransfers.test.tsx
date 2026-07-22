import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IncomingTransfers } from './IncomingTransfers';
import type { ContractType } from '../types';
import type { TransferInstructionPayloadType } from '../tokenTypes';

const instruction: ContractType<TransferInstructionPayloadType> = {
  contractId: 'i1',
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

describe('IncomingTransfers', () => {
  it('calls onAccept with the instruction contract id', () => {
    const onAccept = vi.fn();
    render(<IncomingTransfers instructions={[instruction]} onAccept={onAccept} onReject={vi.fn()} />);
    fireEvent.click(screen.getByTestId('accept-i1'));
    expect(onAccept).toHaveBeenCalledWith('i1');
  });

  it('calls onReject with the instruction contract id', () => {
    const onReject = vi.fn();
    render(<IncomingTransfers instructions={[instruction]} onAccept={vi.fn()} onReject={onReject} />);
    fireEvent.click(screen.getByTestId('reject-i1'));
    expect(onReject).toHaveBeenCalledWith('i1');
  });
});
