import { describe, it, expect } from 'vitest'
import {
  isPinFormatValid,
  isTrivialPin,
  sanitizePinInput,
  validateNewPin
} from '../../src/utils/pinPolicy.js'

describe('pinPolicy', () => {
  it('accepte 4 à 8 chiffres pour la saisie (anciens PIN à 4 chiffres compris)', () => {
    expect(isPinFormatValid('4821')).toBe(true)
    expect(isPinFormatValid('48213907')).toBe(true)
    expect(isPinFormatValid('482')).toBe(false)
    expect(isPinFormatValid('482139071')).toBe(false)
    expect(isPinFormatValid('48a1')).toBe(false)
  })

  it('ne garde que les chiffres, 8 au maximum', () => {
    expect(sanitizePinInput('12 34-56ab7890')).toBe('12345678')
    expect(sanitizePinInput(null)).toBe('')
  })

  it('détecte les PIN triviaux (chiffres identiques, suites)', () => {
    expect(isTrivialPin('0000')).toBe(true)
    expect(isTrivialPin('123456')).toBe(true)
    expect(isTrivialPin('987654')).toBe(true)
    expect(isTrivialPin('890123')).toBe(true)
    expect(isTrivialPin('482913')).toBe(false)
  })

  it('exige 6 chiffres minimum pour un nouveau PIN parent', () => {
    expect(validateNewPin('4829', { isParent: true }).isValid).toBe(false)
    expect(validateNewPin('4829', { isParent: true }).message).toMatch(/entre 6 et 8 chiffres/)
    expect(validateNewPin('482913', { isParent: true })).toEqual({ isValid: true, message: null })
  })

  it('refuse un nouveau PIN trop simple', () => {
    const result = validateNewPin('1234')
    expect(result.isValid).toBe(false)
    expect(result.message).toMatch(/trop simple/)
  })
})
