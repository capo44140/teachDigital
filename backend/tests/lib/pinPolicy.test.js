/**
 * Politique des nouveaux codes PIN (lib/pinPolicy.js, scripts/pinPolicy.js, NativeHashService).
 */

const { isTrivialPin, checkNewPin } = require('../../lib/pinPolicy.js');
const { assertStrongPin } = require('../../scripts/pinPolicy.js');
const { NativeHashService } = require('../../lib/nativeHash.js');

describe('isTrivialPin', () => {
  it.each(['0000', '1111', '1234', '0123', '4321', '9876', '123456', '987654', '1212', '123123', '121212', '2580', '6969'])(
    '%s est trivial',
    pin => expect(isTrivialPin(pin)).toBe(true)
  );

  it.each(['4826', '1357', '135790', '482613', '90817263'])('%s est accepté', pin => {
    expect(isTrivialPin(pin)).toBe(false);
  });
});

describe('checkNewPin', () => {
  it('WEAK_PIN pour un code trivial', () => {
    expect(checkNewPin('1234')).toMatchObject({ ok: false, code: 'WEAK_PIN' });
    expect(checkNewPin('1234').message).toMatch(/trop facile/);
  });

  it('PIN_TOO_SHORT pour un profil parent de moins de 6 chiffres', () => {
    expect(checkNewPin('4826', { isAdmin: true })).toMatchObject({ ok: false, code: 'PIN_TOO_SHORT' });
    expect(checkNewPin('482613', { isAdmin: true }).ok).toBe(true);
    expect(checkNewPin('4826').ok).toBe(true);
  });

  it('INVALID_PIN hors format', () => {
    expect(checkNewPin('48a6').code).toBe('INVALID_PIN');
    expect(checkNewPin(4826).code).toBe('INVALID_PIN');
  });
});

describe('compatibilité', () => {
  it('assertStrongPin (scripts) applique la même politique', () => {
    expect(assertStrongPin(' 4826 ')).toBe('4826');
    expect(() => assertStrongPin('1111')).toThrow(/trop facile/);
    expect(() => assertStrongPin('12')).toThrow(/4 à 8 chiffres/);
  });

  it('NativeHashService.validatePinFormat délègue à la politique', () => {
    expect(NativeHashService.validatePinFormat('4826')).toMatchObject({ isValid: true });
    expect(NativeHashService.validatePinFormat('0000')).toMatchObject({ isValid: false, code: 'WEAK_PIN' });
    expect(NativeHashService.validatePinFormat('4826', { isAdmin: true })).toMatchObject({ isValid: false, code: 'PIN_TOO_SHORT' });
  });
});
