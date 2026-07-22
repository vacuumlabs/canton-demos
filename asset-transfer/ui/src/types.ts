export type PartyType = string;

/** A minted, owner-signed asset. Decimal is a string on the JSON wire. */
export type AssetType = {
  owner: PartyType;
  issuer: PartyType;
  name: string;
  quantity: string;
};

/** A pending transfer escrowing `amount` from owner to recipient. */
export type TransferProposalType = {
  owner: PartyType;
  recipient: PartyType;
  issuer: PartyType;
  name: string;
  amount: string;
  /** Absolute expiry as an ISO-8601 Time string from the JSON Ledger API. */
  expiresAt: string;
};

/** A ledger contract: its id plus decoded payload. */
export type ContractType<TPayload> = {
  contractId: string;
  payload: TPayload;
};

/** A party plus its human-readable hint (the part before `::`). */
export type PartyInfoType = {
  party: PartyType;
  hint: string;
};

// ---- Raw JSON Ledger API v2 response shapes (verified in Task 2) ----

export type LedgerEndResponseType = { offset: number };

export type AllocatePartyResponseType = { partyDetails: { party: PartyType } };

export type PartyDetailsType = { party: PartyType };
export type ListPartiesResponseType = { partyDetails: PartyDetailsType[] };

export type CreatedEventType<TPayload> = {
  contractId: string;
  createArgument: TPayload;
};

export type ActiveContractEntryType<TPayload> = {
  contractEntry: { JsActiveContract: { createdEvent: CreatedEventType<TPayload> } };
};

export type ActiveContractsResponseType<TPayload> = ActiveContractEntryType<TPayload>[];
