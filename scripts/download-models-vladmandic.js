import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Modèles pour @vladmandic/face-api
const models = [
  {
    name: 'tiny_face_detector_model',
    files: [
      'tiny_face_detector_model-weights_manifest.json',
      'tiny_face_detector_model-shard1'
    ]
  },
  {
    name: 'face_landmark_68_model',
    files: [
      'face_landmark_68_model-weights_manifest.json',
      'face_landmark_68_model-shard1'
    ]
  },
  {
    name: 'face_recognition_model',
    files: [
      'face_recognition_model-weights_manifest.json',
      'face_recognition_model-shard1',
      'face_recognition_model-shard2'
    ]
  },
  {
    name: 'face_expression_model',
    files: [
      'face_expression_model-weights_manifest.json',
      'face_expression_model-shard1'
    ]
  },
  {
    name: 'age_gender_model',
    files: [
      'age_gender_model-weights_manifest.json',
      'age_gender_model-shard1'
    ]
  }
]

const modelsDir = path.join(__dirname, '..', 'public', 'models')
const baseUrl = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model'

async function downloadFile(url, filepath) {
  try {
    console.log(`📥 Téléchargement de ${path.basename(filepath)}...`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    fs.writeFileSync(filepath, buffer)
    console.log(`✅ Téléchargé: ${path.basename(filepath)} (${buffer.length} bytes)`)
    return true
  } catch (error) {
    console.error(`❌ Erreur lors du téléchargement de ${url}:`, error.message)
    return false
  }
}

async function downloadModels() {
  console.log('🚀 Téléchargement des modèles @vladmandic/face-api...')
  
  // Créer le répertoire models s'il n'existe pas
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true })
  }
  
  let successCount = 0
  let totalFiles = 0
  
  for (const model of models) {
    console.log(`\n📦 Téléchargement du modèle: ${model.name}`)
    
    for (const file of model.files) {
      totalFiles++
      const url = `${baseUrl}/${file}`
      const filepath = path.join(modelsDir, file)
      
      // Vérifier si le fichier existe déjà
      if (fs.existsSync(filepath)) {
        console.log(`⏭️  Fichier déjà présent: ${file}`)
        successCount++
        continue
      }
      
      const success = await downloadFile(url, filepath)
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
    console.log('⚠️  Certains fichiers n\'ont pas pu être téléchargés.')
  }
}

// Exécuter le téléchargement
downloadModels().catch(console.error)
