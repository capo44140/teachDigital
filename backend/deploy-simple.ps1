# Script de deploiement simple sur Synology
# Usage: .\deploy-simple.ps1

param(
    [string]$DeployPath = ""
)

# Couleurs
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }

# Configuration
$sshAlias = "synology"

# Se positionner dans le dossier backend
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$scriptDir = Split-Path -Leaf $scriptPath
if ($scriptDir -eq "backend") {
    Set-Location $scriptPath
}
else {
    Set-Location (Join-Path $scriptPath "backend")
}

# Charger le chemin de deploiement
if (-not $DeployPath) {
    $configFile = ".synology-deploy.json"
    if (Test-Path $configFile) {
        $config = Get-Content $configFile | ConvertFrom-Json
        $DeployPath = $config.deployPath.Trim()
    }
    else {
        $DeployPath = (Read-Host "Chemin de deploiement (ex: /volume1/docker/teachdigital/backend)").Trim()
    }
}

if (-not $DeployPath) {
    Write-Error "[ERREUR] Chemin de deploiement manquant"
    exit 1
}

Write-Info "=========================================="
Write-Info "Deploiement sur Synology"
Write-Info "=========================================="
Write-Info "Alias SSH: $sshAlias"
Write-Info "Destination: $DeployPath"
Write-Info ""

# 1. Verifier la connexion SSH
Write-Info "[1/4] Verification SSH..."
ssh -o ConnectTimeout=5 -o BatchMode=yes $sshAlias "echo OK" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "[ERREUR] Impossible de se connecter via SSH"
    Write-Info "   Verifiez que l'alias '$sshAlias' est configure dans ~/.ssh/config"
    exit 1
}
Write-Success "[OK] Connexion SSH OK"
Write-Info ""

# 2. Verifier tar
Write-Info "[2/4] Verification de tar..."
tar --version 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "[ERREUR] tar n'est pas disponible"
    Write-Info "   Installez Git for Windows ou WSL"
    exit 1
}
Write-Success "[OK] tar disponible"
Write-Info ""

# 3. Transfert des fichiers
Write-Info "[3/4] Transfert des fichiers..."
Write-Info "   Compression et envoi en cours..."

# Creer le repertoire de destination
ssh $sshAlias "mkdir -p $DeployPath" 2>&1 | Out-Null

# Lister les fichiers qui seront transferes (pour debug)
Write-Info "   Verification des fichiers a transferer..."
$fileCount = (Get-ChildItem -Path . -Recurse -File | Where-Object { 
        $_.FullName -notmatch '\\node_modules\\' -and 
        $_.FullName -notmatch '\\.git\\' -and 
        $_.Name -notmatch '\.log$' -and 
        $_.Name -ne '.env' -and 
        $_.Name -ne '.synology-deploy.json' -and
        $_.FullName -notmatch '\\dist\\' -and
        $_.FullName -notmatch '\\.vscode\\' -and
        $_.FullName -notmatch '\\.idea\\' -and
        $_.FullName -notmatch '\\.cursor\\'
    }).Count
Write-Info "   Nombre de fichiers a transferer: $fileCount"

# Transferer via tar en streaming
# Utiliser bash si disponible (Git Bash), sinon essayer directement
$bashPath = "C:\Program Files\Git\bin\bash.exe"
$tarOutput = ""

if (Test-Path $bashPath) {
    # Utiliser Git Bash pour gerer correctement les pipes
    # Note: Les exclusions doivent etre sans guillemets dans la commande bash
    # Utiliser --verbose pour voir ce qui est transfere
    # Commande tar avec extraction dans le bon repertoire
    # Important: utiliser -C pour changer de repertoire avant extraction
    $bashCmd = "tar -czf - --exclude=node_modules --exclude=.git --exclude='*.log' --exclude=.env --exclude=.synology-deploy.json --exclude=dist --exclude=.vscode --exclude=.idea --exclude=.cursor . 2>/dev/null | ssh $sshAlias 'mkdir -p $DeployPath && cd $DeployPath && tar -xzf - 2>&1'"
    Write-Info "   Execution via Git Bash..."
    Write-Info "   Transfert en cours (cela peut prendre quelques instants)..."
    $tarOutput = & $bashPath -c $bashCmd 2>&1
    $tarExitCode = $LASTEXITCODE
    
    # Afficher un resume si disponible
    if ($tarOutput) {
        $tarOutput | Select-Object -First 10 | ForEach-Object {
            if ($_ -match "(extracting|creating|server\.js|package\.json|docker)") {
                Write-Info "   $_"
            }
        }
    }
}
else {
    # Essayer directement (peut ne pas fonctionner avec les pipes PowerShell)
    Write-Warning "   Git Bash non trouve, tentative directe..."
    Write-Info "   Note: Les pipes peuvent ne pas fonctionner correctement dans PowerShell"
    Write-Info "   Installez Git for Windows pour une meilleure compatibilite"
    
    # Essayer avec tar directement
    $tarOutput = tar -czf - --exclude=node_modules --exclude=.git --exclude='*.log' --exclude=.env --exclude=.synology-deploy.json --exclude=dist --exclude=.vscode --exclude=.idea --exclude=.cursor . 2>&1 | ssh $sshAlias "cd $DeployPath && tar -xzf -" 2>&1
    $tarExitCode = $LASTEXITCODE
}

