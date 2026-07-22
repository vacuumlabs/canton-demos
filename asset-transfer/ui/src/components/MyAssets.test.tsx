import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MyAssets } from './MyAssets';

describe('MyAssets', () => {
  it('calls onPropose with the row contract id, recipient, amount and default ttl hours', () => {
    const onPropose = vi.fn();
    render(
      <MyAssets
        assets={[{ contractId: 'c1', payload: { owner: 'Alice::a', issuer: 'Alice::a', name: 'GOLD', quantity: '100.0' } }]}
        otherParties={[{ party: 'Bob::b', hint: 'Bob' }]}
        onPropose={onPropose}
      />,
    );
    fireEvent.change(screen.getByTestId('recipient-c1'), { target: { value: 'Bob::b' } });
    fireEvent.change(screen.getByTestId('amount-c1'), { target: { value: '30' } });
    fireEvent.click(screen.getByTestId('propose-c1'));
    expect(onPropose).toHaveBeenCalledWith('c1', 'Bob::b', '30', '24');
  });
});
