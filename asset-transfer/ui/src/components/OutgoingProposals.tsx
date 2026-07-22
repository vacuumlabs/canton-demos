import type { ContractType, TransferProposalType } from '../types';
import { hintOf } from '../ledger';
import { isExpired, formatDeadline } from '../expiry';

type OutgoingProposalsProps = {
  proposals: ContractType<TransferProposalType>[];
  now: number;
  onCancel: (contractId: string) => void;
  onCleanup: (contractId: string) => void;
};

/** Proposals created by the acting party; Cancel while pending, or Clean up after expiry. */
export const OutgoingProposals = ({ proposals, now, onCancel, onCleanup }: OutgoingProposalsProps) => {
  return (
    <section>
      <h2>Outgoing proposals</h2>
      {proposals.length === 0 ? <p>None.</p> : (
        <table>
          <thead><tr><th>To</th><th>Name</th><th>Amount</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {proposals.map((p) => {
              const expired = isExpired(p.payload.expiresAt, now);
              return (
                <tr key={p.contractId}>
                  <td>{hintOf(p.payload.recipient)}</td>
                  <td>{p.payload.name}</td>
                  <td>{p.payload.amount}</td>
                  <td>{formatDeadline(p.payload.expiresAt)}</td>
                  <td data-testid={`out-status-${p.contractId}`}>{expired ? 'Expired' : 'Active'}</td>
                  <td>
                    <button data-testid={`cancel-${p.contractId}`} onClick={() => onCancel(p.contractId)}>Cancel</button>
                    {expired && (
                      <button data-testid={`out-cleanup-${p.contractId}`} onClick={() => onCleanup(p.contractId)}>Clean up</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
};
