import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputFile = 'public/icon.svg';
const outputDir = 'public/icons';

// Créer le répertoire de sortie s'il n'existe pas
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('🎨 Génération des icônes PWA...');
  
  try {
    for (const size of sizes) {
      const outputFile = path.join(outputDir, `icon-${size}x${size}.png`);
      
      await sharp(inputFile)
        .resize(size, size, {
          kernel: sharp.kernel.lanczos3,
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({
          quality: 100,
          compressionLevel: 9
        })
        .toFile(outputFile);
      
      console.log(`✅ Généré: ${outputFile}`);
    }
    
    // Générer aussi le favicon.ico
    await sharp(inputFile)
      .resize(32, 32)
      .png()
      .toFile('public/favicon-32x32.png');
    
    await sharp(inputFile)
      .resize(16, 16)
      .png()
      .toFile('public/favicon-16x16.png');
    
    console.log('✅ Généré: favicon-32x32.png');
    console.log('✅ Généré: favicon-16x16.png');
    
    console.log('🎉 Toutes les icônes ont été générées avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération des icônes:', error);
    process.exit(1);
  }
}

generateIcons();
