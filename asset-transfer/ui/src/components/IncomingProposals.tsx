import type { ContractType, TransferProposalType } from '../types';
import { hintOf } from '../ledger';
import { isExpired, formatDeadline } from '../expiry';

type IncomingProposalsProps = {
  proposals: ContractType<TransferProposalType>[];
  now: number;
  onAccept: (contractId: string) => void;
  onReject: (contractId: string) => void;
  onCleanup: (contractId: string) => void;
};

/** Proposals addressed to the acting party; Accept (until expiry), Reject, or Clean up (after expiry). */
export const IncomingProposals = ({ proposals, now, onAccept, onReject, onCleanup }: IncomingProposalsProps) => {
  return (
    <section>
      <h2>Incoming proposals</h2>
      {proposals.length === 0 ? <p>None.</p> : (
        <table>
          <thead><tr><th>From</th><th>Name</th><th>Amount</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {proposals.map((p) => {
              const expired = isExpired(p.payload.expiresAt, now);
              return (
                <tr key={p.contractId}>
                  <td>{hintOf(p.payload.owner)}</td>
                  <td>{p.payload.name}</td>
                  <td>{p.payload.amount}</td>
                  <td>{formatDeadline(p.payload.expiresAt)}</td>
                  <td data-testid={`status-${p.contractId}`}>{expired ? 'Expired' : 'Active'}</td>
                  <td>
                    <button data-testid={`accept-${p.contractId}`} disabled={expired} onClick={() => onAccept(p.contractId)}>Accept</button>
                    <button data-testid={`reject-${p.contractId}`} onClick={() => onReject(p.contractId)}>Reject</button>
                    {expired && (
                      <button data-testid={`cleanup-${p.contractId}`} onClick={() => onCleanup(p.contractId)}>Clean up</button>
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