# Afficher les erreurs si presentes
if ($tarOutput) {
    $tarOutput | ForEach-Object {
        if ($_ -match "(error|Error|ERROR|failed|Failed|warning|Warning)") {
            Write-Warning "   $_"
        }
    }
}

if ($tarExitCode -eq 0) {
    Write-Success "[OK] Fichiers transferes"
    
    # Verifier que les fichiers ont bien ete copies
    Write-Info "   Verification des fichiers copies..."
    $remoteFileCount = ssh $sshAlias "find $DeployPath -type f 2>/dev/null | wc -l" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Info "   Fichiers sur le serveur: $remoteFileCount"
        if ([int]$remoteFileCount -lt 10) {
            Write-Warning "   [!] Peu de fichiers detectes ($remoteFileCount), verifiez le transfert"
            Write-Info "   Liste des fichiers sur le serveur:"
            $remoteFiles = ssh $sshAlias "find $DeployPath -type f 2>/dev/null | head -20" 2>&1
            if ($LASTEXITCODE -eq 0) {
                $remoteFiles | ForEach-Object { Write-Info "     $_" }
            }
        }
        else {
            Write-Success "   [OK] $remoteFileCount fichiers transferes"
        }
    }
}
else {
    Write-Error "[ERREUR] Echec du transfert avec tar (code: $tarExitCode)"
    if ($tarOutput) {
        Write-Info "   Details de l'erreur:"
        $tarOutput | ForEach-Object { Write-Info "   $_" }
    }
    Write-Info ""
    Write-Info "   Tentative avec scp en fallback..."
    
    # Utiliser scp comme alternative
    Write-Info "   Copie avec scp (cela peut prendre plus de temps)..."
    $scpSource = "."
    $scpDest = "${sshAlias}:$DeployPath"
    
    scp -r $scpSource $scpDest 2>&1 | ForEach-Object {
        if ($_ -match "(error|Error|ERROR|failed|Failed)") {
            Write-Warning "   $_"
        }
    }
    $scpExitCode = $LASTEXITCODE
    
    if ($scpExitCode -eq 0) {
        Write-Success "[OK] Fichiers transferes via scp"
    }
    else {
        Write-Error "[ERREUR] Echec du transfert avec scp aussi (code: $scpExitCode)"
        Write-Info "   Verifiez votre connexion SSH et les permissions"
        Write-Info "   Astuce: Installez Git for Windows pour une meilleure compatibilite avec tar"
        exit 1
    }
}
Write-Info ""

# 4. Gestion Docker/Container Manager
Write-Info "[4/4] Gestion Docker/Container Manager..."

# Verifier si Docker/Container Manager est disponible
Write-Info "   Verification de Docker/Container Manager..."
$dockerCmd = ""
$dockerFound = $false

# Essayer plusieurs chemins possibles pour Container Manager
$dockerPaths = @("docker", "/usr/local/bin/docker", "/var/packages/ContainerManager/target/usr/bin/docker")
foreach ($dockerPath in $dockerPaths) {
    ssh $sshAlias "$dockerPath --version" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $dockerCmd = $dockerPath
        $dockerFound = $true
        if ($dockerPath -eq "docker") {
            Write-Success "   [OK] Docker/Container Manager disponible"
        }
        else {
            Write-Success "   [OK] Container Manager disponible ($dockerPath)"
        }
        break
    }
}

if (-not $dockerFound) {
    Write-Error "[ERREUR] Docker/Container Manager n'est pas installe sur le Synology"
    Write-Info "   Installez Container Manager via le Package Center"
    exit 1
}

# Verifier docker-compose (peut etre 'docker compose' ou 'docker-compose')
Write-Info "   Verification de docker-compose..."
$dockerComposeCmd = ""
$composeFound = $false

# Essayer avec la commande docker detectee
# Nouvelle syntaxe: docker compose
ssh $sshAlias "$dockerCmd compose version" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    $dockerComposeCmd = "$dockerCmd compose"
    $composeFound = $true
    Write-Success "   [OK] docker compose disponible"
}
else {
    # Ancienne syntaxe: docker-compose
    # Essayer plusieurs chemins possibles
    $composePaths = @("docker-compose", "/usr/local/bin/docker-compose", "/var/packages/ContainerManager/target/usr/bin/docker-compose")
    foreach ($composePath in $composePaths) {
        ssh $sshAlias "$composePath --version" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $dockerComposeCmd = $composePath
            $composeFound = $true
            Write-Success "   [OK] docker-compose disponible"
            break
        }
    }
}

