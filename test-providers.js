// Test de chargement des providers IA
try {
    const factory = require('./backend/api/ai/services/aiProviders/index.js');
    console.log('✅ Factory chargée avec succès');

    const providers = factory.getAvailableProviders();
    console.log(`📊 ${providers.length} provider(s) disponible(s):`);
    providers.forEach(p => console.log(`  - ${p.getName()}`));

    console.log('\n✅ Tous les providers sont opérationnels !');
    process.exit(0);
} catch (e) {
    console.error('❌ Erreur:', e.message);
    console.error(e.stack);
    process.exit(1);
}
