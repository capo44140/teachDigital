/**
 * Script pour ajouter des timeouts à tous les beforeAll dans les tests
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const testFiles = glob.sync('backend/tests/api/*.test.js');

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  // Remplacer beforeAll(async () => { par beforeAll(async () => {, 30000);
  const beforeAllPattern = /beforeAll\(async \(\) => \{/g;
  if (beforeAllPattern.test(content)) {
    // Vérifier si le timeout n'est pas déjà présent
    if (!content.includes('beforeAll(async () => {', 30000)) {
      content = content.replace(
        /beforeAll\(async \(\) => \{/g,
        'beforeAll(async () => {'
      );
      // Trouver la ligne de fermeture correspondante et ajouter le timeout
      const lines = content.split('\n');
      let newLines = [];
      let inBeforeAll = false;
      let braceCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.includes('beforeAll(async () => {')) {
          inBeforeAll = true;
          braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
          newLines.push(line);
        } else if (inBeforeAll) {
          braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
          newLines.push(line);
          
          if (braceCount === 0 && line.trim().endsWith('}')) {
            // C'est la fin du beforeAll, ajouter le timeout
            newLines[newLines.length - 1] = line.replace('});', '}, 30000);');
            inBeforeAll = false;
            modified = true;
          }
        } else {
          newLines.push(line);
        }
      }
      
      if (modified) {
        content = newLines.join('\n');
      }
    }
  }

  // Alternative: remplacer simplement les patterns connus
  const patterns = [
    {
      from: /beforeAll\(async \(\) => \{[\s\S]*?\n  \}\);?\n\n/g,
      to: (match) => {
        if (!match.includes(', 30000')) {
          return match.replace(/\}\);?\n\n$/, '}, 30000);\n\n');
        }
        return match;
      }
    }
  ];

  // Méthode plus simple: chercher et remplacer les beforeAll sans timeout
  const simplePattern = /(beforeAll\(async \(\) => \{[\s\S]*?\n  \})\);/g;
  if (simplePattern.test(content) && !content.includes('beforeAll(async () => {', 30000)) {
    content = content.replace(
      /(beforeAll\(async \(\) => \{[\s\S]*?\n  \})\);/g,
      '$1}, 30000);'
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✅ Mis à jour: ${file}`);
  } else {
    console.log(`⏭️  Déjà à jour: ${file}`);
  }
});

console.log('✅ Tous les fichiers de test ont été vérifiés');

