import { useMemo, useState } from 'react';
import { PartyBar } from './components/PartyBar';
import { MyAssets } from './components/MyAssets';
import { IncomingProposals } from './components/IncomingProposals';
import { OutgoingProposals } from './components/OutgoingProposals';
import { MyHoldings } from './components/MyHoldings';
import { IncomingTransfers } from './components/IncomingTransfers';
import { OutgoingTransfers } from './components/OutgoingTransfers';
import { useAssets, useIncomingProposals, useOutgoingProposals, useParties } from './hooks/useLedgerData';
import { useHoldings, useIncomingTransfers, useOutgoingTransfers } from './hooks/useTokenData';
import { useNow } from './hooks/useNow';
import { exerciseChoice } from './ledger';
import { TEMPLATE_IDS } from './config';
import { seedDemoData } from './seed';
import { seedTokenData } from './tokenSeed';
import {
  EMPTY_METADATA,
  acceptInstruction,
  queryFactoryAsAdmin,
  rejectInstruction,
  submitTransfer,
  withdrawInstruction,
} from './tokenLedger';
import type { HoldingViewType } from './tokenTypes';
import type { ContractType } from './types';

type ModelType = 'hand-rolled' | 'token';

/** Root component: pick a party, toggle between the hand-rolled and token-standard models, and act. */
export const App = () => {
  const { parties, reload: reloadParties } = useParties();
  const [currentParty, setCurrentParty] = useState<string | null>(null);
  const [model, setModel] = useState<ModelType>('hand-rolled');
  const [isSeeding, setIsSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hand-rolled model.
  const { contracts: assets, reload: reloadAssets } = useAssets(currentParty);
  const { contracts: incoming, reload: reloadIncoming } = useIncomingProposals(currentParty);
  const { contracts: outgoing, reload: reloadOutgoing } = useOutgoingProposals(currentParty);
  // Token-standard model.
  const { contracts: holdings, reload: reloadHoldings } = useHoldings(currentParty);
  const { contracts: inTransfers, reload: reloadInTransfers } = useIncomingTransfers(currentParty);
  const { contracts: outTransfers, reload: reloadOutTransfers } = useOutgoingTransfers(currentParty);
  const now = useNow();

  const isTokenModel = model === 'token';
  const otherParties = useMemo(() => parties.filter((p) => p.party !== currentParty), [parties, currentParty]);

  const refreshAll = () => { reloadAssets(); reloadIncoming(); reloadOutgoing(); };
  const refreshToken = () => { reloadHoldings(); reloadInTransfers(); reloadOutTransfers(); };

  const run = (action: Promise<void>) => {
    action.then(() => { setError(null); refreshAll(); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  };
  const runToken = (action: Promise<void>) => {
    action.then(() => { setError(null); refreshToken(); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  };

  const handleSeed = () => {
    setIsSeeding(true);
    seedDemoData()
      .then(() => { setError(null); reloadParties(); refreshAll(); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setIsSeeding(false));
  };
  const handleSeedToken = () => {
    setIsSeeding(true);
    seedTokenData()
      .then(() => { setError(null); reloadParties(); refreshToken(); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setIsSeeding(false));
  };

  // ---- Hand-rolled handlers ----
  const handlePropose = (assetContractId: string, recipient: string, amount: string, ttlHours: string) => {
    if (!currentParty) return;
    // Int64 is a string on the JSON wire; convert hours -> whole seconds.
    const ttlSeconds = String(Math.round(Number(ttlHours) * 3600));
    run(exerciseChoice(TEMPLATE_IDS.Asset, assetContractId, 'ProposeTransfer', { recipient, amount, ttlSeconds }, currentParty));
  };
  const handleAccept = (cid: string) => currentParty && run(exerciseChoice(TEMPLATE_IDS.TransferProposal, cid, 'Accept', {}, currentParty));
  const handleReject = (cid: string) => currentParty && run(exerciseChoice(TEMPLATE_IDS.TransferProposal, cid, 'Reject', {}, currentParty));
  const handleCancel = (cid: string) => currentParty && run(exerciseChoice(TEMPLATE_IDS.TransferProposal, cid, 'Cancel', {}, currentParty));
  const handleCleanup = (cid: string) => currentParty && run(exerciseChoice(TEMPLATE_IDS.TransferProposal, cid, 'ExpireCleanup', { actor: currentParty }, currentParty));

  // ---- Token-standard handlers ----
  const submitStandardTransfer = async (holdingContractId: string, sender: string, recipient: string, amount: string) => {
    // The instrument (incl. its registry admin) comes straight from the selected
    // holding — handleTransfer only fires from a rendered row, so the lookup succeeds.
    const holding = holdings.find((h: ContractType<HoldingViewType>) => h.contractId === holdingContractId);
    if (!holding) throw new Error('Holding not found');
    const instrumentId = holding.payload.instrumentId;
    const admin = instrumentId.admin;
    // The factory is admin-signed and invisible to the sender, so read it as the admin.
    const factories = await queryFactoryAsAdmin(admin);
    if (factories.length === 0) throw new Error('No TransferFactory found — seed the token data first.');
    const factoryCid = factories[0].contractId;
    const requestedAt = new Date().toISOString();
    const executeBefore = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const transfer = {
      sender, receiver: recipient, amount, instrumentId, requestedAt, executeBefore,
      inputHoldingCids: [holdingContractId], meta: EMPTY_METADATA,
    };
    await submitTransfer(factoryCid, transfer, sender, admin);
  };

  const handleTransfer = (holdingContractId: string, recipient: string, amount: string) => {
    if (!currentParty) return;
    runToken(submitStandardTransfer(holdingContractId, currentParty, recipient, amount));
  };
  const handleAcceptTransfer = (cid: string) => currentParty && runToken(acceptInstruction(cid, currentParty));
  const handleRejectTransfer = (cid: string) => currentParty && runToken(rejectInstruction(cid, currentParty));
  const handleWithdrawTransfer = (cid: string) => currentParty && runToken(withdrawInstruction(cid, currentParty));

  return (
    <>
      <h1>Asset Transfer — {isTokenModel ? 'Token Standard' : 'Two-Step Approval'}</h1>
      <div className="model-toggle" data-testid="model-toggle">
        <button
          data-testid="model-toggle-hand-rolled"
          disabled={!isTokenModel}
          onClick={() => setModel('hand-rolled')}
        >
          Hand-rolled
        </button>
        <button
          data-testid="model-toggle-token"
          disabled={isTokenModel}
          onClick={() => setModel('token')}
        >
          Token Standard
        </button>
      </div>
      <PartyBar
        parties={parties}
        currentParty={currentParty}
        onSelect={setCurrentParty}
        onSeed={isTokenModel ? handleSeedToken : handleSeed}
        onRefresh={isTokenModel ? refreshToken : refreshAll}
        isSeeding={isSeeding}
      />
      {error && <p className="error" data-testid="error">{error}</p>}
      {currentParty && !isTokenModel && (
        <>
          <MyAssets assets={assets} otherParties={otherParties} onPropose={handlePropose} />
          <IncomingProposals proposals={incoming} now={now} onAccept={handleAccept} onReject={handleReject} onCleanup={handleCleanup} />
          <OutgoingProposals proposals={outgoing} now={now} onCancel={handleCancel} onCleanup={handleCleanup} />
        </>
      )}
      {currentParty && isTokenModel && (
        <>
          <MyHoldings holdings={holdings} otherParties={otherParties} onTransfer={handleTransfer} />
          <IncomingTransfers instructions={inTransfers} onAccept={handleAcceptTransfer} onReject={handleRejectTransfer} />
          <OutgoingTransfers instructions={outTransfers} onWithdraw={handleWithdrawTransfer} />
        </>
      )}
    </>
  );
};
