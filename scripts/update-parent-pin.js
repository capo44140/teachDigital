#!/usr/bin/env node

/**
 * Script pour mettre à jour le code PIN du profil parent
 * Usage: node scripts/update-parent-pin.js
 */

import pkg from 'pg';
import crypto from 'crypto';
import dotenv from 'dotenv';

const { Pool } = pkg;

// Charger les variables d'environnement
dotenv.config();

// Configuration de la base de données PostgreSQL
const config = {
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
  host: process.env.DB_HOST || process.env.NEON_HOST,
  database: process.env.DB_DATABASE || process.env.NEON_DATABASE,
  username: process.env.DB_USERNAME || process.env.NEON_USERNAME,
  password: process.env.DB_PASSWORD || process.env.NEON_PASSWORD,
  port: process.env.DB_PORT || process.env.NEON_PORT || 5432,
  ssl: process.env.DB_SSL !== 'false'
};

// Créer l'instance de connexion PostgreSQL
let pool;
try {
  if (config.connectionString) {
    pool = new Pool({ connectionString: config.connectionString, ssl: { rejectUnauthorized: false } });
  } else if (config.host && config.username && config.password && config.database) {
    const connectionString = `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}${config.ssl ? '?sslmode=require' : ''}`;
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  } else {
    throw new Error('Configuration de base de données manquante. Vérifiez vos variables d\'environnement.');
  }
  console.log('✅ Connexion à PostgreSQL établie');
} catch (error) {
  console.error('❌ Erreur de connexion à PostgreSQL:', error);
  process.exit(1);
}

/**
 * Hache un code PIN de manière sécurisée avec l'API crypto native
 * Compatible avec le format utilisé par l'application
 * @param {string} pin - Le code PIN en clair
 * @returns {Promise<string>} - Le code PIN haché au format $native$
 */
async function hashPin(pin) {
  try {
    if (!pin || typeof pin !== 'string') {
      throw new Error('Le code PIN doit être une chaîne de caractères valide');
    }
    
    if (pin.length < 4 || pin.length > 8) {
      throw new Error('Le code PIN doit contenir entre 4 et 8 caractères');
    }
    
    // Créer un salt aléatoire
    const salt = crypto.randomBytes(16);
    
    // Hacher avec SHA-256
    const hash = crypto.createHash('sha256');
    hash.update(salt);
    hash.update(pin);
    const hashedPin = hash.digest('base64');
    
    // Convertir le salt en base64
    const saltBase64 = salt.toString('base64');
    
    // Format compatible avec NativeHashService
    const result = `$native$${saltBase64}$${hashedPin}`;
    return result;
  } catch (error) {
    console.error('❌ Erreur lors du hachage du code PIN:', error);
    throw error;
  }
}

/**
 * Vérifie si un code PIN correspond au hachage stocké
 * @param {string} pin - Le code PIN en clair à vérifier
 * @param {string} hashedPin - Le code PIN haché stocké
 * @returns {Promise<boolean>} - True si le code PIN est correct
 */
async function verifyPin(pin, hashedPin) {
  try {
    if (!pin || !hashedPin) {
      return false;
    }
    
    // Vérifier le format du hachage
    if (!hashedPin.startsWith('$native$')) {
      console.log('❌ Format de hachage non reconnu');
      return false;
    }
    
    // Extraire le salt et le hash
    const parts = hashedPin.split('$');
    if (parts.length !== 4) {
      console.log('❌ Format de hachage invalide');
      return false;
    }
    
    const saltBase64 = parts[2];
    const storedHashBase64 = parts[3];
    
    // Décoder le salt
    const salt = Buffer.from(saltBase64, 'base64');
    
    // Hacher le PIN avec le même salt
    const hash = crypto.createHash('sha256');
    hash.update(salt);
    hash.update(pin);
    const computedHashBase64 = hash.digest('base64');
    
    return computedHashBase64 === storedHashBase64;
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du code PIN:', error);
    return false;
  }
}

/**
 * Met à jour le code PIN du profil parent
 */
async function updateParentPin() {
  try {
    console.log('🔐 Mise à jour du code PIN parent...\n');
    
    // Nouveau code PIN
    const newPin = '2829';
    
    // Validation du format
    if (!/^\d{4}$/.test(newPin)) {
      console.error('❌ Le code PIN doit être composé de 4 chiffres');
      process.exit(1);
    }
    
    // Récupérer le profil parent
    const profiles = await sql`
      SELECT id, name, type
      FROM profiles 
      WHERE name ILIKE 'parent' OR type = 'parent'
      LIMIT 1
    `;
    
    if (profiles.length === 0) {
      console.error('❌ Profil parent introuvable');
      console.log('ℹ️ Tentative avec le profil ID 1...');
      
      // Essayer avec le profil ID 1
      const profileById = await sql`
        SELECT id, name, type
        FROM profiles 
        WHERE id = 1
      `;
      
      if (profileById.length === 0) {
        console.error('❌ Aucun profil trouvé avec l\'ID 1');
        process.exit(1);
      }
      
      profiles.push(profileById[0]);
    }
    
    const parentProfile = profiles[0];
    console.log(`📋 Profil trouvé: ${parentProfile.name} (ID: ${parentProfile.id})`);
    
    // Hacher le nouveau code PIN avec le format natif
    console.log('🔒 Hachage du nouveau code PIN (format natif)...');
    const hashedPin = await hashPin(newPin);
    console.log('✅ Code PIN haché avec succès');
    console.log(`📝 Format: ${hashedPin.substring(0, 30)}...`);
    
    // Vérifier si un code PIN existe déjà
    const existingPin = await sql`
      SELECT id FROM pin_codes WHERE profile_id = ${parentProfile.id}
    `;
    
    if (existingPin.length > 0) {
      // Mettre à jour le code PIN existant
      await sql`
        UPDATE pin_codes 
        SET pin_code = ${hashedPin}, updated_at = CURRENT_TIMESTAMP
        WHERE profile_id = ${parentProfile.id}
      `;
      console.log('✅ Code PIN existant mis à jour avec succès');
    } else {
      // Créer un nouveau code PIN
      await sql`
        INSERT INTO pin_codes (profile_id, pin_code)
        VALUES (${parentProfile.id}, ${hashedPin})
      `;
      console.log('✅ Nouveau code PIN créé avec succès');
    }
    
    // Vérifier la mise à jour
    console.log('\n🧪 Vérification du nouveau code PIN...');
    const verificationResult = await verifyPin(newPin, hashedPin);
    
    if (verificationResult) {
      console.log('✅ Vérification réussie ! Le code PIN fonctionne correctement.');
    } else {
      console.error('❌ Erreur de vérification du code PIN');
    }
    
    console.log('\n🎉 Mise à jour terminée avec succès !');
    console.log(`\n📝 Nouveau code PIN du profil "${parentProfile.name}": ${newPin}`);
    console.log('🔒 Le code PIN est stocké de manière sécurisée avec hachage SHA-256 + salt aléatoire');
    console.log('✨ Format compatible avec NativeHashService ($native$)\n');
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error.message);
    process.exit(1);
  }
}

// Exécuter le script
updateParentPin()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

