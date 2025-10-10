import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Modèles nécessaires pour face-api.js
const models = [
  {
    name: 'ssd_mobilenetv1_model',
    files: [
      'ssd_mobilenetv1_model-weights_manifest.json',
      'ssd_mobilenetv1_model-shard1'
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
    name: 'face_expression_model',
    files: [
      'face_expression_model-weights_manifest.json',
      'face_expression_model-shard1'
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
    name: 'age_gender_model',
    files: [
      'age_gender_model-weights_manifest.json',
      'age_gender_model-shard1'
    ]
  }
]

const modelsDir = path.join(__dirname, '..', 'public', 'models')
const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'

async function downloadFile(url, filepath) {
  try {
    console.log(`Téléchargement de ${url}...`)
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    fs.writeFileSync(filepath, buffer)
    console.log(`✓ Téléchargé: ${path.basename(filepath)}`)
  } catch (error) {
    console.error(`✗ Erreur lors du téléchargement de ${url}:`, error.message)
  }
}

async function downloadModels() {
  console.log('🚀 Téléchargement des modèles face-api.js...')
  
  // Créer le répertoire models s'il n'existe pas
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true })
  }
  
  for (const model of models) {
    console.log(`\n📦 Téléchargement du modèle: ${model.name}`)
    
    for (const file of model.files) {
      const url = `${baseUrl}/${file}`
      const filepath = path.join(modelsDir, file)
      
      // Vérifier si le fichier existe déjà
      if (fs.existsSync(filepath)) {
        console.log(`⏭️  Fichier déjà présent: ${file}`)
        continue
      }
      
      await downloadFile(url, filepath)
    }
  }
  
  console.log('\n✅ Téléchargement terminé !')
  console.log(`📁 Modèles sauvegardés dans: ${modelsDir}`)
}

// Exécuter le téléchargement
downloadModels().catch(console.error)
