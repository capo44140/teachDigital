// Point d'entrée pour Vercel Serverless Functions
// Monte le routeur backend sur /api pour que les chemins (ex. /auth/family-gate) matchent correctement

const express = require('express');
const apiRouter = require('../backend/api/index.js');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api', apiRouter);

module.exports = (req, res) => app(req, res);
