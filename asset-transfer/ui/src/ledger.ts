import { JSON_API_BASE, LEDGER_USER_ID } from './config';
import type {
  ActiveContractsResponseType,
  AllocatePartyResponseType,
  ContractType,
  LedgerEndResponseType,
  ListPartiesResponseType,
  PartyInfoType,
} from './types';

// ---------- pure request builders (unit-tested) ----------

export const buildCreateCommand = (templateId: string, createArguments: object, actAs: string, commandId: string) => ({
  commands: [{ CreateCommand: { templateId, createArguments } }],
  userId: LEDGER_USER_ID,
  commandId,
  actAs: [actAs],
  readAs: [actAs],
});

export const buildExerciseCommand = (
  templateId: string,
  contractId: string,
  choice: string,
  choiceArgument: object,
  actAs: string,
  commandId: string,
) => ({
  commands: [{ ExerciseCommand: { templateId, contractId, choice, choiceArgument } }],
  userId: LEDGER_USER_ID,
  commandId,
  actAs: [actAs],
  readAs: [actAs],
});

export const buildAcsRequest = (templateId: string, party: string, activeAtOffset: number) => ({
  eventFormat: {
    filtersByParty: {
      [party]: {
        cumulative: [
          { identifierFilter: { TemplateFilter: { value: { templateId, includeCreatedEventBlob: false } } } },
        ],
      },
    },
    verbose: false,
  },
  verbose: false,
  activeAtOffset,
});

/** The human-readable hint from a `hint::fingerprint` party id. */
export const hintOf = (party: string): string => party.split('::')[0];

// ---------- response extractors (isolated; verified against Task 2) ----------

export const extractAllocatedParty = (data: AllocatePartyResponseType): string => data.partyDetails.party;

export const extractParties = (data: ListPartiesResponseType): PartyInfoType[] =>
  data.partyDetails.map((d) => ({ party: d.party, hint: hintOf(d.party) }));

export const extractContracts = <T>(data: ActiveContractsResponseType<T>): ContractType<T>[] =>
  data.map((entry) => {
    const created = entry.contractEntry.JsActiveContract.createdEvent;
    return { contractId: created.contractId, payload: created.createArgument };
  });

// ---------- fetch senders ----------

export const postJson = async <T>(path: string, body: object): Promise<T> => {
  const res = await fetch(`${JSON_API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
};

const getJson = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${JSON_API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
};

export const newCommandId = (label: string): string => `${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

export const getLedgerEnd = async (): Promise<number> => {
  const data = await getJson<LedgerEndResponseType>('/v2/state/ledger-end');
  return data.offset;
};

export const listParties = async (): Promise<PartyInfoType[]> => {
  const data = await getJson<ListPartiesResponseType>('/v2/parties');
  return extractParties(data);
};

export const allocateParty = async (hint: string): Promise<string> => {
  // NOTE (verified in Task 2): allocation is POST /v2/parties, NOT /v2/parties/allocate.
  const data = await postJson<AllocatePartyResponseType>('/v2/parties', {
    partyIdHint: hint,
    identityProviderId: '',
  });
  return extractAllocatedParty(data);
};

export const queryContracts = async <T>(templateId: string, party: string): Promise<ContractType<T>[]> => {
  const activeAtOffset = await getLedgerEnd();
  const data = await postJson<ActiveContractsResponseType<T>>(
    '/v2/state/active-contracts',
    buildAcsRequest(templateId, party, activeAtOffset),
  );
  return extractContracts<T>(data);
};

export const createContract = async (templateId: string, createArguments: object, actAs: string): Promise<void> => {
  await postJson('/v2/commands/submit-and-wait', buildCreateCommand(templateId, createArguments, actAs, newCommandId('create')));
};

export const exerciseChoice = async (
  templateId: string,
  contractId: string,
  choice: string,
  choiceArgument: object,
  actAs: string,
): Promise<void> => {
  await postJson(
    '/v2/commands/submit-and-wait',
    buildExerciseCommand(templateId, contractId, choice, choiceArgument, actAs, newCommandId(`exercise-${choice}`)),
  );
};
