# Script de deploiement rapide sur Synology
# Usage: .\deploy-synology.ps1

param(
    [string]$DeployPath = "",
    [switch]$SkipBuild = $false,
    [switch]$SkipBackup = $false
)

# Couleurs pour les messages
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success { Write-ColorOutput Green $args }
function Write-Error { Write-ColorOutput Red $args }
function Write-Info { Write-ColorOutput Cyan $args }
function Write-Warning { Write-ColorOutput Yellow $args }

# Alias SSH a utiliser
$sshAlias = "synology"

# Determiner le repertoire source
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$scriptDir = Split-Path -Leaf $scriptPath

# Si le script est dans un dossier "backend", on est deja dans le bon repertoire
# Sinon, on se positionne a la racine du projet
if ($scriptDir -eq "backend") {
    # On est dans le dossier backend, on reste ici
    Set-Location $scriptPath
    $backendSourcePath = "."
    Write-Info "[INFO] Script execute depuis le dossier backend"
} else {
    # On se positionne a la racine du projet
    $projectRoot = Split-Path -Parent $scriptPath
    Set-Location $projectRoot
    $backendSourcePath = "./backend"
    Write-Info "[INFO] Script execute depuis la racine du projet"
}

# Charger la configuration
$configFile = ".synology-deploy.json"
if (Test-Path $configFile) {
    $config = Get-Content $configFile | ConvertFrom-Json
    $DeployPath = if ($DeployPath) { $DeployPath } else { $config.deployPath }
} else {
    Write-Warning "[!] Fichier de configuration .synology-deploy.json introuvable"
    Write-Info "Creation du fichier de configuration..."
    
    if (-not $DeployPath) { $DeployPath = Read-Host "Chemin de deploiement (ex: /volume1/docker/teachdigital/backend)" }
    
    $config = @{
        deployPath = $DeployPath
    }
    $config | ConvertTo-Json | Set-Content $configFile
    Write-Success "[OK] Configuration sauvegardee dans .synology-deploy.json"
    Write-Info "   Note: L'alias SSH '$sshAlias' doit etre configure dans ~/.ssh/config"
}

# Verifier que le chemin de deploiement est defini
if (-not $DeployPath) {
    Write-Error "[ERREUR] Chemin de deploiement manquant. Verifiez votre configuration."
    exit 1
}

Write-Info "[DEPLOIEMENT] Deploiement sur Synology"
Write-Info "   Alias SSH: $sshAlias (doit etre configure dans ~/.ssh/config)"
Write-Info "   Path: $DeployPath"
Write-Output ""

# Etape 1: Verification (pas de build frontend necessaire pour le backend)
Write-Info "[1/4] Verification du backend..."
Write-Info "   Repertoire actuel: $(Get-Location)"
Write-Info "   Chemin source backend: $backendSourcePath"

if ($backendSourcePath -eq ".") {
    # On est dans le dossier backend, verifier qu'on a les fichiers necessaires
    if (-not (Test-Path "package.json") -or -not (Test-Path "server.js")) {
        Write-Error "[ERREUR] Repertoire backend invalide (package.json ou server.js introuvable)"
        Write-Info "   Repertoire actuel: $(Get-Location)"
        exit 1
    }
    Write-Success "[OK] Backend trouve (repertoire courant)"
} else {
    # On est a la racine, verifier que le dossier backend existe
    if (-not (Test-Path "backend")) {
        Write-Error "[ERREUR] Dossier backend introuvable"
        Write-Info "   Repertoire actuel: $(Get-Location)"
        exit 1
    }
    Write-Success "[OK] Backend trouve (dossier backend/)"
}

