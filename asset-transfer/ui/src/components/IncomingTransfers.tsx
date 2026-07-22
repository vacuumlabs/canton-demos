import type { ContractType } from '../types';
import type { TransferInstructionPayloadType } from '../tokenTypes';
import { hintOf } from '../ledger';

type IncomingTransfersProps = {
  instructions: ContractType<TransferInstructionPayloadType>[];
  onAccept: (contractId: string) => void;
  onReject: (contractId: string) => void;
};

/** Pending `TransferInstruction`s addressed to the acting party (receiver); Accept or Reject. */
export const IncomingTransfers = ({ instructions, onAccept, onReject }: IncomingTransfersProps) => {
  return (
    <section>
      <h2>Incoming transfers</h2>
      {instructions.length === 0 ? <p>None.</p> : (
        <table>
          <thead><tr><th>From</th><th>To</th><th>Amount</th><th>Execute before</th><th>Actions</th></tr></thead>
          <tbody>
            {instructions.map((i) => (
              <tr key={i.contractId}>
                <td>{hintOf(i.payload.transfer.sender)}</td>
                <td>{hintOf(i.payload.transfer.receiver)}</td>
                <td>{i.payload.transfer.amount}</td>
                <td>{i.payload.transfer.executeBefore}</td>
                <td>
                  <button data-testid={`accept-${i.contractId}`} onClick={() => onAccept(i.contractId)}>Accept</button>
                  <button data-testid={`reject-${i.contractId}`} onClick={() => onReject(i.contractId)}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};
