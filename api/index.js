// Point d'entrée pour Vercel Serverless Functions
// Ce fichier réexporte le handler principal depuis backend/api/index.js

// Vercel utilise CommonJS pour les Serverless Functions
module.exports = require('../backend/api/index.js');

