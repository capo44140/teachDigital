#!/usr/bin/env node

/**
 * Script d'analyse du bundle pour optimiser les performances
 * Analyse la taille des chunks et identifie les opportunités d'optimisation
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class BundleAnalyzer {
  constructor() {
    this.distPath = path.join(__dirname, '..', 'dist')
    this.assetsPath = path.join(this.distPath, 'assets')
    this.analysis = {
      totalSize: 0,
      chunks: [],
      recommendations: [],
      warnings: []
    }
  }

  /**
   * Analyse le bundle de production
   */
  async analyze() {
    console.log('🔍 Analyse du bundle de production...\n')

    if (!fs.existsSync(this.distPath)) {
      console.error('❌ Dossier dist/ non trouvé. Exécutez "pnpm run build" d\'abord.')
      process.exit(1)
    }

    // Analyser les fichiers JavaScript
    await this.analyzeJavaScriptFiles()
    
    // Analyser les assets
    await this.analyzeAssets()
    
    // Générer les recommandations
    this.generateRecommendations()
    
    // Afficher le rapport
    this.displayReport()
  }

  /**
   * Analyse les fichiers JavaScript
   */
  async analyzeJavaScriptFiles() {
    const jsFiles = this.getFilesByExtension('.js')
    
    for (const file of jsFiles) {
      const filePath = path.join(this.assetsPath, file)
      const stats = fs.statSync(filePath)
      const size = stats.size
      
      const chunk = {
        name: file,
        size: size,
        sizeKB: Math.round(size / 1024 * 100) / 100,
        sizeMB: Math.round(size / 1024 / 1024 * 1000) / 1000,
        type: this.getChunkType(file),
        priority: this.getChunkPriority(file)
      }
      
      this.analysis.chunks.push(chunk)
      this.analysis.totalSize += size
    }
    
    // Trier par taille décroissante
    this.analysis.chunks.sort((a, b) => b.size - a.size)
  }

  /**
   * Analyse les assets (images, fonts, etc.)
   */
  async analyzeAssets() {
    const assetExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.woff', '.woff2', '.ttf', '.eot']
    
    for (const ext of assetExtensions) {
      const files = this.getFilesByExtension(ext)
      
      for (const file of files) {
        const filePath = path.join(this.assetsPath, file)
        const stats = fs.statSync(filePath)
        const size = stats.size
        
        const asset = {
          name: file,
          size: size,
          sizeKB: Math.round(size / 1024 * 100) / 100,
          type: 'asset',
          category: this.getAssetCategory(ext)
        }
        
        this.analysis.chunks.push(asset)
        this.analysis.totalSize += size
      }
    }
  }

  /**
   * Récupère les fichiers par extension
   */
  getFilesByExtension(extension) {
    if (!fs.existsSync(this.assetsPath)) return []
    
    return fs.readdirSync(this.assetsPath)
      .filter(file => file.endsWith(extension))
  }

  /**
   * Détermine le type de chunk
   */
  getChunkType(filename) {
    if (filename.includes('vue-core')) return 'Vue Core'
    if (filename.includes('vue-router')) return 'Vue Router'
    if (filename.includes('pinia')) return 'Pinia'
    if (filename.includes('youtube')) return 'YouTube'
    if (filename.includes('ai-components')) return 'Composants IA'
    if (filename.includes('security')) return 'Sécurité'
    if (filename.includes('profile')) return 'Gestion Profils'
    if (filename.includes('database')) return 'Base de Données'
    if (filename.includes('vendor')) return 'Vendor'
    if (filename.includes('chunks')) return 'Chunk Générique'
    return 'Autre'
  }

  /**
   * Détermine la priorité du chunk
   */
  getChunkPriority(filename) {
    if (filename.includes('vue-core') || filename.includes('vue-router') || filename.includes('pinia')) {
      return 'critique'
    }
    if (filename.includes('vendor')) {
      return 'normal'
    }
    return 'normal'
  }

  /**
   * Détermine la catégorie d'asset
   */
  getAssetCategory(extension) {
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(extension)) {
      return 'Image'
    }
    if (['.woff', '.woff2', '.ttf', '.eot'].includes(extension)) {
      return 'Font'
    }
    return 'Autre'
  }

  /**
   * Génère les recommandations d'optimisation
   */
  generateRecommendations() {
    const { chunks, totalSize } = this.analysis
    
    // Recommandations basées sur la taille
    const largeChunks = chunks.filter(chunk => chunk.size > 500 * 1024) // > 500KB
    if (largeChunks.length > 0) {
      this.analysis.recommendations.push({
        type: 'warning',
        message: `${largeChunks.length} chunks volumineux détectés (>500KB)`,
        details: largeChunks.map(chunk => `- ${chunk.name}: ${chunk.sizeKB}KB`),
        action: 'Considérez le lazy loading ou la division en chunks plus petits'
      })
    }

    // Recommandations pour les chunks critiques
    const criticalChunks = chunks.filter(chunk => chunk.priority === 'critique' && chunk.size > 200 * 1024)
    if (criticalChunks.length > 0) {
      this.analysis.recommendations.push({
        type: 'info',
        message: 'Chunks critiques volumineux',
        details: criticalChunks.map(chunk => `- ${chunk.name}: ${chunk.sizeKB}KB`),
        action: 'Optimisez ces chunks pour améliorer le First Contentful Paint'
      })
    }

    // Recommandations pour les images
    const imageAssets = chunks.filter(chunk => chunk.category === 'Image')
    const largeImages = imageAssets.filter(asset => asset.size > 100 * 1024) // > 100KB
    if (largeImages.length > 0) {
      this.analysis.recommendations.push({
        type: 'warning',
        message: `${largeImages.length} images volumineuses détectées`,
        details: largeImages.map(asset => `- ${asset.name}: ${asset.sizeKB}KB`),
        action: 'Compressez les images ou utilisez des formats modernes (WebP, AVIF)'
      })
    }

    // Recommandations générales
    const totalSizeMB = Math.round(totalSize / 1024 / 1024 * 100) / 100
    if (totalSizeMB > 5) {
      this.analysis.recommendations.push({
        type: 'warning',
        message: `Bundle total volumineux: ${totalSizeMB}MB`,
        action: 'Considérez l\'optimisation globale et le tree shaking'
      })
    }

    // Recommandations pour le lazy loading
    const lazyChunks = chunks.filter(chunk => chunk.priority === 'lazy')
    if (lazyChunks.length === 0) {
      this.analysis.recommendations.push({
        type: 'info',
        message: 'Aucun chunk lazy détecté',
        action: 'Implémentez le lazy loading pour les composants lourds'
      })
    }
  }

  /**
   * Affiche le rapport d'analyse
   */
  displayReport() {
    const { chunks, totalSize, recommendations } = this.analysis
    const totalSizeMB = Math.round(totalSize / 1024 / 1024 * 100) / 100

    console.log('📊 RAPPORT D\'ANALYSE DU BUNDLE\n')
    console.log('=' .repeat(50))
    
    // Résumé global
    console.log('\n📈 RÉSUMÉ GLOBAL')
    console.log(`Taille totale: ${totalSizeMB}MB`)
    console.log(`Nombre de chunks: ${chunks.length}`)
    console.log(`Chunks JavaScript: ${chunks.filter(c => c.type !== 'asset').length}`)
    console.log(`Assets: ${chunks.filter(c => c.type === 'asset').length}`)

    // Top 10 des chunks les plus volumineux
    console.log('\n🔝 TOP 10 DES CHUNKS LES PLUS VOLUMINEUX')
    console.log('-'.repeat(50))
    chunks.slice(0, 10).forEach((chunk, index) => {
      const size = chunk.sizeKB > 1024 
        ? `${Math.round(chunk.sizeKB / 1024 * 100) / 100}MB`
        : `${chunk.sizeKB}KB`
      console.log(`${index + 1}. ${chunk.name}`)
      console.log(`   Taille: ${size} | Type: ${chunk.type} | Priorité: ${chunk.priority || 'N/A'}`)
    })

    // Analyse par type
    console.log('\n📋 ANALYSE PAR TYPE')
    console.log('-'.repeat(50))
    const typeStats = {}
    chunks.forEach(chunk => {
      const type = chunk.type
      if (!typeStats[type]) {
        typeStats[type] = { count: 0, size: 0 }
      }
      typeStats[type].count++
      typeStats[type].size += chunk.size
    })

    Object.entries(typeStats).forEach(([type, stats]) => {
      const sizeMB = Math.round(stats.size / 1024 / 1024 * 100) / 100
      console.log(`${type}: ${stats.count} fichiers, ${sizeMB}MB`)
    })

    // Recommandations
    if (recommendations.length > 0) {
      console.log('\n💡 RECOMMANDATIONS')
      console.log('-'.repeat(50))
      recommendations.forEach((rec, index) => {
        const icon = rec.type === 'warning' ? '⚠️' : rec.type === 'error' ? '❌' : 'ℹ️'
        console.log(`${index + 1}. ${icon} ${rec.message}`)
        if (rec.details) {
          rec.details.forEach(detail => console.log(`   ${detail}`))
        }
        console.log(`   Action: ${rec.action}`)
        console.log('')
      })
    }

    // Métriques de performance
    console.log('\n⚡ MÉTRIQUES DE PERFORMANCE')
    console.log('-'.repeat(50))
    const criticalSize = chunks
      .filter(c => c.priority === 'critique')
      .reduce((sum, c) => sum + c.size, 0)
    const criticalSizeKB = Math.round(criticalSize / 1024 * 100) / 100
    
    console.log(`Taille des chunks critiques: ${criticalSizeKB}KB`)
    console.log(`Taille des chunks lazy: ${chunks.filter(c => c.priority === 'lazy').length} chunks`)
    
    // Score de performance
    let score = 100
    if (totalSizeMB > 5) score -= 20
    if (chunks.filter(c => c.size > 500 * 1024).length > 3) score -= 15
    if (chunks.filter(c => c.priority === 'lazy').length === 0) score -= 10
    
    console.log(`\n🎯 Score de performance: ${score}/100`)
    
    if (score >= 90) {
      console.log('✅ Excellent! Votre bundle est bien optimisé.')
    } else if (score >= 70) {
      console.log('⚠️ Bon, mais il y a des améliorations possibles.')
    } else {
      console.log('❌ Des optimisations importantes sont nécessaires.')
    }

    console.log('\n' + '='.repeat(50))
  }
}

// Exécution du script
const analyzer = new BundleAnalyzer()
analyzer.analyze().catch(console.error)
