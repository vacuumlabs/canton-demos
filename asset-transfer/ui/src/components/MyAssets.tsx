import { useState } from 'react';
import type { AssetType, ContractType, PartyInfoType } from '../types';

type MyAssetsProps = {
  assets: ContractType<AssetType>[];
  otherParties: PartyInfoType[];
  onPropose: (assetContractId: string, recipient: string, amount: string, ttlHours: string) => void;
};

/** Lists assets owned by the acting party, each with an inline "propose transfer" form. */
export const MyAssets = ({ assets, otherParties, onPropose }: MyAssetsProps) => {
  return (
    <section>
      <h2>My assets</h2>
      {assets.length === 0 ? <p>No assets.</p> : (
        <table>
          <thead><tr><th>Name</th><th>Quantity</th><th>Propose transfer</th></tr></thead>
          <tbody>
            {assets.map((a) => (
              <AssetRow key={a.contractId} asset={a} otherParties={otherParties} onPropose={onPropose} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};

type AssetRowProps = {
  asset: ContractType<AssetType>;
  otherParties: PartyInfoType[];
  onPropose: (assetContractId: string, recipient: string, amount: string, ttlHours: string) => void;
};

/** One asset row with its recipient/amount/expiry propose form. */
const AssetRow = ({ asset, otherParties, onPropose }: AssetRowProps) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [ttlHours, setTtlHours] = useState('24');
  const isReady = recipient !== '' && amount !== '' && ttlHours !== '';

  return (
    <tr>
      <td>{asset.payload.name}</td>
      <td>{asset.payload.quantity}</td>
      <td>
        <select
          data-testid={`recipient-${asset.contractId}`}
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        >
          <option value="" disabled>Recipient…</option>
          {otherParties.map((p) => <option key={p.party} value={p.party}>{p.hint}</option>)}
        </select>
        <input
          data-testid={`amount-${asset.contractId}`}
          type="number"
          placeholder="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          data-testid={`ttl-${asset.contractId}`}
          type="number"
          placeholder="expires in (hours)"
          value={ttlHours}
          onChange={(e) => setTtlHours(e.target.value)}
        />
        <button
          data-testid={`propose-${asset.contractId}`}
          disabled={!isReady}
          onClick={() => onPropose(asset.contractId, recipient, amount, ttlHours)}
        >
          Propose
        </button>
      </td>
    </tr>
  );
};
