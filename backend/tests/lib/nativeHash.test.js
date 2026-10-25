/**
 * Tests du hachage des PIN (lib/nativeHash.js) : coût bcrypt et migration des anciens hash
 */

const bcrypt = require('bcryptjs');
const { NativeHashService } = require('../../lib/nativeHash.js');

describe('NativeHashService.needsRehash', () => {
  it('ne re-hache pas un hash au coût courant', async () => {
    const hash = await NativeHashService.hashPin('4826');
    expect(bcrypt.getRounds(hash)).toBe(12);
    expect(NativeHashService.needsRehash(hash)).toBe(false);
  });

  it('re-hache un hash bcrypt de coût inférieur', async () => {
    const hash = await bcrypt.hash('4826', 4);
    expect(NativeHashService.needsRehash(hash)).toBe(true);
  });

  it('re-hache un ancien hash SHA-256', () => {
    expect(NativeHashService.needsRehash('$native$sel$abc')).toBe(true);
  });

  it('ignore une valeur qui n\'est pas un hash', () => {
    expect(NativeHashService.needsRehash('pas-un-hash')).toBe(false);
    expect(NativeHashService.needsRehash(null)).toBe(false);
  });
});
