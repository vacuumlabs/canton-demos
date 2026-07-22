// Empty = same-origin: calls go to the Vite dev server (:5173), which proxies
// /v2/* to the sandbox (:7575). See server.proxy in vite.config.ts.
export const JSON_API_BASE = '';
export const PACKAGE_NAME = 'learnDaml-main';

export const TEMPLATE_IDS = {
  Asset: `#${PACKAGE_NAME}:Main:Asset`,
  TransferProposal: `#${PACKAGE_NAME}:Main:TransferProposal`,
} as const;

export const LEDGER_USER_ID = 'ledger-api-user';
export const SEED_PARTY_HINTS = ['Alice', 'Bob'] as const;
