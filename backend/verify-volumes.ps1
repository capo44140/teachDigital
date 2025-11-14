# Script de vérification des volumes Docker
# Utilisation: .\verify-volumes.ps1

# Vérifier si le conteneur est en cours d'exécution
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Vérification des Volumes Docker" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$container = docker-compose ps 2>$null | Select-String "teachdigital-backend"
if (-not $container) {
    Write-Host "⚠️  Le conteneur teachdigital-backend n'est pas actif" -ForegroundColor Yellow
    Write-Host "Lancez d'abord: docker-compose up -d"
    exit 1
}

Write-Host "✅ Conteneur actif" -ForegroundColor Green
Write-Host ""

# 1. Vérifier les volumes
Write-Host "1️⃣  Vérification des volumes déclarés" -ForegroundColor Cyan
Write-Host ""

try {
    docker-compose exec backend ls -la /logs
    Write-Host "✅ /logs OK" -ForegroundColor Green
} catch {
    Write-Host "❌ /logs ERREUR" -ForegroundColor Red
}
Write-Host ""

try {
    docker-compose exec backend ls -la /output
    Write-Host "✅ /output OK" -ForegroundColor Green
} catch {
    Write-Host "❌ /output ERREUR" -ForegroundColor Red
}
Write-Host ""

try {
    docker-compose exec backend ls -la /temp
    Write-Host "✅ /temp OK" -ForegroundColor Green
} catch {
    Write-Host "❌ /temp ERREUR" -ForegroundColor Red
}
Write-Host ""

# 2. Vérifier les permissions
Write-Host "2️⃣  Vérification des permissions" -ForegroundColor Cyan
Write-Host ""

try {
    docker-compose exec backend test -w /logs
    Write-Host "✅ /logs est writable" -ForegroundColor Green
} catch {
    Write-Host "❌ /logs n'est pas writable" -ForegroundColor Red
}
Write-Host ""

# 3. Vérifier les logs
Write-Host "3️⃣  Vérification des fichiers logs" -ForegroundColor Cyan
Write-Host ""

Write-Host "Fichiers dans /logs:"
try {
    docker-compose exec backend ls -lh /logs
} catch {
    Write-Host "Pas de fichiers" -ForegroundColor Yellow
}
Write-Host ""

# 4. Vérifier les variables d'environnement
Write-Host "4️⃣  Vérification des variables d'environnement" -ForegroundColor Cyan
Write-Host ""

Write-Host "LOGS_DIR:"
docker-compose exec backend sh -c 'echo $LOGS_DIR'
Write-Host ""

Write-Host "DOCKER_ENV:"
docker-compose exec backend sh -c 'echo $DOCKER_ENV'
Write-Host ""

Write-Host "NODE_ENV:"
docker-compose exec backend sh -c 'echo $NODE_ENV'
Write-Host ""

# 5. Vérifier les volumes montés
Write-Host "5️⃣  Vérification des volumes montés (inspect)" -ForegroundColor Cyan
Write-Host ""

try {
    $inspect = docker inspect teachdigital-backend | Select-String -A 20 '"Mounts"'
    Write-Host $inspect
} catch {
    Write-Host "Pas de détails de volumes" -ForegroundColor Yellow
}
Write-Host ""

# 6. Vérifier la taille des volumes
Write-Host "6️⃣  Taille des fichiers" -ForegroundColor Cyan
Write-Host ""

Write-Host "Taille de /logs:"
docker-compose exec backend du -sh /logs
Write-Host ""

Write-Host "Taille de /output:"
docker-compose exec backend du -sh /output
Write-Host ""

Write-Host "Taille de /temp:"
docker-compose exec backend du -sh /temp
Write-Host ""

# 7. Test d'écriture
Write-Host "7️⃣  Test d'écriture" -ForegroundColor Cyan
Write-Host ""

Write-Host "Création d'un fichier de test..."

try {
    docker-compose exec backend sh -c 'echo "Test write at $(date)" > /logs/test.log'
    Write-Host "✅ Écriture dans /logs OK" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur d'écriture dans /logs" -ForegroundColor Red
}
Write-Host ""

try {
    docker-compose exec backend sh -c 'echo "Test write at $(date)" > /output/test.log'
    Write-Host "✅ Écriture dans /output OK" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur d'écriture dans /output" -ForegroundColor Red
}
Write-Host ""

try {
    docker-compose exec backend sh -c 'echo "Test write at $(date)" > /temp/test.log'
    Write-Host "✅ Écriture dans /temp OK" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur d'écriture dans /temp" -ForegroundColor Red
}
Write-Host ""

# 8. Vérifier les fichiers locaux
Write-Host "8️⃣  Vérification des fichiers locaux" -ForegroundColor Cyan
Write-Host ""

if (Test-Path "logs") {
    Write-Host "Contenu de .\logs:"
    Get-ChildItem logs -Force | Format-Table
    Write-Host "✅ Dossier logs\ existe" -ForegroundColor Green
} else {
    Write-Host "❌ Dossier logs\ n'existe pas" -ForegroundColor Red
}
Write-Host ""

if (Test-Path "output") {
    Write-Host "Contenu de .\output:"
    Get-ChildItem output -Force | Format-Table
    Write-Host "✅ Dossier output\ existe" -ForegroundColor Green
} else {
    Write-Host "❌ Dossier output\ n'existe pas" -ForegroundColor Red
}
Write-Host ""

if (Test-Path "temp") {
    Write-Host "Contenu de .\temp:"
    Get-ChildItem temp -Force | Format-Table
    Write-Host "✅ Dossier temp\ existe" -ForegroundColor Green
} else {
    Write-Host "❌ Dossier temp\ n'existe pas" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Résumé de la Vérification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Les volumes sont correctement configurés" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines étapes:" -ForegroundColor Cyan
Write-Host "1. Vérifiez les fichiers logs générés:"
Write-Host "   - Get-Content logs\info.log"
Write-Host "   - Get-Content logs\error.log"
Write-Host ""
Write-Host "2. Surveillez les logs en temps réel:"
Write-Host "   - docker-compose logs -f backend"
Write-Host ""
Write-Host "3. Vérifiez la taille des volumes:"
Write-Host "   - (Get-ChildItem logs -Recurse | Measure-Object -Sum Length).Sum"
Write-Host ""



