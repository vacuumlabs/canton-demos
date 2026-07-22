// Canton Token Standard (CIP-0056) wire layer.
//
// Mirrors ledger.ts exactly: PURE request builders + response extractors first
// (unit-tested in tokenLedger.test.ts), then thin fetch senders. The shared
// helpers (postJson/getLedgerEnd/buildAcsRequest/extractContracts) are reused
// from ledger.ts rather than duplicated.
//
// The one genuinely new capability here is reading the STANDARD `Holding`
// interface view via an `InterfaceFilter` (buildInterfaceAcsRequest), instead of
// the concrete-template `TemplateFilter` that ledger.ts uses.
import { LEDGER_USER_ID } from './config';
import { HOLDING_INTERFACE_ID, TOKEN_INTERFACE_IDS, TOKEN_TEMPLATE_IDS } from './tokenConfig';
import {
  extractContracts,
  getLedgerEnd,
  newCommandId,
  postJson,
  queryContracts,
} from './ledger';
import type { ActiveContractsResponseType, ContractType } from './types';
import type {
  ExtraArgsType,
  HoldingViewType,
  InterfaceAcsResponseType,
  MetadataType,
  TransferFactoryPayloadType,
  TransferInstructionPayloadType,
  TransferType,
} from './tokenTypes';

// ---------- empty token-standard values (shapes VERIFIED against codegen) ----------
//
// The generated types (src/generated/splice-api-token-metadata-v1-.../MetadataV1/module.d.ts)
// are:
//   Metadata      = { values: { [key: string]: string } }   -- TextMap Text  -> JSON object, empty {}
//   ChoiceContext = { values: { [key: string]: AnyValue } }  -- TextMap AnyValue -> JSON object, empty {}
//   ExtraArgs     = { context: ChoiceContext, meta: Metadata }
// A Daml TextMap encodes as a JSON object on the v2 API (contrast the genmap
// `Map` used by TransferInstructionStatus.pendingActions, which encodes as an
// array of pairs). So an empty TextMap is `{}`, and every empty value below is a
// nested `{ values: {} }`.

/** An empty standard `Metadata` bag. */
export const EMPTY_METADATA: MetadataType = { values: {} };

/**
 * An empty `ExtraArgs`. The token standard has no `emptyExtraArgs`; it is built
 * from the empty `ChoiceContext` and empty `Metadata`. In a real deployment the
 * `context` would carry the registry's off-ledger choice context; this open
 * single-participant model needs none, so both halves are empty.
 */
export const EMPTY_EXTRA_ARGS: ExtraArgsType = {
  context: { values: {} },
  meta: EMPTY_METADATA,
};

// ---------- pure request builders (unit-tested) ----------

/**
 * ACS query for a STANDARD INTERFACE view.
 *
 * Unlike buildAcsRequest (ledger.ts), which uses a `TemplateFilter` keyed by a
 * concrete template id, this uses an `InterfaceFilter` keyed by the interface id
 * with `includeInterfaceView: true` -- so the response carries the decoded
 * `HoldingView` regardless of which concrete template implements the interface.
 */
export const buildInterfaceAcsRequest = (interfaceId: string, party: string, activeAtOffset: number) => ({
  eventFormat: {
    filtersByParty: {
      [party]: {
        cumulative: [
          {
            identifierFilter: {
              InterfaceFilter: {
                value: { interfaceId, includeInterfaceView: true, includeCreatedEventBlob: false },
              },
            },
          },
        ],
      },
    },
    verbose: false,
  },
  verbose: false,
  activeAtOffset,
});

// CRITICAL VISIBILITY NOTE (teaching substitution) --------------------------------
//
// TransferFactory is `signatory admin` with NO observers, so the sender (Alice)
// cannot see it -- in a real registry the app backend would hand the sender a
// `disclosedContracts` entry for the factory (plus an off-ledger choice context).
// We deliberately scoped that machinery OUT.
//
// Because the local sandbox runs OPEN (no auth) on a SINGLE participant where the
// admin is a stakeholder of the factory, we substitute: the UI QUERIES the factory
// as the admin party (queryFactoryAsAdmin), and SUBMITS the transfer with
// `readAs: [sender, admin]`. The admin `readAs` makes the admin-signed factory
// readable within the sender's submission -- standing in for the disclosure a real
// registry would supply. This works ONLY on the open single-participant sandbox.

/**
 * Exercise `TransferFactory_Transfer` on the admin-signed factory.
 * `actAs` is the sender (the choice controller); `adminReadAs` is the registry
 * admin, included in BOTH `expectedAdmin` and `readAs` (see visibility note).
 */
export const buildTransferCommand = (
  factoryCid: string,
  transfer: TransferType,
  actAs: string,
  adminReadAs: string,
  commandId: string,
) => ({
  commands: [
    {
      ExerciseCommand: {
        // The interface id (not our concrete TransferFactory template): the
        // `TransferFactory_Transfer` choice is declared on the standard interface.
        templateId: TOKEN_INTERFACE_IDS.TransferFactory,
        contractId: factoryCid,
        choice: 'TransferFactory_Transfer',
        choiceArgument: { expectedAdmin: adminReadAs, transfer, extraArgs: EMPTY_EXTRA_ARGS },
      },
    },
  ],
  userId: LEDGER_USER_ID,
  commandId,
  actAs: [actAs],
  // readAs includes the admin so the admin-signed factory is readable here.
  readAs: [actAs, adminReadAs],
});

