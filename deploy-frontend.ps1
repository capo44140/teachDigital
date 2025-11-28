# Script de deploiement simple sur Synology pour le Frontend (Build Local)
# Usage: .\deploy-frontend.ps1

param(
    [string]$DeployPath = "/volume1/docker/teachdigital/frontend"
)

# Couleurs
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }

# Configuration
$sshAlias = "synology"
$defaultDeployPath = "/volume1/docker/teachdigital/frontend"

# Se positionner dans le dossier racine du projet
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Charger le chemin de deploiement
if (-not $DeployPath) {
    $configFile = ".synology-deploy-frontend.json"
    if (Test-Path $configFile) {
        $config = Get-Content $configFile | ConvertFrom-Json
        $DeployPath = $config.deployPath.Trim()
    }
    else {
        $DeployPath = $defaultDeployPath
    }
}

if (-not $DeployPath) {
    Write-Error "[ERREUR] Chemin de deploiement manquant"
    exit 1
}

Write-Info "=========================================="
Write-Info "Deploiement Frontend sur Synology"
Write-Info "=========================================="
Write-Info "Alias SSH: $sshAlias"
Write-Info "Destination: $DeployPath"
Write-Info ""

# 0. Build Local
Write-Info "[1/5] Build Local..."
Write-Info "   Execution de pnpm run build..."
pnpm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "[ERREUR] Le build a echoue"
    exit 1
}
Write-Success "[OK] Build termine"
Write-Info ""

# 1. Verifier la connexion SSH
Write-Info "[2/5] Verification SSH..."
ssh -o ConnectTimeout=5 -o BatchMode=yes $sshAlias "echo OK" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "[ERREUR] Impossible de se connecter via SSH"
    Write-Info "   Verifiez que l'alias '$sshAlias' est configure dans ~/.ssh/config"
    exit 1
}
Write-Success "[OK] Connexion SSH OK"
Write-Info ""

# 2. Verifier tar
Write-Info "[3/5] Verification de tar..."
tar --version 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "[ERREUR] tar n'est pas disponible"
    Write-Info "   Installez Git for Windows ou WSL"
    exit 1
}
Write-Success "[OK] tar disponible"
Write-Info ""

# 3. Transfert des fichiers
Write-Info "[4/5] Transfert des fichiers..."

# Creer le repertoire de destination
ssh $sshAlias "mkdir -p $DeployPath" 2>&1 | Out-Null

# Creer les dossiers de volumes (si necessaire pour le frontend, ex: logs nginx)
Write-Info "   Preparation des dossiers..."
ssh $sshAlias "mkdir -p $DeployPath/logs && chmod 777 $DeployPath/logs" 2>&1 | Out-Null

# Nettoyer le dossier dist distant avant transfert pour eviter les vieux fichiers
Write-Info "   Nettoyage du dossier dist distant..."
ssh $sshAlias "rm -rf $DeployPath/dist" 2>&1 | Out-Null

Write-Info "   Compression et envoi en cours..."

# Transferer via tar en streaming
$bashPath = "C:\Program Files\Git\bin\bash.exe"
$tarOutput = ""

# Liste des fichiers a inclure: dist, nginx-frontend.conf, Dockerfile.frontend.prebuilt, docker-compose.frontend.yml
$filesToTransfer = "dist nginx-frontend.conf Dockerfile.frontend.prebuilt docker-compose.frontend.yml"

if (Test-Path $bashPath) {
    # Utiliser Git Bash pour gerer correctement les pipes
    $bashCmd = "tar -czf - $filesToTransfer 2>/dev/null | ssh $sshAlias 'mkdir -p $DeployPath && cd $DeployPath && tar -xzf - 2>&1'"
    Write-Info "   Execution via Git Bash..."
    Write-Info "   Transfert en cours (cela peut prendre quelques instants)..."
    $tarOutput = & $bashPath -c $bashCmd 2>&1
    $tarExitCode = $LASTEXITCODE

    # Afficher un resume si disponible
    if ($tarOutput) {
        $tarOutput | Select-Object -First 10 | ForEach-Object {
            if ($_ -match "(extracting|creating|package\.json|docker)") {
                Write-Info "   $_"
            }
        }
    }
}
else {
    # Essayer directement
    Write-Warning "   Git Bash non trouve, tentative directe..."
    
    $tarOutput = tar -czf - $filesToTransfer 2>&1 | ssh $sshAlias "cd $DeployPath && tar -xzf -" 2>&1
    $tarExitCode = $LASTEXITCODE
}

if ($tarExitCode -eq 0) {
    Write-Success "[OK] Fichiers transferes"
    $transferSuccess = $true
}
else {
    Write-Error "[ERREUR] Echec du transfert avec tar (code: $tarExitCode)"
    if ($tarOutput) {
        Write-Info "   Details de l'erreur:"
        $tarOutput | ForEach-Object { Write-Info "   $_" }
    }
    exit 1
}

# Renommer les fichiers sur le serveur
if ($transferSuccess) {
    Write-Info "   Configuration des fichiers Docker..."
    ssh $sshAlias "mv $DeployPath/docker-compose.frontend.yml $DeployPath/docker-compose.yml" 2>&1 | Out-Null
    ssh $sshAlias "mv $DeployPath/Dockerfile.frontend.prebuilt $DeployPath/Dockerfile" 2>&1 | Out-Null
}

