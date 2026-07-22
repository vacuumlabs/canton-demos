import { useState } from 'react';
import type { ContractType, PartyInfoType } from '../types';
import type { HoldingViewType } from '../tokenTypes';

type MyHoldingsProps = {
  holdings: ContractType<HoldingViewType>[];
  otherParties: PartyInfoType[];
  onTransfer: (holdingContractId: string, recipient: string, amount: string) => void;
};

/**
 * Lists the acting party's token-standard Holdings. Locked holdings show a
 * "Locked" badge and offer no Transfer form (they are not spendable); unlocked
 * holdings carry an inline recipient/amount Transfer form -> `TransferFactory_Transfer`.
 */
export const MyHoldings = ({ holdings, otherParties, onTransfer }: MyHoldingsProps) => {
  return (
    <section>
      <h2>My holdings</h2>
      {holdings.length === 0 ? <p>No holdings.</p> : (
        <table>
          <thead><tr><th>Instrument</th><th>Amount</th><th>Transfer</th></tr></thead>
          <tbody>
            {holdings.map((h) => (
              <HoldingRow key={h.contractId} holding={h} otherParties={otherParties} onTransfer={onTransfer} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};

type HoldingRowProps = {
  holding: ContractType<HoldingViewType>;
  otherParties: PartyInfoType[];
  onTransfer: (holdingContractId: string, recipient: string, amount: string) => void;
};

/** One holding row: a Locked badge when locked, otherwise a recipient/amount Transfer form. */
const HoldingRow = ({ holding, otherParties, onTransfer }: HoldingRowProps) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const isLocked = holding.payload.lock !== null;
  const isReady = recipient !== '' && amount !== '';

  return (
    <tr>
      <td>{holding.payload.instrumentId.id}</td>
      <td>{holding.payload.amount}</td>
      <td>
        {isLocked ? (
          <span data-testid={`locked-${holding.contractId}`}>Locked</span>
        ) : (
          <>
            <select
              data-testid={`recipient-${holding.contractId}`}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            >
              <option value="" disabled>Recipient…</option>
              {otherParties.map((p) => <option key={p.party} value={p.party}>{p.hint}</option>)}
            </select>
            <input
              data-testid={`amount-${holding.contractId}`}
              type="number"
              placeholder="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button
              data-testid={`transfer-${holding.contractId}`}
              disabled={!isReady}
              onClick={() => onTransfer(holding.contractId, recipient, amount)}
            >
              Transfer
            </button>
          </>
        )}
      </td>
    </tr>
  );
};