if (-not $composeFound) {
    Write-Error "[ERREUR] docker-compose n'est pas disponible"
    Write-Info "   Container Manager inclut docker-compose, verifiez votre installation"
    Write-Info "   Essayez: ssh $sshAlias '$dockerCmd compose version'"
    exit 1
}

# Le docker-compose.yml est dans le repertoire de deploiement (backend)
$dockerPath = $DeployPath

# Verifier que docker-compose.yml existe
Write-Info "   Verification de docker-compose.yml..."
ssh $sshAlias "test -f $dockerPath/docker-compose.yml" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Warning "   [!] docker-compose.yml non trouve dans $dockerPath"
    Write-Info "   Le script va continuer mais Docker ne sera pas gere"
    Write-Info "   Assurez-vous que docker-compose.yml existe dans $dockerPath"
}
else {
    Write-Success "   [OK] docker-compose.yml trouve dans $dockerPath"
    
    # Script de deploiement Docker
    # Construire le script bash - attention aux line endings Windows
    $dockerScript = @"
cd "$dockerPath"
echo '[DOCKER] Reconstruction et redemarrage des conteneurs...'
if [ -f docker-compose.yml ]; then
    $dockerComposeCmd down
    echo '[BUILD] Reconstruction de l image...'
    $dockerComposeCmd build --no-cache
    echo '[START] Demarrage des conteneurs...'
    $dockerComposeCmd up -d
    echo '[OK] Conteneurs demarres'
    echo '[STATUS] Etat des conteneurs:'
    $dockerComposeCmd ps
    echo '[LOGS] Logs recents:'
    $dockerComposeCmd logs --tail=20 backend
    sleep 5
    echo '[HEALTH] Verification de la sante...'
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo '[OK] Service repond correctement'
    else
        echo '[WARNING] Service ne repond pas encore - peut prendre quelques secondes'
    fi
else
    echo '[ERREUR] docker-compose.yml introuvable dans $dockerPath'
    exit 1
fi
"@

    # Convertir les line endings Windows en Unix
    # PowerShell utilise \r\n (Windows) par defaut, bash attend \n (Unix)
    $dockerScriptUnix = $dockerScript -replace "`r`n", "`n"
    
    # Creer un fichier temporaire local avec line endings Unix
    $tempScript = [System.IO.Path]::GetTempFileName()
    $tempScriptSh = "$tempScript.sh"
    [System.IO.File]::WriteAllText($tempScriptSh, $dockerScriptUnix, [System.Text.Encoding]::UTF8)
    
    # Transferer le script sur le serveur et l'executer
    Write-Info "   Execution du script Docker via SSH..."
    $remoteScript = "/tmp/deploy-docker-$([System.Guid]::NewGuid().ToString('N').Substring(0,8)).sh"
    
    # Copier le script sur le serveur
    # Utilisation de ssh + tr pour éviter les problèmes scp et les line-endings Windows
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
        # Afficher les logs de deploiement
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
        
        # Deployer le script helper pour faciliter les commandes Docker
        Write-Info ""
        Write-Info "   Deploiement du script helper Docker..."
        $helperScript = Join-Path $PSScriptRoot "docker-helper.sh"
        if (Test-Path $helperScript) {
            # Copier le script helper et le rendre executable
            Get-Content $helperScript -Raw | ssh $sshAlias "cat > $dockerPath/docker-helper.sh && chmod +x $dockerPath/docker-helper.sh" 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "   [OK] Script helper deploye"
            }
            else {
                Write-Warning "   [!] Impossible de deployer le script helper"
            }
        }
    }
    else {
        Write-Error "[ERREUR] Echec de la gestion Docker"
        Write-Info "   Verifiez les logs: ssh $sshAlias `"cd $dockerPath && $dockerComposeCmd logs`""
        if ($result) {
            Write-Info "   Details:"
            $result | ForEach-Object { Write-Info "   $_" }
        }
        exit 1
    }
}

Write-Info ""
Write-Success "=========================================="
Write-Success "Deploiement termine avec succes!"
Write-Success "=========================================="
Write-Info ""
Write-Info "Commandes utiles (via script helper):"
Write-Info "  Logs:    ssh $sshAlias `"$dockerPath/docker-helper.sh logs`""
Write-Info "  Status:  ssh $sshAlias `"$dockerPath/docker-helper.sh status`""
Write-Info "  Restart: ssh $sshAlias `"$dockerPath/docker-helper.sh restart`""
Write-Info "  Stop:    ssh $sshAlias `"$dockerPath/docker-helper.sh stop`""
Write-Info "  Shell:   ssh $sshAlias `"$dockerPath/docker-helper.sh shell`""
Write-Info ""
Write-Info "Commandes Docker directes (si helper ne fonctionne pas):"
Write-Info "  Logs:    ssh $sshAlias `"cd $dockerPath && sudo $dockerComposeCmd logs -f backend`""
Write-Info "  Status:  ssh $sshAlias `"cd $dockerPath && sudo $dockerComposeCmd ps`""

