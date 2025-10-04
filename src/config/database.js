import { neon } from '@neondatabase/serverless';

// Configuration de la base de données Neon
// En production, les variables d'environnement sont injectées par Vercel
// En développement, elles sont chargées automatiquement par Vite

// Configuration de la base de données Neon
const config = {
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
  host: process.env.NEON_HOST,
  database: process.env.NEON_DATABASE,
  username: process.env.NEON_USERNAME,
  password: process.env.NEON_PASSWORD,
  port: process.env.NEON_PORT || 5432,
  ssl: true
};

// Créer l'instance de connexion Neon
let sql;

try {
  if (config.connectionString) {
    // Utiliser la connection string complète
    sql = neon(config.connectionString);
  } else {
    // Construire la connection string à partir des variables individuelles
    const connectionString = `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}?sslmode=require`;
    sql = neon(connectionString);
  }
  
  console.log('✅ Connexion à Neon DB configurée avec succès');
} catch (error) {
  console.error('❌ Erreur de configuration Neon DB:', error);
  throw error;
}

// Fonction pour tester la connexion
export async function testConnection() {
  try {
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Connexion à la base de données testée avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error);
    return false;
  }
}

// Fonction pour initialiser la base de données
export async function initializeDatabase() {
  try {
    console.log('🚀 Initialisation de la base de données...');
    
    // Créer la table des profils
    await sql`
      CREATE TABLE IF NOT EXISTS profiles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        type VARCHAR(20) NOT NULL CHECK (type IN ('child', 'teen', 'admin')),
        is_admin BOOLEAN DEFAULT FALSE,
        is_child BOOLEAN DEFAULT FALSE,
        is_teen BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        is_locked BOOLEAN DEFAULT FALSE,
        color VARCHAR(50) DEFAULT 'purple',
        avatar_class TEXT,
        avatar_content TEXT,
        image_url TEXT,
        image_data TEXT,
        image_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Créer la table des codes PIN
    await sql`
      CREATE TABLE IF NOT EXISTS pin_codes (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
        pin_code VARCHAR(4) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Créer la table des sessions
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Créer les index pour améliorer les performances
    await sql`CREATE INDEX IF NOT EXISTS idx_profiles_type ON profiles(type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`;
    
    console.log('✅ Base de données initialisée avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
    return false;
  }
}

// Fonction pour insérer des données de test
export async function insertTestData() {
  try {
    console.log('📝 Insertion des données de test...');
    
    // Vérifier si des profils existent déjà
    const existingProfiles = await sql`SELECT COUNT(*) as count FROM profiles`;
    
    if (existingProfiles[0].count > 0) {
      console.log('ℹ️ Des profils existent déjà, pas d\'insertion de données de test');
      return true;
    }
    
    // Insérer les profils de test
    const testProfiles = [
      {
        name: 'Parent',
        description: 'Profil administrateur avec accès complet',
        type: 'admin',
        is_admin: true,
        is_child: false,
        is_teen: false,
        is_active: true,
        is_locked: true,
        color: 'teal',
        avatar_class: 'bg-gradient-to-br from-teal-400 to-blue-500',
        avatar_content: '<div class="relative"><svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9v1H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1V9c0-3.87-3.13-7-7-7zm0 2c2.76 0 5 2.24 5 5v1H7V9c0-2.76 2.24-5 5-5z"/></svg></div>'
      },
      {
        name: 'Ayna',
        description: 'Profil enfant - Accès limité',
        type: 'child',
        is_admin: false,
        is_child: true,
        is_teen: false,
        is_active: true,
        is_locked: false,
        color: 'purple',
        avatar_class: 'bg-gradient-to-br from-purple-500 to-pink-500',
        avatar_content: '<div class="w-16 h-16 bg-white rounded-full flex items-center justify-center"><div class="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center"><div class="w-8 h-8 bg-white rounded-full flex items-center justify-center"><div class="w-6 h-6 bg-gray-800 rounded-full"></div></div></div></div>'
      },
      {
        name: 'Nolann',
        description: 'Profil enfant - Accès limité',
        type: 'child',
        is_admin: false,
        is_child: true,
        is_teen: false,
        is_active: true,
        is_locked: false,
        color: 'red',
        avatar_class: 'bg-gradient-to-br from-red-500 to-blue-500',
        avatar_content: '<div class="w-16 h-16 bg-white rounded-lg flex items-center justify-center"><div class="w-12 h-12 bg-gray-300 rounded flex flex-col items-center justify-center"><div class="w-8 h-2 bg-blue-500 rounded mb-1"></div><div class="w-6 h-4 bg-red-500 rounded"></div></div></div>'
      },
      {
        name: 'Elyo',
        description: 'Profil enfant - Accès limité',
        type: 'child',
        is_admin: false,
        is_child: true,
        is_teen: false,
        is_active: true,
        is_locked: false,
        color: 'green',
        avatar_class: 'bg-gradient-to-br from-green-400 to-emerald-500',
        avatar_content: '<div class="w-16 h-16 bg-green-300 rounded-full flex items-center justify-center"><div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center relative"><div class="absolute top-2 left-2 w-2 h-2 bg-white rounded-full"></div><div class="absolute top-2 right-2 w-2 h-2 bg-white rounded-full"></div><div class="absolute top-4 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div><div class="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-white rounded-full"></div></div></div>'
      }
    ];
    
    for (const profile of testProfiles) {
      await sql`
        INSERT INTO profiles (name, description, type, is_admin, is_child, is_teen, is_active, is_locked, color, avatar_class, avatar_content)
        VALUES (${profile.name}, ${profile.description}, ${profile.type}, ${profile.is_admin}, ${profile.is_child}, ${profile.is_teen}, ${profile.is_active}, ${profile.is_locked}, ${profile.color}, ${profile.avatar_class}, ${profile.avatar_content})
      `;
    }
    
    // Insérer le code PIN par défaut pour le profil parent
    await sql`
      INSERT INTO pin_codes (profile_id, pin_code)
      VALUES (1, '1234')
    `;
    
    console.log('✅ Données de test insérées avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion des données de test:', error);
    return false;
  }
}

export default sql;
