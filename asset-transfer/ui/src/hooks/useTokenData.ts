import { useCallback, useEffect, useState } from 'react';
import { queryHoldings, queryInstructions } from '../tokenLedger';
import type { ContractType } from '../types';
import type { HoldingViewType, TransferInstructionPayloadType } from '../tokenTypes';

type ContractsResultType<T> = { contracts: ContractType<T>[]; reload: () => void; error: string | null };

/**
 * Generic hook: load a token-standard contract set visible to `party` via the
 * given query, then filter. Mirrors `useFilteredContracts` in useLedgerData.ts,
 * except the concrete `query` is injected (interface-view holdings vs template
 * instructions) rather than keyed by a single template id.
 */
const useFilteredContracts = <T>(
  query: (party: string) => Promise<ContractType<T>[]>,
  party: string | null,
  predicate: (payload: T) => boolean,
): ContractsResultType<T> => {
  const [contracts, setContracts] = useState<ContractType<T>[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!party) { setContracts([]); setError(null); return; }
    query(party)
      .then((all) => { setContracts(all.filter((c) => predicate(c.payload))); setError(null); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [query, party, predicate]);

  useEffect(() => { reload(); }, [reload]);
  return { contracts, reload, error };
};

export const useHoldings = (party: string | null) =>
  useFilteredContracts<HoldingViewType>(
    queryHoldings, party, useCallback((h: HoldingViewType) => h.owner === party, [party]),
  );

export const useIncomingTransfers = (party: string | null) =>
  useFilteredContracts<TransferInstructionPayloadType>(
    queryInstructions, party,
    useCallback((p: TransferInstructionPayloadType) => p.transfer.receiver === party, [party]),
  );

export const useOutgoingTransfers = (party: string | null) =>
  useFilteredContracts<TransferInstructionPayloadType>(
    queryInstructions, party,
    useCallback((p: TransferInstructionPayloadType) => p.transfer.sender === party, [party]),
  );