# Etape 2: Verifier la connexion SSH
Write-Info "[2/4] Verification de la connexion SSH..."
try {
    ssh -o ConnectTimeout=5 -o BatchMode=yes $sshAlias "echo 'OK'" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "[ERREUR] Impossible de se connecter au Synology via SSH"
        Write-Info "   Verifiez que:"
        Write-Info "   - L'alias SSH '$sshAlias' est configure dans ~/.ssh/config"
        Write-Info "   - SSH est active sur le Synology"
        Write-Info "   - Votre cle SSH est configuree"
        Write-Info "   - Testez avec: ssh $sshAlias"
        exit 1
    }
    Write-Success "[OK] Connexion SSH OK"
} catch {
    Write-Error "[ERREUR] Erreur de connexion SSH: $_"
    exit 1
}

# Etape 3: Copier le backend
Write-Info "[3/4] Copie du backend sur le Synology..."

# Verifier que le dossier backend existe localement
Write-Info "   Verification du dossier backend local..."
Write-Info "   Repertoire actuel: $(Get-Location)"
Write-Info "   Chemin source: $backendSourcePath"

if (-not (Test-Path $backendSourcePath)) {
    Write-Error "[ERREUR] Dossier backend introuvable localement"
    Write-Info "   Chemin recherche: $backendSourcePath"
    Write-Info "   Repertoire actuel: $(Get-Location)"
    exit 1
}

$backendSize = (Get-ChildItem -Path $backendSourcePath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Info "   Taille du dossier backend: $([math]::Round($backendSize, 2)) MB"

# Creer le repertoire de deploiement s'il n'existe pas
Write-Info "   Creation du repertoire de deploiement sur le Synology..."
$mkdirResult = ssh $sshAlias "mkdir -p $DeployPath" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Warning "   [!] Erreur lors de la creation du repertoire: $mkdirResult"
} else {
    Write-Info "   [OK] Repertoire cree ou existe deja"
}

# Verifier l'espace disque disponible sur le Synology
Write-Info "   Verification de l'espace disque disponible..."
$diskSpace = ssh $sshAlias "df -h $DeployPath | tail -1" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Info "   Espace disque: $diskSpace"
} else {
    Write-Warning "   [!] Impossible de verifier l'espace disque"
}

# Verifier la connexion SSH avant la copie
Write-Info "   Test de la connexion SSH avant copie..."
ssh $sshAlias "echo 'SSH OK'" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "[ERREUR] Connexion SSH perdue avant la copie"
    exit 1
}
Write-Info "   [OK] Connexion SSH OK"

# Determiner le chemin de destination correct
# Si $DeployPath se termine par /backend, on copie vers le parent
# Sinon on copie directement vers $DeployPath
if ($DeployPath -match '/backend$') {
    $targetPath = $DeployPath -replace '/backend$', ''
    Write-Info "   Chemin de deploiement detecte: $DeployPath"
    Write-Info "   Copie vers le repertoire parent: $targetPath"
} else {
    $targetPath = $DeployPath
    Write-Info "   Copie vers: $targetPath"
}

# Copier uniquement le dossier backend
Write-Info "   Copie du dossier backend vers ${sshAlias}:$targetPath/..."
Write-Info "   Cette operation peut prendre plusieurs minutes selon la taille du dossier..."

# Verifier si rsync est disponible localement ET sur le Synology
$rsyncAvailableLocal = $false
$rsyncAvailableRemote = $false

# Verifier rsync local
Write-Info "   Verification de rsync local..."
try {
    rsync --version 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $rsyncAvailableLocal = $true
        Write-Success "   [OK] rsync disponible localement"
    }
} catch {
    $rsyncAvailableLocal = $false
    Write-Warning "   [!] rsync non disponible localement"
}

# Verifier rsync sur le Synology
if ($rsyncAvailableLocal) {
    Write-Info "   Verification de rsync sur le Synology..."
    ssh $sshAlias "which rsync" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $rsyncAvailableRemote = $true
        Write-Success "   [OK] rsync disponible sur le Synology"
    } else {
        Write-Warning "   [!] rsync non disponible sur le Synology"
        Write-Info "   Installez rsync sur le Synology via Entware ou Package Center"
    }
}

# Flag pour indiquer si on doit utiliser scp en fallback
$useScpFallback = $false

