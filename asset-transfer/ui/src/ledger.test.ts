import { describe, expect, it } from 'vitest';
import {
  buildAcsRequest,
  buildCreateCommand,
  buildExerciseCommand,
  extractAllocatedParty,
  extractContracts,
  extractParties,
  hintOf,
} from './ledger';
import { TEMPLATE_IDS } from './config';
import type {
  ActiveContractsResponseType,
  AllocatePartyResponseType,
  AssetType,
  ListPartiesResponseType,
} from './types';

describe('ledger request builders', () => {
  it('builds a create command with actAs/readAs and the given commandId', () => {
    const cmd = buildCreateCommand(TEMPLATE_IDS.Asset, { name: 'GOLD' }, 'Alice::abc', 'cmd-1');
    expect(cmd).toEqual({
      commands: [{ CreateCommand: { templateId: '#learnDaml-main:Main:Asset', createArguments: { name: 'GOLD' } } }],
      userId: 'ledger-api-user',
      commandId: 'cmd-1',
      actAs: ['Alice::abc'],
      readAs: ['Alice::abc'],
    });
  });

  it('builds an exercise command targeting a contract and choice', () => {
    const cmd = buildExerciseCommand(TEMPLATE_IDS.TransferProposal, 'cid-9', 'Accept', {}, 'Bob::xyz', 'cmd-2');
    expect(cmd.commands[0]).toEqual({
      ExerciseCommand: { templateId: '#learnDaml-main:Main:TransferProposal', contractId: 'cid-9', choice: 'Accept', choiceArgument: {} },
    });
    expect(cmd.actAs).toEqual(['Bob::xyz']);
  });

  it('builds an ACS request filtered by party and template at an offset', () => {
    const req = buildAcsRequest(TEMPLATE_IDS.Asset, 'Alice::abc', 42);
    expect(req.activeAtOffset).toBe(42);
    expect(req.eventFormat.filtersByParty['Alice::abc'].cumulative[0].identifierFilter.TemplateFilter.value.templateId)
      .toBe('#learnDaml-main:Main:Asset');
  });

  it('derives the hint from a party id', () => {
    expect(hintOf('Alice::1220deadbeef')).toBe('Alice');
  });
});

describe('ledger response extractors', () => {
  it('extracts the allocated party id from an allocate response', () => {
    const data: AllocatePartyResponseType = { partyDetails: { party: 'Alice::1220abc' } };
    expect(extractAllocatedParty(data)).toBe('Alice::1220abc');
  });

  it('extracts parties with derived hints from a list-parties response', () => {
    const data: ListPartiesResponseType = {
      partyDetails: [{ party: 'Alice::1220abc' }, { party: 'sandbox::1220def' }],
    };
    expect(extractParties(data)).toEqual([
      { party: 'Alice::1220abc', hint: 'Alice' },
      { party: 'sandbox::1220def', hint: 'sandbox' },
    ]);
  });

  it('extracts contracts with id and payload from an active-contracts response', () => {
    const data: ActiveContractsResponseType<AssetType> = [
      {
        contractEntry: {
          JsActiveContract: {
            createdEvent: {
              contractId: '009ec9',
              createArgument: {
                owner: 'Alice::1220abc',
                issuer: 'Alice::1220abc',
                name: 'GOLD',
                quantity: '100.0000000000',
              },
            },
          },
        },
      },
    ];
    expect(extractContracts<AssetType>(data)).toEqual([
      {
        contractId: '009ec9',
        payload: {
          owner: 'Alice::1220abc',
          issuer: 'Alice::1220abc',
          name: 'GOLD',
          quantity: '100.0000000000',
        },
      },
    ]);
  });
});
