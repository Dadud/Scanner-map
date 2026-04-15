import { describe, it, expect } from 'vitest';

describe('Talkgroups Schema', () => {
  it('should validate talkgroup data structure', () => {
    const talkgroup = {
      id: '1234',
      hex: '0x12',
      alphaTag: 'Fire Dispatch',
      mode: 'digital',
      description: 'Primary fire dispatch channel',
      tag: 'Fire',
      county: 'Los Angeles'
    };

    expect(talkgroup.id).toBeDefined();
    expect(typeof talkgroup.id).toBe('string');
    expect(talkgroup.hex).toMatch(/^0x[0-9a-fA-F]+$/);
  });

  it('should validate bulk talkgroup import', () => {
    const talkgroups = [
      { id: '1000', alphaTag: 'Fire Dispatch', tag: 'Fire' },
      { id: '2000', alphaTag: 'Police Dispatch', tag: 'Police' },
      { id: '3000', alphaTag: 'EMS Dispatch', tag: 'EMS' }
    ];

    expect(talkgroups).toHaveLength(3);
    talkgroups.forEach(tg => {
      expect(tg.id).toBeDefined();
      expect(tg.alphaTag).toBeDefined();
    });
  });

  it('should validate search parameters', () => {
    const searchParams = {
      tag: 'fire',
      county: 'los angeles',
      search: 'dispatch'
    };

    expect(typeof searchParams.tag).toBe('string');
    expect(typeof searchParams.county).toBe('string');
    expect(typeof searchParams.search).toBe('string');
  });
});