if ($rsyncAvailableLocal -and $rsyncAvailableRemote) {
    Write-Info "   Utilisation de rsync (plus fiable et rapide)..."
    
    # Exclusions pour rsync
    $rsyncExcludes = @(
        "--exclude=node_modules",
        "--exclude=.git",
        "--exclude=*.log",
        "--exclude=.env",
        "--exclude=.synology-deploy.json",
        "--exclude=dist",
        "--exclude=.vscode",
        "--exclude=.idea",
        "--exclude=.cursor"
    )
    $rsyncExcludeArgs = $rsyncExcludes -join " "
    
    # Determiner le nom du dossier de destination
    # Utiliser l'alias SSH directement
    if ($backendSourcePath -eq ".") {
        $rsyncSource = "./"
        $rsyncDest = "${sshAlias}:$targetPath/backend/"
    } else {
        $rsyncSource = "./backend/"
        $rsyncDest = "${sshAlias}:$targetPath/backend/"
    }
    
    # Utiliser l'alias SSH directement avec rsync
    # L'alias SSH est déjà configuré dans ~/.ssh/config avec toutes les options nécessaires
    $sshCommand = "ssh"
    
    Write-Info "   Commande: rsync -avz --progress $rsyncExcludeArgs -e '$sshCommand' $rsyncSource $rsyncDest"
    Write-Info "   Transfert en cours (rsync affiche la progression)..."
    
    rsync -avz --progress $rsyncExcludeArgs -e $sshCommand $rsyncSource $rsyncDest 2>&1 | ForEach-Object {
        # Afficher la progression et les erreurs
        if ($_ -match "(error|Error|ERROR|failed|Failed)") {
            Write-Warning "   $_"
        } elseif ($_ -match "(\d+%|sent|total|speed|building|deleting)") {
            Write-Info "   $_"
        } elseif ($_ -match "^[a-zA-Z].*") {
            Write-Info "   $_"
        }
    }
    $copyExitCode = $LASTEXITCODE
    
    if ($copyExitCode -eq 0) {
        Write-Success "   [OK] Transfert rsync reussi"
    } else {
        Write-Error "   [ERREUR] Echec du transfert rsync (code: $copyExitCode)"
        Write-Info "   Passage automatique a scp en fallback..."
        $useScpFallback = $true
    }
}

