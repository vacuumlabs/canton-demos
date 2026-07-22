import type { Contract, Party } from './types'

// Templates are addressed by package *name* (not package-id hash), so the
// frontend keeps working across `dpm build` rebuilds without changes.
const PACKAGE_REF = '#otc-atomic-swap'
const MODULE = 'OTC.Model'

function templateId(entity: string, module = MODULE, packageRef = PACKAGE_REF): string {
  return `${packageRef}:${module}:${entity}`
}

export class LedgerError extends Error {}

async function request(base: string, path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${base}${path}`, init)
  const text = await res.text()
  const json = text.length > 0 ? JSON.parse(text) : {}
  if (!res.ok) {
    const message =
      (json as { cause?: string; errors?: string[] }).cause ??
      (json as { errors?: string[] }).errors?.join(', ') ??
      `HTTP ${res.status}`
    throw new LedgerError(message)
  }
  return json
}

function postJson(base: string, path: string, body: unknown) {
  return request(base, path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

let commandCounter = 0
function nextCommandId(prefix: string): string {
  commandCounter += 1
  return `${prefix}-${Date.now()}-${commandCounter}`
}

export async function listParties(base: string): Promise<Party[]> {
  const json = (await request(base, '/v2/parties')) as {
    partyDetails: { party: string }[]
  }
  return json.partyDetails
    .map((p) => ({ party: p.party, hint: p.party.split('::')[0] }))
    .filter((p) => p.hint !== 'sandbox' && p.hint !== 'participant_admin')
    .sort((a, b) => a.hint.localeCompare(b.hint))
}

export async function allocateParty(base: string, hint: string): Promise<Party> {
  const json = (await postJson(base, '/v2/parties', {
    partyIdHint: hint,
    displayName: hint,
  })) as { partyDetails: { party: string } }
  return { party: json.partyDetails.party, hint }
}

function eventFormatFor(party: string) {
  return {
    filtersByParty: {
      [party]: {
        cumulative: [
          { identifierFilter: { WildcardFilter: { value: { includeCreatedEventBlob: false } } } },
        ],
      },
    },
    verbose: true,
  }
}

interface CreatedEvent {
  contractId: string
  templateId: string
  createArgument: unknown
}

async function submit(
  base: string,
  actAs: string | string[],
  commands: unknown[],
  commandId: string,
): Promise<CreatedEvent[]> {
  const json = (await postJson(base, '/v2/commands/submit-and-wait-for-transaction', {
    commands: {
      commands,
      commandId,
      actAs: Array.isArray(actAs) ? actAs : [actAs],
      readAs: [],
      userId: 'otc-frontend',
    },
    transactionFormat: {
      eventFormat: eventFormatFor(Array.isArray(actAs) ? actAs[0] : actAs),
      transactionShape: 'TRANSACTION_SHAPE_LEDGER_EFFECTS',
    },
  })) as { transaction: { events: Array<{ CreatedEvent?: CreatedEvent }> } }

  return json.transaction.events
    .map((e) => e.CreatedEvent)
    .filter((e): e is CreatedEvent => e !== undefined)
}

export async function createContract(
  base: string,
  actAs: string | string[],
  entity: string,
  createArguments: unknown,
  module = MODULE,
): Promise<string> {
  const created = await submit(
    base,
    actAs,
    [{ CreateCommand: { templateId: templateId(entity, module), createArguments } }],
    nextCommandId('create'),
  )
  return created[0].contractId
}

export async function exerciseChoice(
  base: string,
  actAs: string,
  entity: string,
  contractId: string,
  choice: string,
  choiceArgument: unknown,
): Promise<void> {
  await submit(
    base,
    actAs,
    [{ ExerciseCommand: { templateId: templateId(entity), contractId, choice, choiceArgument } }],
    nextCommandId('exercise'),
  )
}

export async function exerciseInterfaceChoice(
  base: string,
  actAs: string | string[],
  packageRef: string,
  module: string,
  entity: string,
  contractId: string,
  choice: string,
  choiceArgument: unknown,
): Promise<void> {
  await submit(
    base,
    actAs,
    [{ ExerciseCommand: { templateId: templateId(entity, module, packageRef), contractId, choice, choiceArgument } }],
    nextCommandId('exercise-interface'),
  )
}

function entityOf(fullTemplateId: string): string {
  return fullTemplateId.split(':').pop() ?? ''
}

export async function queryContracts<T>(
  base: string,
  party: string,
  entity: string,
  module = MODULE,
): Promise<Contract<T>[]> {
  const end = (await request(base, '/v2/state/ledger-end')) as { offset: number }
  const rows = (await postJson(base, '/v2/state/active-contracts', {
    filter: eventFormatFor(party),
    verbose: true,
    activeAtOffset: end.offset,
  })) as Array<{ contractEntry: { JsActiveContract: { createdEvent: CreatedEvent } } }>

  return rows
    .map((r) => r.contractEntry.JsActiveContract.createdEvent)
    .filter((c) => entityOf(c.templateId) === entity && c.templateId.includes(`:${module}:`))
    .map((c) => ({ contractId: c.contractId, templateId: c.templateId, payload: c.createArgument as T }))
}
