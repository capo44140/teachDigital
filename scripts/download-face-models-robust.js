import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Modèles nécessaires pour face-api.js avec leurs tailles attendues
const models = [
  {
    name: 'ssd_mobilenetv1_model',
    files: [
      { name: 'ssd_mobilenetv1_model-weights_manifest.json', size: 1000 },
      { name: 'ssd_mobilenetv1_model-shard1', size: 4000000 }
    ]
  },
  {
    name: 'face_landmark_68_model',
    files: [
      { name: 'face_landmark_68_model-weights_manifest.json', size: 1000 },
      { name: 'face_landmark_68_model-shard1', size: 2000000 }
    ]
  },
  {
    name: 'face_expression_model',
    files: [
      { name: 'face_expression_model-weights_manifest.json', size: 1000 },
      { name: 'face_expression_model-shard1', size: 1000000 }
    ]
  },
  {
    name: 'face_recognition_model',
    files: [
      { name: 'face_recognition_model-weights_manifest.json', size: 1000 },
      { name: 'face_recognition_model-shard1', size: 5000000 },
      { name: 'face_recognition_model-shard2', size: 5000000 }
    ]
  },
  {
    name: 'age_gender_model',
    files: [
      { name: 'age_gender_model-weights_manifest.json', size: 1000 },
      { name: 'age_gender_model-shard1', size: 1000000 }
    ]
  }
]

const modelsDir = path.join(__dirname, '..', 'public', 'models')
const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'

async function downloadFileWithRetry(url, filepath, expectedSize, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📥 Tentative ${attempt}/${maxRetries} - Téléchargement de ${path.basename(filepath)}...`)
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // Vérifier la taille du fichier
      if (expectedSize && buffer.length < expectedSize * 0.5) {
        throw new Error(`Fichier trop petit: ${buffer.length} bytes (attendu: ~${expectedSize} bytes)`)
      }
      
      fs.writeFileSync(filepath, buffer)
      console.log(`✅ Téléchargé: ${path.basename(filepath)} (${buffer.length} bytes)`)
      return true
      
    } catch (error) {
      console.error(`❌ Tentative ${attempt} échouée:`, error.message)
      
      if (attempt === maxRetries) {
        console.error(`💥 Échec définitif pour ${path.basename(filepath)}`)
        return false
      }
      
      // Attendre avant de réessayer
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
    }
  }
  return false
}

async function downloadModels() {
  console.log('🚀 Téléchargement robuste des modèles face-api.js...')
  
  // Créer le répertoire models s'il n'existe pas
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true })
    console.log('📁 Répertoire models créé')
  }
  
  let successCount = 0
  let totalFiles = 0
  
  for (const model of models) {
    console.log(`\n📦 Téléchargement du modèle: ${model.name}`)
    
    for (const file of model.files) {
      totalFiles++
      const url = `${baseUrl}/${file.name}`
      const filepath = path.join(modelsDir, file.name)
      
      // Vérifier si le fichier existe déjà et a la bonne taille
      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath)
        if (stats.size > file.size * 0.5) {
          console.log(`⏭️  Fichier déjà présent: ${file.name} (${stats.size} bytes)`)
          successCount++
          continue
        } else {
          console.log(`🔄 Fichier corrompu détecté, re-téléchargement: ${file.name}`)
          fs.unlinkSync(filepath)
        }
      }
      
      const success = await downloadFileWithRetry(url, filepath, file.size)
      if (success) {
        successCount++
      }
    }
  }
  
  console.log(`\n📊 Résumé: ${successCount}/${totalFiles} fichiers téléchargés avec succès`)
  
  if (successCount === totalFiles) {
    console.log('✅ Tous les modèles ont été téléchargés avec succès !')
    console.log(`📁 Modèles sauvegardés dans: ${modelsDir}`)
  } else {
    console.log('⚠️  Certains fichiers n\'ont pas pu être téléchargés. Vérifiez votre connexion internet.')
  }
}

// Exécuter le téléchargement
downloadModels().catch(console.error)
