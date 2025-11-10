/**
 * Serveur Express pour TeachDigital Backend
 * Remplace le handler Vercel Functions pour le déploiement Docker
 */

const express = require('express');
const cors = require('cors');
const handler = require('./api/index.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware pour parser le body
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configuration CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Autoriser toutes les origines en développement
    if (process.env.NODE_ENV === 'development' || !origin) {
      return callback(null, true);
    }
    
    // Liste des origines autorisées en production
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://teach-digital.vercel.app',
      'https://teachdigital.vercel.app',
      process.env.FRONTEND_URL,
      process.env.ALLOWED_ORIGIN
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // Cache preflight pour 24h
  preflightContinue: false, // Laisser Express gérer les requêtes preflight
  optionsSuccessStatus: 200 // Certains navigateurs anciens nécessitent 200
};

app.use(cors(corsOptions));

// Middleware pour convertir les requêtes Express en format compatible avec le handler Vercel
app.use('*', async (req, res) => {
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

