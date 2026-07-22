import { describe, expect, it } from 'vitest';
import {
  EMPTY_EXTRA_ARGS,
  EMPTY_METADATA,
  buildAcceptCommand,
  buildInterfaceAcsRequest,
  buildRejectCommand,
  buildTransferCommand,
  buildWithdrawCommand,
  extractHoldings,
  extractInstructions,
} from './tokenLedger';
import { HOLDING_INTERFACE_ID, TOKEN_INTERFACE_IDS, TOKEN_TEMPLATE_IDS } from './tokenConfig';
import type { ActiveContractsResponseType } from './types';
import type {
  HoldingViewType,
  InterfaceAcsResponseType,
  TransferInstructionPayloadType,
  TransferType,
} from './tokenTypes';

const instrumentId = { admin: 'Registry::1220reg', id: 'USD' };

const transfer: TransferType = {
  sender: 'Alice::1220abc',
  receiver: 'Bob::1220def',
  amount: '25.0000000000',
  instrumentId,
  requestedAt: '2026-07-17T00:00:00Z',
  executeBefore: '2026-07-18T00:00:00Z',
  inputHoldingCids: ['00holdingcid'],
  meta: EMPTY_METADATA,
};

describe('token config', () => {
  it('addresses token templates by #package-name (required by the JSON Ledger API)', () => {
    // The JSON Ledger API v2 rejects content-hash package-ids in template/interface
    // filters ("expected a package name"); verified live in the Task 6 e2e.
    expect(TOKEN_TEMPLATE_IDS.TransferFactory).toBe('#learnDaml-token:Token:TransferFactory');
    expect(TOKEN_TEMPLATE_IDS.Holding).toBe('#learnDaml-token:Token:Holding');
  });

  it('addresses the standard Holding interface by the holding-v1 package name', () => {
    expect(HOLDING_INTERFACE_ID).toBe(
      '#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding',
    );
  });

  it('addresses standard transfer choices by the transfer-instruction-v1 interface ids', () => {
    // Token-standard choices live on the interfaces, so exercises target these,
    // not the concrete-template ids (verified live: exercising on the concrete
    // template fails with INVALID_ARGUMENT).
    expect(TOKEN_INTERFACE_IDS.TransferFactory).toBe(
      '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferFactory',
    );
    expect(TOKEN_INTERFACE_IDS.TransferInstruction).toBe(
      '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferInstruction',
    );
  });
});

describe('empty token-standard values', () => {
  it('encodes an empty Metadata TextMap as {values:{}}', () => {
    expect(EMPTY_METADATA).toEqual({ values: {} });
  });

  it('encodes empty ExtraArgs as nested empty context + meta', () => {
    expect(EMPTY_EXTRA_ARGS).toEqual({ context: { values: {} }, meta: { values: {} } });
  });
});

describe('token request builders', () => {
  it('builds an interface ACS request using InterfaceFilter with includeInterfaceView', () => {
    const req = buildInterfaceAcsRequest(HOLDING_INTERFACE_ID, 'Alice::1220abc', 42);
    expect(req.activeAtOffset).toBe(42);
    const filter = req.eventFormat.filtersByParty['Alice::1220abc'].cumulative[0].identifierFilter;
    // Must be InterfaceFilter, NOT TemplateFilter.
    expect('TemplateFilter' in filter).toBe(false);
    expect(filter.InterfaceFilter.value).toEqual({
      interfaceId: HOLDING_INTERFACE_ID,
      includeInterfaceView: true,
      includeCreatedEventBlob: false,
    });
  });

  it('builds a TransferFactory_Transfer command with admin in readAs and EMPTY_EXTRA_ARGS', () => {
    const cmd = buildTransferCommand('00factorycid', transfer, 'Alice::1220abc', 'Registry::1220reg', 'cmd-t');
    expect(cmd.commands[0].ExerciseCommand).toEqual({
      templateId: TOKEN_INTERFACE_IDS.TransferFactory,
      contractId: '00factorycid',
      choice: 'TransferFactory_Transfer',
      choiceArgument: { expectedAdmin: 'Registry::1220reg', transfer, extraArgs: EMPTY_EXTRA_ARGS },
    });
    expect(cmd.actAs).toEqual(['Alice::1220abc']);
    // Admin included in readAs so the admin-signed factory is readable.
    expect(cmd.readAs).toEqual(['Alice::1220abc', 'Registry::1220reg']);
    expect(cmd.commandId).toBe('cmd-t');
  });

  it('builds an Accept command on the TransferInstruction template with only extraArgs', () => {
    const cmd = buildAcceptCommand('00instrcid', 'Bob::1220def', 'cmd-a');
    expect(cmd.commands[0].ExerciseCommand).toEqual({
      templateId: TOKEN_INTERFACE_IDS.TransferInstruction,
      contractId: '00instrcid',
      choice: 'TransferInstruction_Accept',
      choiceArgument: { extraArgs: EMPTY_EXTRA_ARGS },
    });
    expect(cmd.actAs).toEqual(['Bob::1220def']);
    expect(cmd.readAs).toEqual(['Bob::1220def']);
  });

  it('builds Reject and Withdraw commands on the right choices', () => {
    expect(buildRejectCommand('00c', 'Bob::1220def', 'cmd-r').commands[0].ExerciseCommand.choice).toBe(
      'TransferInstruction_Reject',
    );
    expect(buildWithdrawCommand('00c', 'Alice::1220abc', 'cmd-w').commands[0].ExerciseCommand.choice).toBe(
      'TransferInstruction_Withdraw',
    );
  });
});

describe('token response extractors', () => {
  it('extracts holdings from an interface-view ACS response', () => {
    const view: HoldingViewType = {
      owner: 'Alice::1220abc',
      instrumentId,
      amount: '100.0000000000',
      lock: null,
      meta: { values: {} },
    };
    const data: InterfaceAcsResponseType<HoldingViewType> = [
      {
        contractEntry: {
          JsActiveContract: {
            createdEvent: { contractId: '00ho', interfaceViews: [{ viewValue: view }] },
          },
        },
      },
    ];
    expect(extractHoldings(data)).toEqual([{ contractId: '00ho', payload: view }]);
  });

  it('extracts transfer instructions from a template ACS response', () => {
    const payload: TransferInstructionPayloadType = {
      admin: 'Registry::1220reg',
      transfer,
      lockedCid: '00locked',
    };
    const data: ActiveContractsResponseType<TransferInstructionPayloadType> = [
      { contractEntry: { JsActiveContract: { createdEvent: { contractId: '00ti', createArgument: payload } } } },
    ];
    expect(extractInstructions(data)).toEqual([{ contractId: '00ti', payload }]);
  });
});
