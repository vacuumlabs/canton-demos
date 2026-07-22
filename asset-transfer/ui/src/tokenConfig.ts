// Canton Token Standard (CIP-0056) template + interface identifiers.
//
// Like the hand-rolled `main` package (config.ts), these address templates by the
// `#package-name` alias. This is REQUIRED, not stylistic: the JSON Ledger API v2
// (Canton 3.5.x) rejects a content-hash package-id in a template/interface filter
// with `INVALID_FIELD: ... expected a package name` (verified end-to-end against a
// live `dpm sandbox` -- see README "Token Standard (CIP-0056) view"). The `#name`
// alias also happens to be the more portable choice: package NAMES and VERSIONS are
// stable across builds, whereas content-hash ids are not (token/INTERFACE_NOTES.md §1).
//
// The standard interface lives in a SEPARATE vetted package
// (`splice-api-token-holding-v1`) from our implementing package (`learnDaml-token`),
// so an interface query must name the interface's OWN package, not ours -- hence the
// two distinct package names below.
const TOKEN_PACKAGE_NAME = 'learnDaml-token';
const HOLDING_V1_PACKAGE_NAME = 'splice-api-token-holding-v1';
const TRANSFER_INSTRUCTION_V1_PACKAGE_NAME = 'splice-api-token-transfer-instruction-v1';

// CONCRETE-template ids (our own package). Used to CREATE contracts and to query
// them by `TemplateFilter` -- `createArgument` decoding, not interface views.
export const TOKEN_TEMPLATE_IDS = {
  Instrument: `#${TOKEN_PACKAGE_NAME}:Token:Instrument`,
  Holding: `#${TOKEN_PACKAGE_NAME}:Token:Holding`,
  TransferFactory: `#${TOKEN_PACKAGE_NAME}:Token:TransferFactory`,
  TransferInstruction: `#${TOKEN_PACKAGE_NAME}:Token:TransferInstruction`,
} as const;

// STANDARD-interface ids, addressed by the interfaces' OWN vetted packages (NOT
// ours). Exercising a token-standard choice must target the INTERFACE that
// declares it -- our concrete templates carry no choices of their own, only the
// interface instances -- so `TransferFactory_Transfer` /
// `TransferInstruction_Accept|Reject|Withdraw` are exercised via these ids, not
// the concrete-template ids above. Verified end-to-end against a live sandbox:
// exercising on the concrete template fails with `INVALID_ARGUMENT: Invalid
// template ... or choice` (see README "Token Standard (CIP-0056) view").
export const TOKEN_INTERFACE_IDS = {
  TransferFactory: `#${TRANSFER_INSTRUCTION_V1_PACKAGE_NAME}:Splice.Api.Token.TransferInstructionV1:TransferFactory`,
  TransferInstruction: `#${TRANSFER_INSTRUCTION_V1_PACKAGE_NAME}:Splice.Api.Token.TransferInstructionV1:TransferInstruction`,
} as const;

// The standard `Holding` interface id, addressed by its own vetted package name.
export const HOLDING_INTERFACE_ID = `#${HOLDING_V1_PACKAGE_NAME}:Splice.Api.Token.HoldingV1:Holding`;
