import { describe, expect, it } from 'vitest';
import { dictionaryEntry, glossarySegments } from './dictionary';

describe('chess dictionary', () => {
  it('provides a visual definition entry for common training terms', () => {
    expect(dictionaryEntry('pin')).toMatchObject({ term: 'Pin', visual: 'pin' });
    expect(dictionaryEntry('pawn-break')?.visualCaption).toContain('arrow');
  });

  it('finds glossary terms without changing the surrounding copy', () => {
    expect(glossarySegments('Spot the loose piece, then use calculation on a line.')).toEqual([
      { text: 'Spot the ' },
      { text: 'loose piece', termId: 'loose-piece' },
      { text: ', then use ' },
      { text: 'calculation', termId: 'calculation' },
      { text: ' on a ' },
      { text: 'line', termId: 'line' },
      { text: '.' }
    ]);
  });
});