/** Shared builder for the three `TransferInstruction` interface choices. */
const buildInstructionCommand = (
  instructionCid: string,
  choice: string,
  actAs: string,
  commandId: string,
) => ({
  commands: [
    {
      ExerciseCommand: {
        // The interface id (not our concrete TransferInstruction template): the
        // Accept/Reject/Withdraw choices are declared on the standard interface.
        templateId: TOKEN_INTERFACE_IDS.TransferInstruction,
        contractId: instructionCid,
        choice,
        choiceArgument: { extraArgs: EMPTY_EXTRA_ARGS },
      },
    },
  ],
  userId: LEDGER_USER_ID,
  commandId,
  actAs: [actAs],
  readAs: [actAs],
});

/** Exercise `TransferInstruction_Accept` (controller: the receiver). */
export const buildAcceptCommand = (instructionCid: string, actAs: string, commandId: string) =>
  buildInstructionCommand(instructionCid, 'TransferInstruction_Accept', actAs, commandId);

/** Exercise `TransferInstruction_Reject` (controller: the receiver). */
export const buildRejectCommand = (instructionCid: string, actAs: string, commandId: string) =>
  buildInstructionCommand(instructionCid, 'TransferInstruction_Reject', actAs, commandId);

/** Exercise `TransferInstruction_Withdraw` (controller: the sender). */
export const buildWithdrawCommand = (instructionCid: string, actAs: string, commandId: string) =>
  buildInstructionCommand(instructionCid, 'TransferInstruction_Withdraw', actAs, commandId);

// ---------- response extractors (isolated; unit-tested) ----------

/**
 * Decode an INTERFACE-view ACS response into `{ contractId, payload }[]`.
 * The standard `HoldingView` is the first interface view on each created event.
 */
export const extractHoldings = (data: InterfaceAcsResponseType<HoldingViewType>): ContractType<HoldingViewType>[] =>
  data.map((entry) => {
    const created = entry.contractEntry.JsActiveContract.createdEvent;
    return { contractId: created.contractId, payload: created.interfaceViews[0].viewValue };
  });

/**
 * Decode a TEMPLATE ACS response for `TransferInstruction` (queried by template,
 * not interface) into `{ contractId, payload }[]`.
 */
export const extractInstructions = (
  data: ActiveContractsResponseType<TransferInstructionPayloadType>,
): ContractType<TransferInstructionPayloadType>[] => extractContracts(data);

// ---------- fetch senders ----------

/** Query holdings via the STANDARD interface view (InterfaceFilter). */
export const queryHoldings = async (party: string): Promise<ContractType<HoldingViewType>[]> => {
  const activeAtOffset = await getLedgerEnd();
  const data = await postJson<InterfaceAcsResponseType<HoldingViewType>>(
    '/v2/state/active-contracts',
    buildInterfaceAcsRequest(HOLDING_INTERFACE_ID, party, activeAtOffset),
  );
  return extractHoldings(data);
};

/** Query pending transfer instructions by TEMPLATE (plain template ACS). */
export const queryInstructions = (party: string): Promise<ContractType<TransferInstructionPayloadType>[]> =>
  queryContracts<TransferInstructionPayloadType>(TOKEN_TEMPLATE_IDS.TransferInstruction, party);

/**
 * Query the admin-signed `TransferFactory` AS THE ADMIN party (see visibility
 * note): the sender cannot see the factory, so the UI reads it as the admin.
 */
export const queryFactoryAsAdmin = (adminParty: string): Promise<ContractType<TransferFactoryPayloadType>[]> =>
  queryContracts<TransferFactoryPayloadType>(TOKEN_TEMPLATE_IDS.TransferFactory, adminParty);

/** Submit a transfer through the factory, reading the factory as the admin. */
export const submitTransfer = async (
  factoryCid: string,
  transfer: TransferType,
  sender: string,
  adminParty: string,
): Promise<void> => {
  await postJson(
    '/v2/commands/submit-and-wait',
    buildTransferCommand(factoryCid, transfer, sender, adminParty, newCommandId('transfer')),
  );
};

/** Accept a pending instruction (receiver). */
export const acceptInstruction = async (instructionCid: string, receiver: string): Promise<void> => {
  await postJson('/v2/commands/submit-and-wait', buildAcceptCommand(instructionCid, receiver, newCommandId('accept')));
};

/** Reject a pending instruction (receiver). */
export const rejectInstruction = async (instructionCid: string, receiver: string): Promise<void> => {
  await postJson('/v2/commands/submit-and-wait', buildRejectCommand(instructionCid, receiver, newCommandId('reject')));
};

/** Withdraw a pending instruction (sender). */
export const withdrawInstruction = async (instructionCid: string, sender: string): Promise<void> => {
  await postJson('/v2/commands/submit-and-wait', buildWithdrawCommand(instructionCid, sender, newCommandId('withdraw')));
};