Write-Info ""

# 4. Gestion Docker/Container Manager
Write-Info "[5/5] Gestion Docker/Container Manager..."

# Verifier si Docker/Container Manager est disponible
$dockerCmd = ""
$dockerFound = $false
$dockerPaths = @("docker", "/usr/local/bin/docker", "/var/packages/ContainerManager/target/usr/bin/docker")
foreach ($dockerPath in $dockerPaths) {
    ssh $sshAlias "$dockerPath --version" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $dockerCmd = $dockerPath
        $dockerFound = $true
        break
    }
}

if (-not $dockerFound) {
    Write-Error "[ERREUR] Docker/Container Manager n'est pas installe sur le Synology"
    exit 1
}

# Verifier docker-compose
$dockerComposeCmd = ""
$composeFound = $false

ssh $sshAlias "$dockerCmd compose version" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    $dockerComposeCmd = "$dockerCmd compose"
    $composeFound = $true
}
else {
    $composePaths = @("docker-compose", "/usr/local/bin/docker-compose", "/var/packages/ContainerManager/target/usr/bin/docker-compose")
    foreach ($composePath in $composePaths) {
        ssh $sshAlias "$composePath --version" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $dockerComposeCmd = $composePath
            $composeFound = $true
            break
        }
    }
}

if (-not $composeFound) {
    Write-Error "[ERREUR] docker-compose n'est pas disponible"
    exit 1
}

# Script de deploiement Docker
$dockerPath = $DeployPath
$dockerScript = @"
cd "$dockerPath"
echo '[DOCKER] Reconstruction et redemarrage du frontend...'
if [ -f docker-compose.yml ]; then
    $dockerComposeCmd down
    echo '[BUILD] Reconstruction de l image...'
    $dockerComposeCmd build --no-cache
    echo '[START] Demarrage du conteneur...'
    $dockerComposeCmd up -d
    echo '[OK] Conteneur demarre'
    echo '[STATUS] Etat des conteneurs:'
    $dockerComposeCmd ps
    echo '[HEALTH] Verification de la sante...'
    # Retry avec backoff exponentiel (max 5 tentatives)
    max_retries=5
    retry=0
    while [ `$retry -lt `$max_retries ]; do
        sleep `$((2 ** retry))
        if wget --quiet --tries=1 --spider http://localhost:3000 > /dev/null 2>&1; then
            echo '[OK] Service repond correctement (tentative '`$((retry + 1))')'
            break
        else
            retry=`$((retry + 1))
            if [ `$retry -lt `$max_retries ]; then
                echo '[RETRY] Tentative '`$retry'/'`$max_retries' - nouvelle tentative dans '`$((2 ** retry))'s...'
            else
                echo '[WARNING] Service ne repond pas apres '`$max_retries' tentatives'
            fi
        fi
    done
else
    echo '[ERREUR] docker-compose.yml introuvable dans $dockerPath'
    exit 1
fi
"@

# Convertir les line endings Windows en Unix
$dockerScriptUnix = $dockerScript -replace "`r`n", "`n"

# Creer un fichier temporaire local
$tempScript = [System.IO.Path]::GetTempFileName()
$tempScriptSh = "$tempScript.sh"
[System.IO.File]::WriteAllText($tempScriptSh, $dockerScriptUnix, [System.Text.Encoding]::UTF8)

# Transferer le script sur le serveur et l'executer
Write-Info "   Execution du script Docker via SSH..."
$remoteScript = "/tmp/deploy-frontend-$([System.Guid]::NewGuid().ToString('N').Substring(0,8)).sh"

# Copier le script sur le serveur
$dockerScriptUnix | ssh $sshAlias "tr -d '\r' > $remoteScript" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "[ERREUR] Impossible de transferer le script Docker via SSH"
    Remove-Item $tempScript, $tempScriptSh -ErrorAction SilentlyContinue
    exit 1
}

# Executer le script distant
$result = ssh $sshAlias "chmod +x $remoteScript && bash $remoteScript 2>&1 && rm -f $remoteScript"
$dockerExitCode = $LASTEXITCODE

# Nettoyer le fichier temporaire local
Remove-Item $tempScript, $tempScriptSh -ErrorAction SilentlyContinue

if ($dockerExitCode -eq 0) {
    Write-Success "[OK] Docker gere avec succes"
    if ($result) {
        $result | ForEach-Object {
            if ($_ -match "(\[OK\]|\[START\]|\[BUILD\]|demarres|repond)") {
                Write-Success "   $_"
            }
            elseif ($_ -match "(\[ERREUR\]|\[WARNING\])") {
                Write-Warning "   $_"
            }
            elseif ($_ -match "\[") {
                Write-Info "   $_"
            }
        }
    }
}
else {
    Write-Error "[ERREUR] Echec de la gestion Docker"
    if ($result) {
        Write-Info "   Details:"
        $result | ForEach-Object { Write-Info "   $_" }
    }
    exit 1
}

Write-Info ""
Write-Success "=========================================="
Write-Success "Deploiement Frontend termine avec succes!"
Write-Success "=========================================="
