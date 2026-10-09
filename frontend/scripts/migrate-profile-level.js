#!/usr/bin/env node

/**
 * Script de migration pour ajouter le champ level aux profils
 * Exécute: node scripts/migrate-profile-level.js
 */

import db from '../../backend/lib/database.js'

const sql = db.sql || db.default

async function migrateProfileLevel() {
  try {
    console.log('🚀 Début de la migration pour ajouter le niveau aux profils...')
    
    // Vérifier si la colonne level existe déjà
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      AND column_name = 'level'
    `
    
    if (columnExists.length > 0) {
      console.log('ℹ️ La colonne level existe déjà')
      return true
    }
    
    // Ajouter la colonne level
    console.log('📝 Ajout de la colonne level...')
    await sql`
      ALTER TABLE profiles 
      ADD COLUMN level VARCHAR(50) DEFAULT NULL
    `
    
    console.log('✅ Colonne level ajoutée avec succès')
    
    // Vérifier la structure de la table
    const tableStructure = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'profiles'
      ORDER BY ordinal_position
    `
    
    console.log('📋 Structure de la table profiles:')
    tableStructure.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'}) ${col.column_default ? `default: ${col.column_default}` : ''}`)
    })
    
    console.log('✅ Migration terminée avec succès !')
    return true
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error)
    return false
  }
}

// Fonction pour vérifier l'état actuel des profils
async function checkProfiles() {
  try {
    console.log('📊 Vérification des profils actuels...')
    
    const profiles = await sql`
      SELECT id, name, type, is_child, is_teen, is_admin, level
      FROM profiles 
      ORDER BY name
    `
    
    console.log('👥 Profils actuels:')
    profiles.forEach(profile => {
      console.log(`  - ${profile.name} (${profile.type}): level=${profile.level || 'non défini'}`)
    })
    
    return profiles
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error)
    return []
  }
}

// Fonction pour mettre à jour le niveau d'un profil
async function updateProfileLevel(profileId, level) {
  try {
    console.log(`🔄 Mise à jour du niveau pour le profil ${profileId} vers ${level}`)
    
    const result = await sql`
      UPDATE profiles 
      SET level = ${level}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${profileId}
      RETURNING id, name, level
    `
    
    console.log('✅ Niveau mis à jour:', result[0])
    return result[0]
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du niveau:', error)
    throw error
  }
}

// Fonction principale
async function main() {
  const command = process.argv[2]
  
  try {
    switch (command) {
      case 'migrate':
        await migrateProfileLevel()
        break
      case 'check':
        await checkProfiles()
        break
      case 'update':
        const profileId = process.argv[3]
        const level = process.argv[4]
        if (!profileId || !level) {
          console.error('Usage: node scripts/migrate-profile-level.js update <profileId> <level>')
          process.exit(1)
        }
        await updateProfileLevel(parseInt(profileId), level)
        break
      default:
        console.log('Usage:')
        console.log('  node scripts/migrate-profile-level.js migrate  - Ajouter la colonne level')
        console.log('  node scripts/migrate-profile-level.js check    - Vérifier les profils')
        console.log('  node scripts/migrate-profile-level.js update <id> <level> - Mettre à jour un profil')
        break
    }
  } catch (error) {
    console.error('❌ Erreur:', error)
    process.exit(1)
  }
}

// Exécuter le script
main()
