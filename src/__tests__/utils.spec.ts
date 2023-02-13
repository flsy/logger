import { appendWhen } from '../utils';

describe('utils', () => {
  describe('appendWhen', () => {
    it('correctly appends item to array when condition is met', () => {
      expect(appendWhen(() => 0, true)([])).toEqual([0]);
    });

    it('does not append item to array when condition is met', () => {
      expect(appendWhen(() => 0, false)([])).toEqual([]);
    });
  });
});
