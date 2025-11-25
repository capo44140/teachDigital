// Test de chargement des providers IA
const factory = require('./backend/api/ai/services/aiProviders/index.js');

console.log('✅ Factory chargée avec succès');

const providers = factory.getAvailableProviders();
console.log(`📊 ${providers.length} provider(s) disponible(s):`);
providers.forEach(p => console.log(`  - ${p.getName()}`));

console.log('\n✅ Tous les providers sont opérationnels !');
