# Script de setup Docker Compose pour TeachDigital Backend
# Utilisation: .\docker-setup.ps1 -Type [local|synology]

param(
    [ValidateSet('local', 'synology')]
    [string]$Type = 'local',
    [switch]$Help
)

# Fonction pour afficher l'aide
if ($Help) {
    Write-Host "Usage: .\docker-setup.ps1 [-Type <local|synology>]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Type <local|synology>  Type de configuration (défaut: local)"
    Write-Host "  -Help                   Affiche cette aide"
    exit 0
}

# Configuration
$EnvFile = ".env.docker"

# Fonctions
function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

# Main setup
Write-Header "Setup Docker Compose - TeachDigital Backend"

Write-Info "Mode: $Type"

# 1. Créer le fichier .env.docker
if (-not (Test-Path $EnvFile)) {
    Write-Info "Création du fichier $EnvFile..."
    
    if ($Type -eq 'synology') {
        $content = @'
# ====================================
# Configuration Docker Compose Synology
# ====================================

# Base de Données PostgreSQL
DATABASE_URL=postgresql://teachdigital:change_me_password@host.docker.internal:5432/teachdigital
DB_HOST=host.docker.internal
DB_PORT=5432
DB_USER=teachdigital
DB_PASSWORD=change_me_password
DB_NAME=teachdigital

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# API Keys (Optionnelles)
OPENAI_API_KEY=
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
GROQ_API_KEY=
MISTRAL_API_KEY=

# CORS et Frontend
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGIN=

# Configuration des logs
LOG_ENABLE_FILE=true
LOG_DEBUG=false
LOG_MAX_SIZE=10485760
LOG_MAX_FILES=5

# Port Backend
BACKEND_PORT=3001

# Volumes Docker Synology
LOGS_VOLUME=/volume1/docker/teachdigital/backend/logs
OUTPUT_VOLUME=/volume1/docker/teachdigital/backend/output
TEMP_VOLUME=/volume1/docker/teachdigital/backend/temp
'@
        Set-Content -Path $EnvFile -Value $content -Encoding UTF8
        Write-Success "Fichier $EnvFile créé pour Synology"
        Write-Warning "Éditez $EnvFile et configurez vos paramètres Synology"
    } else {
        $content = @'
# ====================================
# Configuration Docker Compose Local
# ====================================

# Base de Données PostgreSQL
DATABASE_URL=postgresql://teachdigital:change_me_password@host.docker.internal:5432/teachdigital
DB_HOST=host.docker.internal
DB_PORT=5432
DB_USER=teachdigital
DB_PASSWORD=change_me_password
DB_NAME=teachdigital

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# API Keys (Optionnelles)
OPENAI_API_KEY=
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
GROQ_API_KEY=
MISTRAL_API_KEY=

# CORS et Frontend
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGIN=

# Configuration des logs
LOG_ENABLE_FILE=true
LOG_DEBUG=false
LOG_MAX_SIZE=10485760
LOG_MAX_FILES=5

# Port Backend
BACKEND_PORT=3001

# Volumes Docker Local
LOGS_VOLUME=./logs
OUTPUT_VOLUME=./output
TEMP_VOLUME=./temp
'@
        Set-Content -Path $EnvFile -Value $content -Encoding UTF8
        Write-Success "Fichier $EnvFile créé pour développement local"
    }
} else {
    Write-Info "Fichier $EnvFile existe déjà"
}

# 2. Créer les dossiers locaux si mode local
if ($Type -eq 'local') {
    Write-Info "Création des dossiers volumes..."
    New-Item -ItemType Directory -Path "logs" -Force | Out-Null
    New-Item -ItemType Directory -Path "output" -Force | Out-Null
    New-Item -ItemType Directory -Path "temp" -Force | Out-Null
    Write-Success "Dossiers créés: logs\, output\, temp\"
}

# 3. Vérifier Docker
Write-Info "Vérification de Docker..."
try {
    $dockerVersion = docker --version
    Write-Success "Docker trouvé: $dockerVersion"
} catch {
    Write-Error-Custom "Docker n'est pas installé"
    exit 1
}

try {
    $dockerComposeVersion = docker-compose --version
    Write-Success "Docker Compose trouvé: $dockerComposeVersion"
} catch {
    Write-Error-Custom "Docker Compose n'est pas installé"
    exit 1
}

# 4. Build l'image
Write-Header "Build de l'image Docker"
Write-Info "Building teachdigital-backend:latest..."
docker-compose build

Write-Header "Setup Complété ✅"
Write-Host ""
Write-Success "Configuration Docker Compose prête !"
Write-Host ""
Write-Host "Prochaines étapes:" -ForegroundColor Cyan
Write-Host "1. Éditez le fichier: notepad $EnvFile"
Write-Host "2. Configurez vos paramètres (DB_PASSWORD, JWT_SECRET, etc.)"
Write-Host "3. Lancez le conteneur:"
Write-Host ""
Write-Host "   docker-compose up -d" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Vérifiez le statut:"
Write-Host ""
Write-Host "   docker-compose ps" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. Consultez les logs:"
Write-Host ""
Write-Host "   docker-compose logs -f backend" -ForegroundColor Yellow
Write-Host ""
Write-Host "Commandes utiles:" -ForegroundColor Cyan
Write-Host "  docker-compose down                    # Arrêter le conteneur"
Write-Host "  docker-compose logs -f                 # Voir les logs en temps réel"
Write-Host "  docker-compose exec backend sh         # Terminal dans le conteneur"
Write-Host ""

