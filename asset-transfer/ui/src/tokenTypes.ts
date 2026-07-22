// Wire types for the Canton Token Standard (CIP-0056) surface.
//
// These mirror the generated codegen shapes under `src/generated/splice-api-token-*`
// (verified against their `module.d.ts`), re-expressed in the team's `*Type`
// convention. Decimals (Daml `Numeric`) and timestamps (Daml `Time`) are STRINGS
// on the JSON Ledger API wire, exactly as `AssetType.quantity` is in types.ts.
import type { PartyType } from './types';

/** A Daml `TextMap Text`. Serializes as a JSON object; empty is `{}`. */
export type TextMapType = { [key: string]: string };

/**
 * Standard `Metadata`: a key/value string bag (`{ values : TextMap Text }`).
 * An empty bag is `{ values: {} }` -- see `emptyMetadata` in tokenLedger.ts.
 */
export type MetadataType = { values: TextMapType };

/**
 * Standard `ChoiceContext`: app-backend-supplied values (`{ values : TextMap AnyValue }`).
 * We only ever build the empty context, so the value type is left open.
 */
export type ChoiceContextType = { values: { [key: string]: unknown } };

/** Standard `ExtraArgs` bundle threaded through every token-standard choice. */
export type ExtraArgsType = { context: ChoiceContextType; meta: MetadataType };

/** Identifies an instrument by its registry `admin` and a free-text `id`. */
export type InstrumentIdType = { admin: PartyType; id: string };

/** A holding lock; `Time`/`RelTime` fields are strings/optional on the wire. */
export type LockType = {
  holders: PartyType[];
  expiresAt: string | null;
  expiresAfter: string | null;
  context: string | null;
};

/** The standard `Holding` interface view. `amount` is a decimal string. */
export type HoldingViewType = {
  owner: PartyType;
  instrumentId: InstrumentIdType;
  amount: string;
  lock: LockType | null;
  meta: MetadataType;
};

/** A `Transfer` spec (argument to `TransferFactory_Transfer`). */
export type TransferType = {
  sender: PartyType;
  receiver: PartyType;
  amount: string;
  instrumentId: InstrumentIdType;
  requestedAt: string;
  executeBefore: string;
  inputHoldingCids: string[];
  meta: MetadataType;
};

/**
 * Create-arguments of our concrete `TransferInstruction` template.
 * Instructions are queried by TEMPLATE (not interface), so the payload we decode
 * is the template's own create arguments, not the interface view.
 */
export type TransferInstructionPayloadType = {
  admin: PartyType;
  transfer: TransferType;
  lockedCid: string;
};

/** Create-arguments of our `TransferFactory` template (admin-signed). */
export type TransferFactoryPayloadType = { admin: PartyType };

// ---- Raw interface-view ACS response shapes (JSON Ledger API v2) ----
//
// Same `/v2/state/active-contracts` envelope as the template ACS response
// (types.ts `ActiveContractEntryType`), but the `createdEvent` carries decoded
// `interfaceViews` instead of `createArgument` when the query used an
// `InterfaceFilter` with `includeInterfaceView: true`.

export type InterfaceViewType<TView> = { viewValue: TView };

export type InterfaceCreatedEventType<TView> = {
  contractId: string;
  interfaceViews: InterfaceViewType<TView>[];
};

export type InterfaceActiveContractEntryType<TView> = {
  contractEntry: { JsActiveContract: { createdEvent: InterfaceCreatedEventType<TView> } };
};

export type InterfaceAcsResponseType<TView> = InterfaceActiveContractEntryType<TView>[];
