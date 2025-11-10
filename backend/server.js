/**
 * Serveur Express pour TeachDigital Backend
 * Remplace le handler Vercel Functions pour le déploiement Docker
 */

const express = require('express');
const handler = require('./api/index.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware pour parser le body
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configuration CORS - Middleware personnalisé pour un contrôle total
// DOIT être défini AVANT tous les autres middlewares
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Construire la liste des origines autorisées
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://teach-digital.vercel.app',
    'https://teachdigital.vercel.app'
  ];
  
  // Ajouter FRONTEND_URL si défini
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
  
  // Ajouter ALLOWED_ORIGIN si défini (peut contenir plusieurs URLs séparées par des virgules)
  if (process.env.ALLOWED_ORIGIN) {
    const additionalOrigins = process.env.ALLOWED_ORIGIN.split(',')
      .map(url => url.trim())
      .filter(Boolean);
    allowedOrigins.push(...additionalOrigins);
  }
  
  // Autoriser localhost en développement
  const isLocalhost = origin && origin.startsWith('http://localhost');
  const isAllowedOrigin = origin && (allowedOrigins.includes(origin) || isLocalhost);
  
  // Définir l'origine CORS : utiliser l'origine si elle est autorisée, sinon '*'
  // Note: '*' ne peut pas être utilisé avec credentials: true
  const corsOrigin = (origin && isAllowedOrigin) ? origin : (process.env.NODE_ENV === 'development' ? '*' : null);
  
  // Log pour le débogage
  if (req.method === 'OPTIONS') {
    console.log(`🔍 Requête OPTIONS (preflight) - Origin: ${origin}, Allowed: ${isAllowedOrigin}, CORS Origin: ${corsOrigin}`);
    console.log(`📋 Origines autorisées: ${allowedOrigins.join(', ')}`);
  }
  
  // Définir les en-têtes CORS sur toutes les réponses
  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Access-Control-Allow-Credentials', corsOrigin !== '*' ? 'true' : 'false');
    res.setHeader('Vary', 'Origin');
  } else {
    // Si l'origine n'est pas autorisée, ne pas définir les en-têtes CORS
    // Cela permettra au navigateur d'afficher une erreur CORS claire
    console.warn(`⚠️ Origine non autorisée: ${origin}`);
  }
  
  // Gérer les requêtes OPTIONS (preflight) - DOIT retourner immédiatement
  if (req.method === 'OPTIONS') {
    console.log(`✅ En-têtes CORS définis pour OPTIONS: Access-Control-Allow-Origin=${corsOrigin || 'none'}`);
    return res.status(corsOrigin ? 200 : 403).end();
  }
  
  next();
});

// Middleware pour convertir les requêtes Express en format compatible avec le handler Vercel
app.use('*', async (req, res) => {
  // Les requêtes OPTIONS sont déjà gérées par le middleware CORS précédent
  
  // Créer un objet de requête compatible avec le handler Vercel
  const vercelReq = {
    method: req.method,
    url: req.originalUrl || req.url,
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params
  };
  
  // Créer un objet de réponse compatible avec Express
  // Le handler utilise directement res.status(), res.json(), etc.
  // donc on peut passer directement res
  try {
    await handler(vercelReq, res);
  } catch (error) {
    console.error('❌ Erreur dans le handler:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Erreur serveur interne: ' + error.message
      });
    }
  }
});

// Route de santé pour Docker
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur TeachDigital démarré sur le port ${PORT}`);
  console.log(`📡 Mode: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🔗 URL: http://0.0.0.0:${PORT}`);
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

