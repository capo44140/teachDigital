/**
 * Script de débogage pour vérifier les profils en base de données
 */

import postgres from 'postgres'
import dotenv from 'dotenv'

// Charger les variables d'environnement
dotenv.config()

// Configuration de la base de données PostgreSQL
const sql = postgres(process.env.DATABASE_URL || process.env.VITE_DATABASE_URL)

async function checkProfilesDebug() {
  try {
    console.log('🔍 [DEBUG] Vérification des profils en base de données...')
    
    // Récupérer tous les profils
    const profiles = await sql`
      SELECT id, name, type, is_admin, is_child, is_teen, is_active, level
      FROM profiles 
      ORDER BY id
    `
    
    console.log(`📊 [DEBUG] ${profiles.length} profils trouvés en base:`)
    
    profiles.forEach(profile => {
      console.log(`\n👤 Profil ID ${profile.id}:`)
      console.log(`   Nom: ${profile.name}`)
      console.log(`   Type: ${profile.type}`)
      console.log(`   is_admin: ${profile.is_admin}`)
      console.log(`   is_child: ${profile.is_child}`)
      console.log(`   is_teen: ${profile.is_teen}`)
      console.log(`   is_active: ${profile.is_active}`)
      console.log(`   level: ${profile.level}`)
      
      // Vérifier si c'est un profil enfant/adolescent
      const isChildOrTeen = profile.is_child || profile.is_teen
      console.log(`   ✅ Peut accéder au dashboard enfant: ${isChildOrTeen}`)
    })
    
    // Vérifier s'il y a des profils enfants/adolescents
    const childProfiles = profiles.filter(p => p.is_child)
    const teenProfiles = profiles.filter(p => p.is_teen)
    const childOrTeenProfiles = profiles.filter(p => p.is_child || p.is_teen)
    
    console.log(`\n📈 [DEBUG] Résumé:`)
    console.log(`   Profils enfants: ${childProfiles.length}`)
    console.log(`   Profils adolescents: ${teenProfiles.length}`)
    console.log(`   Profils enfants/adolescents: ${childOrTeenProfiles.length}`)
    console.log(`   Profils admin: ${profiles.filter(p => p.is_admin).length}`)
    
    if (childOrTeenProfiles.length === 0) {
      console.log('\n⚠️ [DEBUG] ATTENTION: Aucun profil enfant/adolescent trouvé!')
      console.log('   Il faut créer des profils avec is_child=true ou is_teen=true')
    }
    
    return profiles
    
  } catch (error) {
    console.error('❌ [DEBUG] Erreur lors de la vérification des profils:', error)
    return []
  }
}

// Exécuter si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  checkProfilesDebug().then(() => {
    process.exit(0)
  }).catch(error => {
    console.error('Erreur fatale:', error)
    process.exit(1)
  })
}

export { checkProfilesDebug }
