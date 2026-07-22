import type { ContractType } from '../types';
import type { TransferInstructionPayloadType } from '../tokenTypes';
import { hintOf } from '../ledger';

type OutgoingTransfersProps = {
  instructions: ContractType<TransferInstructionPayloadType>[];
  onWithdraw: (contractId: string) => void;
};

/** Pending `TransferInstruction`s created by the acting party (sender); Withdraw while pending. */
export const OutgoingTransfers = ({ instructions, onWithdraw }: OutgoingTransfersProps) => {
  return (
    <section>
      <h2>Outgoing transfers</h2>
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
                  <button data-testid={`withdraw-${i.contractId}`} onClick={() => onWithdraw(i.contractId)}>Withdraw</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};
