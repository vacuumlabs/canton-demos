import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IncomingProposals } from './IncomingProposals';

const proposal = (expiresAt: string) => ({
  contractId: 'p1',
  payload: { owner: 'Alice::a', recipient: 'Bob::b', issuer: 'Alice::a', name: 'GOLD', amount: '30.0', expiresAt },
});

describe('IncomingProposals', () => {
  const noop = vi.fn();

  it('shows Active and enables Accept before expiry', () => {
    render(
      <IncomingProposals
        proposals={[proposal('2999-01-01T00:00:00Z')]}
        now={Date.now()}
        onAccept={noop}
        onReject={noop}
        onCleanup={noop}
      />,
    );
    expect(screen.getByTestId('status-p1').textContent).toBe('Active');
    expect((screen.getByTestId('accept-p1') as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByTestId('cleanup-p1')).toBeNull();
  });

  it('shows Expired, disables Accept and offers Clean up after expiry', () => {
    render(
      <IncomingProposals
        proposals={[proposal('2000-01-01T00:00:00Z')]}
        now={Date.now()}
        onAccept={noop}
        onReject={noop}
        onCleanup={noop}
      />,
    );
    expect(screen.getByTestId('status-p1').textContent).toBe('Expired');
    expect((screen.getByTestId('accept-p1') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByTestId('cleanup-p1')).not.toBeNull();
  });
});