# Utiliser scp si rsync n'est pas disponible ou a echoue
if ($useScpFallback -or -not $rsyncAvailableLocal -or -not $rsyncAvailableRemote) {
    if ($useScpFallback) {
        Write-Info "   Utilisation de scp en fallback (rsync a echoue)..."
    } elseif (-not $rsyncAvailableLocal) {
        Write-Warning "   [!] rsync non disponible localement"
        Write-Info "   Utilisation de scp (installez rsync pour de meilleures performances)..."
    } else {
        Write-Warning "   [!] rsync non disponible sur le Synology"
        Write-Info "   Utilisation de scp (activez rsync sur le Synology pour de meilleures performances)..."
    }
    
    # Determiner le nom du dossier de destination
    if ($backendSourcePath -eq ".") {
        $scpSource = "."
        $scpDest = "${sshAlias}:$targetPath/backend"
    } else {
        $scpSource = "./backend"
        $scpDest = "${sshAlias}:$targetPath/"
    }
    
    Write-Info "   Commande: scp -r $scpSource $scpDest"
    Write-Info "   (Utilisation de l'alias SSH '$sshAlias' configuré dans ~/.ssh/config)"
    
    # Copier avec scp en utilisant l'alias SSH directement
    # L'alias SSH est déjà configuré avec toutes les options nécessaires
    Write-Info "   Copie en cours (cela peut prendre plusieurs minutes)..."
    
    # Copier directement avec scp (l'alias SSH gère toutes les options)
    Write-Info "   Copie des fichiers en cours..."
    scp -r $scpSource $scpDest 2>&1 | ForEach-Object {
        # Afficher seulement les erreurs importantes
        if ($_ -match "(error|Error|ERROR|failed|Failed|Connection|closed|subsystem)") {
            Write-Warning "   $_"
        }
    }
    $copyExitCode = $LASTEXITCODE
    
    # Si echec avec "subsystem request failed", utiliser tar via SSH (ne necessite pas SFTP)
    if ($copyExitCode -ne 0) {
        Write-Warning "   [!] Echec avec scp (code: $copyExitCode)"
        Write-Info "   [EXPLICATION] L'erreur 'subsystem request failed' signifie que:"
        Write-Info "   - Le sous-systeme SFTP n'est pas configure sur le Synology"
        Write-Info "   - Ou il y a un probleme de permissions SSH"
        Write-Info ""
        Write-Info "   Tentative avec tar via SSH (ne necessite pas SFTP)..."
        
        # Utiliser tar via SSH pour transferer directement sans SFTP
        # Cette methode est plus fiable car elle n'utilise pas le sous-systeme SFTP
        ssh $sshAlias "mkdir -p $targetPath/backend" 2>&1 | Out-Null
        
        if ($backendSourcePath -eq ".") {
            # On est dans le dossier backend
            Write-Info "   Creation de l'archive et transfert via SSH..."
            
            # Verifier si tar est disponible localement
            $tarAvailable = $false
            try {
                tar --version 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    $tarAvailable = $true
                }
            } catch {
                $tarAvailable = $false
            }
            
            if ($tarAvailable) {
                # Utiliser tar pour creer l'archive et la transferer via SSH en streaming
                Write-Info "   Compression et transfert via tar+ssh (streaming)..."
                Write-Info "   Cette methode ne necessite pas SFTP, uniquement SSH"
                
                # Creer le repertoire de destination
                ssh $sshAlias "mkdir -p $targetPath/backend" 2>&1 | Out-Null
                
                # Transferer via tar en streaming (compression locale -> SSH -> extraction distante)
                $tarOutput = tar -czf - --exclude='node_modules' --exclude='.git' --exclude='*.log' --exclude='.env' --exclude='.synology-deploy.json' . 2>&1 | ssh $sshAlias "cd $targetPath/backend && tar -xzf - 2>&1" 2>&1
                
                # Afficher les erreurs si presentes
                $tarOutput | ForEach-Object {
                    if ($_ -match "(error|Error|ERROR|failed|Failed|cannot|Cannot)") {
                        Write-Warning "   $_"
                    } elseif ($_ -match "(extracting|Extracting|creating|Creating)") {
                        Write-Info "   $_"
                    }
                }
                
                # Verifier le code de retour
                $copyExitCode = $LASTEXITCODE
                
                if ($copyExitCode -eq 0) {
                    Write-Success "   [OK] Transfert reussi via tar+SSH"
                } else {
                    Write-Error "   [ERREUR] Echec du transfert tar (code: $copyExitCode)"
                }
            } else {
                Write-Error "   [ERREUR] tar n'est pas disponible localement"
                Write-Info "   Installez Git for Windows ou WSL pour avoir acces a tar"
                Write-Info "   Ou activez SFTP sur le Synology (voir solutions ci-dessous)"
                $copyExitCode = 1
            }
        } else {
            # On est a la racine, copier le dossier backend
            $tarAvailable = $false
            try {
                tar --version 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    $tarAvailable = $true
                }
            } catch {
                $tarAvailable = $false
            }
            
            if ($tarAvailable) {
                Write-Info "   Compression et transfert via tar+ssh (streaming)..."
                Write-Info "   Cette methode ne necessite pas SFTP, uniquement SSH"
                
                # Creer le repertoire de destination
                ssh $sshAlias "mkdir -p $targetPath" 2>&1 | Out-Null
                
                # Transferer via tar en streaming
                $tarOutput = tar -czf - --exclude='node_modules' --exclude='.git' --exclude='*.log' --exclude='.env' -C . backend 2>&1 | ssh $sshAlias "cd $targetPath && tar -xzf - 2>&1" 2>&1
                
                # Afficher les erreurs si presentes
                $tarOutput | ForEach-Object {
                    if ($_ -match "(error|Error|ERROR|failed|Failed|cannot|Cannot)") {
                        Write-Warning "   $_"
                    } elseif ($_ -match "(extracting|Extracting|creating|Creating)") {
                        Write-Info "   $_"
                    }
                }
                
                $copyExitCode = $LASTEXITCODE
                
                if ($copyExitCode -eq 0) {
                    Write-Success "   [OK] Transfert reussi via tar+SSH"
                } else {
                    Write-Error "   [ERREUR] Echec du transfert tar (code: $copyExitCode)"
                }
            } else {
                Write-Error "   [ERREUR] tar n'est pas disponible localement"
                Write-Info "   Installez Git for Windows ou WSL pour avoir acces a tar"
                $copyExitCode = 1
            }
        }
        
        if ($copyExitCode -eq 0) {
            Write-Success "   [OK] Transfert reussi via tar+SSH (sans SFTP)"
        } else {
            Write-Error "   [ERREUR] Echec du transfert avec toutes les methodes"
            Write-Info ""
            Write-Info "   [SOLUTIONS]"
            Write-Info "   1. Activez SFTP sur le Synology:"
            Write-Info "      - Control Panel > File Services > SFTP"
            Write-Info "      - Ou via SSH: sudo vi /etc/ssh/sshd_config"
            Write-Info "        Ajoutez: Subsystem sftp /usr/libexec/sftp-server"
            Write-Info ""
            Write-Info "   2. Installez tar localement (Git for Windows ou WSL)"
            Write-Info ""
            Write-Info "   3. Utilisez rsync si disponible (plus fiable)"
        }
    }
}

