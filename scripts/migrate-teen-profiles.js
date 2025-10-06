/**
 * Script de migration pour convertir des profils enfants en adolescents
 * Utilise la base de données Neon pour mettre à jour les profils
 */

import sql from '../src/config/database.js';

async function migrateTeenProfiles() {
  try {
    console.log('🔄 Début de la migration des profils adolescents...');
    
    // Mettre à jour Ayna pour qu'elle soit un adolescent
    const aynaUpdate = await sql`
      UPDATE profiles 
      SET 
        type = 'teen',
        is_child = false,
        is_teen = true,
        description = 'Profil adolescent - Accès limité',
        updated_at = CURRENT_TIMESTAMP
      WHERE name = 'Ayna'
    `;
    
    console.log('✅ Profil Ayna mis à jour vers adolescent');
    
    // Vérifier les profils mis à jour
    const updatedProfiles = await sql`
      SELECT id, name, type, is_child, is_teen, is_admin, is_active
      FROM profiles 
      WHERE name = 'Ayna'
    `;
    
    console.log('📊 Profils mis à jour:', updatedProfiles);
    
    // Afficher tous les profils non-administrateurs
    const nonAdminProfiles = await sql`
      SELECT id, name, type, is_child, is_teen, is_admin, is_active
      FROM profiles 
      WHERE is_active = true AND is_admin = false AND (is_child = true OR is_teen = true)
      ORDER BY name
    `;
    
    console.log('👥 Tous les profils non-administrateurs:');
    nonAdminProfiles.forEach(profile => {
      console.log(`  - ${profile.name} (${profile.type}): child=${profile.is_child}, teen=${profile.is_teen}`);
    });
    
    console.log('✅ Migration terminée avec succès');
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    return false;
  }
}

// Fonction pour vérifier l'état actuel des profils
async function checkProfiles() {
  try {
    console.log('🔍 Vérification de l\'état actuel des profils...');
    
    const allProfiles = await sql`
      SELECT id, name, type, is_child, is_teen, is_admin, is_active, created_at, updated_at
      FROM profiles 
      ORDER BY name
    `;
    
    console.log('📋 Tous les profils:');
    allProfiles.forEach(profile => {
      const status = profile.is_active ? '✅ Actif' : '❌ Inactif';
      const role = profile.is_admin ? '👑 Admin' : 
                   profile.is_teen ? '🧑‍🎓 Teen' : 
                   profile.is_child ? '👶 Child' : '❓ Inconnu';
      console.log(`  ${profile.id}. ${profile.name} - ${role} - ${status}`);
    });
    
    return allProfiles;
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    return [];
  }
}

// Fonction pour créer un profil adolescent
async function createTeenProfile(name, description, color = 'blue') {
  try {
    console.log(`🆕 Création du profil adolescent: ${name}`);
    
    const result = await sql`
      INSERT INTO profiles (
        name, description, type, is_admin, is_child, is_teen, 
        is_active, is_locked, color, avatar_class, avatar_content
      )
      VALUES (
        ${name}, ${description}, 'teen', false, false, true,
        true, false, ${color}, 
        'bg-gradient-to-br from-blue-500 to-purple-500',
        '<div class="w-16 h-16 bg-blue-300 rounded-full flex items-center justify-center"><div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center"><div class="w-8 h-8 bg-white rounded-full flex items-center justify-center"><div class="w-6 h-6 bg-blue-600 rounded-full"></div></div></div></div>'
      )
      RETURNING *
    `;
    
    console.log('✅ Profil adolescent créé:', result[0]);
    return result[0];
  } catch (error) {
    console.error('❌ Erreur lors de la création du profil:', error);
    throw error;
  }
}

// Fonction principale
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'migrate':
      await migrateTeenProfiles();
      break;
    case 'check':
      await checkProfiles();
      break;
    case 'create':
      const name = process.argv[3] || 'Nouveau Teen';
      const description = process.argv[4] || 'Profil adolescent';
      await createTeenProfile(name, description);
      break;
    default:
      console.log('Usage:');
      console.log('  node scripts/migrate-teen-profiles.js migrate  - Migrer Ayna vers teen');
      console.log('  node scripts/migrate-teen-profiles.js check     - Vérifier les profils');
      console.log('  node scripts/migrate-teen-profiles.js create [name] [description] - Créer un profil teen');
      break;
  }
}

// Exécuter le script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(() => {
    console.log('🏁 Script terminé');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });
}

export { migrateTeenProfiles, checkProfiles, createTeenProfile };
