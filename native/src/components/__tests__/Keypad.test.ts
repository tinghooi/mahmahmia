import { pressKey } from '../Keypad';

describe('pressKey', () => {
  it('appends digits', () => {
    expect(pressKey('', '5')).toBe('5');
    expect(pressKey('5', '3')).toBe('53');
  });
  it('replaces a leading 0', () => {
    expect(pressKey('0', '7')).toBe('7');
  });
  it('inserts a single decimal point, prefixing 0 if empty', () => {
    expect(pressKey('', '.')).toBe('0.');
    expect(pressKey('12', '.')).toBe('12.');
    expect(pressKey('12.5', '.')).toBe('12.5');
  });
  it('backspaces', () => {
    expect(pressKey('123', '⌫')).toBe('12');
    expect(pressKey('', '⌫')).toBe('');
  });
  it('caps digit length at 12', () => {
    const twelve = '123456789012';
    expect(pressKey(twelve, '3')).toBe(twelve);
  });
});