if ($copyExitCode -ne 0) {
    Write-Error "[ERREUR] Erreur lors de la copie du backend (code: $copyExitCode)"
    Write-Info ""
    Write-Info "[DIAGNOSTIC] Verifications:"
    
    # Verifier la connexion SSH
    Write-Info "   1. Test de la connexion SSH..."
    ssh $sshAlias "echo 'Test SSH'" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Info "      [OK] Connexion SSH fonctionne"
    } else {
        Write-Error "      [ERREUR] Connexion SSH ne fonctionne plus"
    }
    
    # Verifier les permissions
    Write-Info "   2. Verification des permissions sur le Synology..."
    $permissions = ssh $sshAlias "ls -ld $DeployPath" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Info "      Permissions: $permissions"
    } else {
        Write-Warning "      [!] Impossible de verifier les permissions"
    }
    
    # Verifier l'espace disque
    Write-Info "   3. Verification de l'espace disque..."
    $dfOutput = ssh $sshAlias "df -h $DeployPath" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Info "      $dfOutput"
    } else {
        Write-Warning "      [!] Impossible de verifier l'espace disque"
    }
    
    # Suggestions
    Write-Info ""
    Write-Info "[SUGGESTIONS]"
    Write-Info "   - Verifiez que vous avez les droits d'ecriture sur $DeployPath"
    Write-Info "   - Verifiez l'espace disque disponible"
    Write-Info "   - Essayez de copier manuellement: scp -r ./backend ${sshAlias}:$DeployPath/"
    Write-Info "   - Verifiez les logs SSH: ssh $sshAlias 'tail -f /var/log/auth.log'"
    
    exit 1
}

Write-Success "[OK] Backend copie avec succes"

# Verifier que les fichiers ont bien ete copies
Write-Info "   Verification des fichiers copies..."
$fileCount = ssh $sshAlias "find $DeployPath/backend -type f | wc -l" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Info "   Nombre de fichiers copies: $fileCount"
} else {
    Write-Warning "   [!] Impossible de compter les fichiers"
}

# Etape 4: Installer les dependances et redemarrer le service Node.js
Write-Info "[4/4] Installation des dependances et redemarrage du service Node.js..."

