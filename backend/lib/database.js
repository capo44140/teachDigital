const postgres = require('postgres');

// Configuration de la base de données PostgreSQL
const connectionString = process.env.DATABASE_URL;

// Vérifier que DATABASE_URL est définie et non vide
if (!connectionString || connectionString.trim() === '') {
  const error = new Error('DATABASE_URL non définie ou vide dans les variables d\'environnement. Vérifiez votre configuration Vercel.');
  console.error('❌ Erreur de configuration PostgreSQL:', error.message);
  console.error('💡 Pour Vercel, ajoutez DATABASE_URL dans Settings > Environment Variables');
  throw error;
}

// Créer l'instance de connexion PostgreSQL
let sql;

try {
  // Vérifier que la connection string est valide (commence par postgresql:// ou postgres://)
  if (!connectionString.startsWith('postgresql://') && !connectionString.startsWith('postgres://')) {
    throw new Error('DATABASE_URL doit commencer par postgresql:// ou postgres://');
  }
  
  console.log('🔗 Connexion à PostgreSQL configurée');
  console.log('🔍 DATABASE_URL détectée:', connectionString.replace(/:[^:@]+@/, ':****@')); // Masquer le mot de passe dans les logs
  
  // Configuration avec options pour Neon/Vercel
  sql = postgres(connectionString, {
    ssl: 'require', // Nécessaire pour Neon
    max: 1, // Limiter les connexions pour Vercel serverless
    idle_timeout: 20,
    connect_timeout: 10
  });
} catch (error) {
  console.error('❌ Erreur de configuration PostgreSQL:', error);
  console.error('💡 Vérifiez que DATABASE_URL est correctement configurée sur Vercel');
  throw error;
}

// Fonction pour tester la connexion
async function testConnection() {
  try {
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Connexion à la base de données testée avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error);
    return false;
  }
}

module.exports = {
  default: sql,
  testConnection
};

