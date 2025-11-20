# Script pour configurer les permissions Docker sur Synology
# Usage: .\setup-synology-docker.ps1

# Couleurs
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }

# Configuration
$sshAlias = "synology"
$setupScript = "setup-docker-permissions.sh"

Write-Info "=========================================="
Write-Info "Configuration Docker sur Synology"
Write-Info "=========================================="
Write-Info ""

# Vérifier que le script de setup existe
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$localSetupScript = Join-Path $scriptPath $setupScript

if (-not (Test-Path $localSetupScript)) {
    Write-Error "[ERREUR] Script de setup introuvable: $setupScript"
    exit 1
}

# Vérifier la connexion SSH
Write-Info "[1/3] Vérification de la connexion SSH..."
ssh -o ConnectTimeout=5 -o BatchMode=yes $sshAlias "echo OK" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "[ERREUR] Impossible de se connecter via SSH"
    Write-Info "   Vérifiez que l'alias '$sshAlias' est configuré dans ~/.ssh/config"
    exit 1
}
Write-Success "[OK] Connexion SSH établie"
Write-Info ""

# Transférer le script de setup
Write-Info "[2/3] Transfert du script de configuration..."
$remoteScript = "/tmp/setup-docker-permissions.sh"

# Lire le contenu et le transférer en convertissant les line endings
Get-Content $localSetupScript -Raw | ForEach-Object { $_ -replace "`r`n", "`n" } | ssh $sshAlias "cat > $remoteScript && chmod +x $remoteScript" 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Error "[ERREUR] Impossible de transférer le script"
    exit 1
}
Write-Success "[OK] Script transféré"
Write-Info ""

# Exécuter le script de setup
Write-Info "[3/3] Exécution du script de configuration..."
Write-Info ""
Write-Warning "⚠️  Une session SSH interactive va s'ouvrir."
Write-Warning "   Vous devrez entrer votre mot de passe sudo sur le Synology."
Write-Info ""
Write-Info "Appuyez sur Entrée pour continuer..."
Read-Host

# Exécuter le script en mode interactif
ssh -t $sshAlias "bash $remoteScript"
$exitCode = $LASTEXITCODE

Write-Info ""
if ($exitCode -eq 0) {
    Write-Success "=========================================="
    Write-Success "Configuration terminée !"
    Write-Success "=========================================="
    Write-Info ""
    Write-Warning "⚠️  IMPORTANT: Pour que les changements prennent effet :"
    Write-Info "   1. La session SSH actuelle doit être fermée"
    Write-Info "   2. Reconnectez-vous ensuite"
    Write-Info ""
    Write-Info "Pour tester, exécutez :"
    Write-Info "   ssh $sshAlias `"docker ps`""
    Write-Info ""
    Write-Info "Si ça fonctionne, vous pourrez utiliser :"
    Write-Info "   ssh $sshAlias `"/volume1/docker/teachdigital/backend/docker-helper.sh logs`""
    Write-Info "   ssh $sshAlias `"/volume1/docker/teachdigital/backend/docker-helper.sh status`""
}
else {
    Write-Error "=========================================="
    Write-Error "Configuration échouée"
    Write-Error "=========================================="
    Write-Info ""
    Write-Info "Vérifiez que :"
    Write-Info "  - Vous avez les droits sudo sur le Synology"
    Write-Info "  - Container Manager est installé"
    Write-Info ""
    Write-Info "Vous pouvez aussi essayer manuellement :"
    Write-Info "   ssh $sshAlias"
    Write-Info "   sudo synogroup --member docker `$USER"
    Write-Info "   exit"
    Write-Info "   ssh $sshAlias"
    Write-Info "   docker ps"
}
