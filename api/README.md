# API - Vercel Serverless Functions

Ce dossier contient le point d'entrée pour les Serverless Functions de Vercel.

## Structure

- `index.js` : Point d'entrée principal qui réexporte le handler depuis `backend/api/index.js`

## Pourquoi ce dossier ?

Vercel cherche automatiquement les Serverless Functions dans un dossier `api/` à la racine du projet. 
Ce fichier sert de pont entre la structure attendue par Vercel et notre structure backend organisée dans `backend/`.

## Déploiement

Lors du déploiement sur Vercel :
1. Vercel détecte automatiquement le dossier `api/`
2. Chaque fichier `.js` dans ce dossier devient une Serverless Function
3. Le fichier `api/index.js` gère toutes les routes `/api/*`

## Configuration

La configuration Vercel se trouve dans `vercel.json` à la racine du projet.