# Verifier si Node.js est installe
ssh $sshAlias "which node" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "[ERREUR] Node.js n'est pas installe sur le Synology"
    Write-Info "   Installez Node.js via le Package Center ou via Entware"
    exit 1
}

# Verifier si pnpm est installe
ssh $sshAlias "which pnpm" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Warning "   [!] pnpm non trouve, utilisation de npm..."
    $packageManager = "npm"
} else {
    $packageManager = "pnpm"
}

Write-Info "   Utilisation de: $packageManager"

# Script de deploiement a executer sur le Synology
$deployScript = @"
cd $DeployPath/backend

# Arreter le service Node.js s'il tourne (PM2, systemd, ou processus direct)
echo "[STOP] Arret du service Node.js..."
# Essayer PM2
pm2 stop teachdigital-backend 2>/dev/null || true
pm2 delete teachdigital-backend 2>/dev/null || true
# Essayer de tuer le processus node server.js
pkill -f 'node.*server.js' 2>/dev/null || true
# Attendre un peu
sleep 2

# Installer les dependances
echo "[INSTALL] Installation des dependances..."
$packageManager install --production

if [ `$? -ne 0 ]; then
    echo "[ERREUR] Erreur lors de l'installation des dependances"
    exit 1
fi

# Verifier que le fichier .env existe
if [ ! -f .env ]; then
    echo "[WARNING] Fichier .env non trouve"
    echo "   Creez un fichier .env avec vos variables d'environnement"
    echo "   Vous pouvez copier env.example en .env et l'adapter"
fi

# Demarrer le service avec PM2 si disponible, sinon avec node directement
echo "[START] Demarrage du service Node.js..."
if command -v pm2 &> /dev/null; then
    pm2 start server.js --name teachdigital-backend --update-env
    pm2 save
    echo "[OK] Service demarre avec PM2"
    echo "[STATUS] Etat du service:"
    pm2 status
    echo "[LOGS] Logs recents:"
    pm2 logs teachdigital-backend --lines 20 --nostream
else
    # Demarrer en arriere-plan avec nohup
    nohup node server.js > server.log 2>&1 &
    echo `$! > server.pid
    echo "[OK] Service demarre en arriere-plan (PID: `$(cat server.pid))"
    echo "[LOGS] Logs recents:"
    tail -n 20 server.log
fi

# Attendre un peu pour que le service demarre
sleep 3

# Verifier que le service repond
echo "[HEALTH] Verification de la sante du service..."
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "[OK] Service repond correctement"
else
    echo "[WARNING] Le service ne repond pas encore (peut prendre quelques secondes)"
fi
"@

# Executer le script sur le Synology
ssh $sshAlias $deployScript

if ($LASTEXITCODE -ne 0) {
    Write-Error "[ERREUR] Erreur lors du redemarrage du service"
    Write-Info "   Verifiez les logs: ssh $sshAlias 'cd $DeployPath/backend && tail -f server.log'"
    Write-Info "   Ou avec PM2: ssh $sshAlias 'cd $DeployPath/backend && pm2 logs teachdigital-backend'"
    exit 1
}

Write-Output ""
Write-Success "[OK] Deploiement du backend Node.js termine avec succes!"
Write-Info ""
Write-Info "[INFO] Commandes utiles:"
Write-Info "   Voir les logs: ssh $sshAlias 'cd $DeployPath/backend && tail -f server.log'"
Write-Info "   Ou avec PM2: ssh $sshAlias 'cd $DeployPath/backend && pm2 logs teachdigital-backend'"
Write-Info "   Redemarrer: ssh $sshAlias 'cd $DeployPath/backend && pm2 restart teachdigital-backend'"
Write-Info "   Arreter: ssh $sshAlias 'cd $DeployPath/backend && pm2 stop teachdigital-backend'"
Write-Info "   Etat: ssh $sshAlias 'cd $DeployPath/backend && pm2 status'"
Write-Output ""
