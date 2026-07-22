import { useCallback, useEffect, useState } from 'react';
import { TEMPLATE_IDS } from '../config';
import { listParties, queryContracts } from '../ledger';
import type { AssetType, ContractType, PartyInfoType, TransferProposalType } from '../types';

type PartiesResultType = { parties: PartyInfoType[]; reload: () => void; error: string | null };

/** Loads the list of allocated parties, with manual reload. */
export const useParties = (): PartiesResultType => {
  const [parties, setParties] = useState<PartyInfoType[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    listParties()
      .then((next) => { setParties(next); setError(null); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { parties, reload, error };
};

type ContractsResultType<T> = { contracts: ContractType<T>[]; reload: () => void; error: string | null };

/** Generic hook: load a template's contracts visible to `party`, then filter. */
const useFilteredContracts = <T>(
  templateId: string,
  party: string | null,
  predicate: (payload: T) => boolean,
): ContractsResultType<T> => {
  const [contracts, setContracts] = useState<ContractType<T>[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!party) { setContracts([]); setError(null); return; }
    queryContracts<T>(templateId, party)
      .then((all) => { setContracts(all.filter((c) => predicate(c.payload))); setError(null); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [templateId, party, predicate]);

  useEffect(() => { reload(); }, [reload]);
  return { contracts, reload, error };
};

export const useAssets = (party: string | null) =>
  useFilteredContracts<AssetType>(TEMPLATE_IDS.Asset, party, useCallback((a: AssetType) => a.owner === party, [party]));

export const useIncomingProposals = (party: string | null) =>
  useFilteredContracts<TransferProposalType>(
    TEMPLATE_IDS.TransferProposal, party, useCallback((p: TransferProposalType) => p.recipient === party, [party]),
  );

export const useOutgoingProposals = (party: string | null) =>
  useFilteredContracts<TransferProposalType>(
    TEMPLATE_IDS.TransferProposal, party, useCallback((p: TransferProposalType) => p.owner === party, [party]),
  );
