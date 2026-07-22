import type { PartyInfoType } from '../types';

type PartyBarProps = {
  parties: PartyInfoType[];
  currentParty: string | null;
  onSelect: (party: string) => void;
  onSeed: () => void;
  onRefresh: () => void;
  isSeeding: boolean;
};

/** Top bar: pick which party you act as, seed demo data, or refresh all panels. */
export const PartyBar = ({ parties, currentParty, onSelect, onSeed, onRefresh, isSeeding }: PartyBarProps) => {
  return (
    <div className="topbar">
      <label htmlFor="party-select">Acting as:</label>
      <select
        id="party-select"
        data-testid="party-select"
        value={currentParty ?? ''}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="" disabled>Select a party…</option>
        {parties.map((p) => (
          <option key={p.party} value={p.party}>{p.hint}</option>
        ))}
      </select>
      <button data-testid="seed-button" onClick={onSeed} disabled={isSeeding}>
        {isSeeding ? 'Seeding…' : 'Seed demo data'}
      </button>
      <button data-testid="refresh-button" onClick={onRefresh}>Refresh</button>
    </div>
  );
};
