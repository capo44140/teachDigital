# ============================================================================
#  TeachDigital - Script de deploiement unifie Synology (backend + frontend)
# ============================================================================
#
#  Usage:
#    .\deploy.ps1                          # Deploie backend + frontend
#    .\deploy.ps1 -Target backend          # Backend uniquement
#    .\deploy.ps1 -Target frontend         # Frontend uniquement
#    .\deploy.ps1 -SkipBuild               # Saute le build front (reuse dist/)
#    .\deploy.ps1 -NoBuildCache            # docker compose build --no-cache
#
#  Optimisations vs scripts separes :
#    - Detection docker / docker-compose mise en cache (1x par run)
#    - Code factorise : ~290 lignes au lieu de ~750
#    - Health checks unifies et parametres
#    - Commandes SSH groupees au maximum (compense l'absence de ControlMaster
#      sous Windows OpenSSH, qui ne supporte pas le multiplexing).
# ============================================================================

[CmdletBinding()]
param(
    [ValidateSet('backend', 'frontend', 'both')]
    [string]$Target = 'both',

    [string]$BackendPath,
    [string]$FrontendPath,
    [string]$SshAlias = 'synology',

    [switch]$SkipBuild,
    [switch]$NoBuildCache
)

# NB: pas de $ErrorActionPreference = 'Stop'.
# PowerShell 5.1 transforme chaque ligne stderr d'un .exe en NativeCommandError ;
# avec 'Stop', un simple WARNING ssh (ex: post-quantum) tuerait le script.
# On gere les erreurs via $LASTEXITCODE + exit 1 explicites.
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

# ----- Logging helpers -----------------------------------------------------
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Err     { Write-Host $args -ForegroundColor Red }
function Write-Info    { Write-Host $args -ForegroundColor Cyan }
function Write-Warn    { Write-Host $args -ForegroundColor Yellow }

function Write-Section($title) {
    Write-Host ''
    Write-Host '==========================================' -ForegroundColor Magenta
    Write-Host $title -ForegroundColor Magenta
    Write-Host '==========================================' -ForegroundColor Magenta
}

# ----- SSH wrapper ---------------------------------------------------------
# NB: Windows OpenSSH ne supporte pas ControlMaster. On compense en groupant
# les commandes (un seul ssh par bloc d'operations liees).
$Script:SshOpts = @(
    '-o', 'BatchMode=yes',
    '-o', 'ConnectTimeout=10',
    '-o', 'ServerAliveInterval=15',
    '-o', 'LogLevel=ERROR'   # supprime les WARNING (post-quantum, etc.)
)

function Invoke-Ssh([string]$cmd) {
    # 2>$null : on supprime stderr (deja filtre par LogLevel=ERROR cote ssh)
    # car PowerShell 5.1 transforme chaque ligne stderr en NativeCommandError.
    & ssh @Script:SshOpts $SshAlias $cmd 2>$null
}

function Test-Ssh([string]$cmd) {
    Invoke-Ssh $cmd | Out-Null
    return ($LASTEXITCODE -eq 0)
}

function Initialize-Ssh {
    Write-Info "[SSH] Test de connexion..."
    if (-not (Test-Ssh 'echo ok')) {
        Write-Err "[ERREUR] Connexion SSH impossible. Verifiez l'alias '$SshAlias' dans ~/.ssh/config"
        exit 1
    }
    Write-Success "[OK] SSH operationnel"
}

# ----- Pre-requis local ----------------------------------------------------
function Assert-LocalTar {
    & tar --version 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Err "[ERREUR] tar n'est pas disponible. Installez Git for Windows."
        exit 1
    }
}

function Get-GitBashPath {
    $candidates = @(
        'C:\Program Files\Git\bin\bash.exe',
        'C:\Program Files (x86)\Git\bin\bash.exe'
    )
    foreach ($p in $candidates) { if (Test-Path $p) { return $p } }
    return $null
}

# ----- Detection Docker / Compose distants (1x par run) -------------------
$Script:DockerCmd        = $null
$Script:DockerComposeCmd = $null

function Resolve-RemoteDocker {
    Write-Info "[DOCKER] Detection sur le NAS (1 fois)..."

    # Probe transfere via Invoke-RemoteBashScript pour neutraliser les CRLF Windows
    # (ssh.exe Windows envoie des \r dans le script, qui contaminent les variables bash)
    $probe = @'
DOCKER=""; COMPOSE=""
for d in docker /usr/local/bin/docker /var/packages/ContainerManager/target/usr/bin/docker; do
  if "$d" --version >/dev/null 2>&1; then DOCKER="$d"; break; fi
done
if [ -z "$DOCKER" ]; then echo "ERR_NO_DOCKER"; exit 1; fi
if "$DOCKER" compose version >/dev/null 2>&1; then
  COMPOSE="$DOCKER compose"
else
  for c in docker-compose /usr/local/bin/docker-compose /var/packages/ContainerManager/target/usr/bin/docker-compose; do
    if "$c" --version >/dev/null 2>&1; then COMPOSE="$c"; break; fi
  done
fi
if [ -z "$COMPOSE" ]; then echo "ERR_NO_COMPOSE"; exit 1; fi
if ! "$DOCKER" ps >/dev/null 2>&1; then echo "ERR_NO_DOCKER_PERM"; exit 1; fi
echo "DOCKER=$DOCKER"
echo "COMPOSE=$COMPOSE"
'@
    $r = Invoke-RemoteBashScript $probe
    $out = $r.Output
    if ($r.ExitCode -ne 0) {
        Write-Err "[ERREUR] Detection Docker echouee :"
        $out | ForEach-Object { Write-Info "   $_" }
        if ($out -match 'ERR_NO_DOCKER_PERM') {
            Write-Info "   Solution : sudo usermod -aG docker `$USER"
        }
        exit 1
    }
    foreach ($line in $out) {
        if ($line -match '^DOCKER=(.+)$')  { $Script:DockerCmd        = $matches[1].Trim() }
        if ($line -match '^COMPOSE=(.+)$') { $Script:DockerComposeCmd = $matches[1].Trim() }
    }
    if (-not $Script:DockerCmd -or -not $Script:DockerComposeCmd) {
        Write-Err "[ERREUR] Reponse Docker invalide : $out"
        exit 1
    }
    Write-Success "   docker  -> $Script:DockerCmd"
    Write-Success "   compose -> $Script:DockerComposeCmd"
}

# ----- Transfert tar via Git Bash ------------------------------------------
function Send-Tarball {
    param(
        [string]$LocalDir,
        [string]$RemoteDir,
        [string[]]$IncludePaths = @('.'),
        [string[]]$Excludes = @()
    )
    $bash = Get-GitBashPath
    if (-not $bash) {
        Write-Err "[ERREUR] Git Bash introuvable (requis pour tar | ssh)"
        exit 1
    }

    Invoke-Ssh "mkdir -p $RemoteDir" | Out-Null

    $excludeArgs = ($Excludes | ForEach-Object { "--exclude=$_" }) -join ' '
    $includeArgs = $IncludePaths -join ' '
    $bashCmd = "cd '$LocalDir' && tar -czf - $excludeArgs $includeArgs 2>/dev/null | ssh -o BatchMode=yes -o ConnectTimeout=10 -o LogLevel=ERROR $SshAlias 'cd $RemoteDir && tar -xzf -'"

    Write-Info "   Transfert tar -> $RemoteDir ..."
    & $bash -c $bashCmd 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Err "[ERREUR] Echec transfert tar (code $LASTEXITCODE)"
        exit 1
    }
    Write-Success "   [OK] Fichiers transferes"
}

# ----- Execution d'un script bash distant (line-endings safe) -------------
function Invoke-RemoteBashScript([string]$Script) {
    $unix = $Script -replace "`r`n", "`n"
    $remote = "/tmp/td-deploy-$([System.Guid]::NewGuid().ToString('N').Substring(0,8)).sh"
    $unix | & ssh @Script:SshOpts $SshAlias "tr -d '\r' > $remote" 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Err "[ERREUR] Impossible de transferer le script distant"
        return @{ ExitCode = 1; Output = '' }
    }
    $out = & ssh @Script:SshOpts $SshAlias "chmod +x $remote && bash $remote 2>&1; rc=`$?; rm -f $remote; exit `$rc"
    return @{ ExitCode = $LASTEXITCODE; Output = $out }
}

function Show-RemoteOutput($lines) {
    if (-not $lines) { return }
    foreach ($l in $lines) {
        if ($l -match '\[OK\]|\[START\]|\[BUILD\]|demarres|repond') { Write-Success "   $l" }
        elseif ($l -match '\[ERREUR\]|\[WARNING\]|error|failed') { Write-Warn "   $l" }
        elseif ($l -match '\[') { Write-Info "   $l" }
    }
}

# ----- Genere le bloc bash docker-compose down/build/up + healthcheck -----
function New-ComposeRunScript {
    param(
        [string]$RemoteDir,
        [string]$HealthCmd,
        [string]$ComponentName,
        [string]$LogService = ''
    )
    $rebuild = if ($NoBuildCache) { '--no-cache' } else { '' }
    $logsTail = if ($LogService) { "$Script:DockerComposeCmd logs --tail=20 $LogService" } else { "$Script:DockerComposeCmd logs --tail=20" }

    return @"
cd "$RemoteDir"
echo '[DOCKER] $ComponentName : reconstruction et redemarrage...'
if [ ! -f docker-compose.yml ]; then
    echo '[ERREUR] docker-compose.yml introuvable dans $RemoteDir'
    exit 1
fi
$Script:DockerComposeCmd down
echo '[BUILD] Image...'
$Script:DockerComposeCmd build $rebuild
build_rc=`$?
if [ `$build_rc -ne 0 ]; then
    echo '[ERREUR] Build a echoue (exit '`$build_rc') - deploiement abandonne'
    echo '[INFO] Conteneurs laisses dans l etat down pour eviter de servir l ancienne image'
    exit `$build_rc
fi
echo '[START] Conteneurs...'
$Script:DockerComposeCmd up -d
echo '[STATUS]'
$Script:DockerComposeCmd ps
echo '[LOGS]'
$logsTail
echo '[HEALTH] Verification...'
max_retries=5
retry=0
while [ `$retry -lt `$max_retries ]; do
    sleep `$((2 ** retry))
    if $HealthCmd; then
        echo '[OK] Service repond (tentative '`$((retry + 1))')'
        break
    else
        retry=`$((retry + 1))
        if [ `$retry -lt `$max_retries ]; then
            echo '[RETRY] '`$retry'/'`$max_retries' - prochaine dans '`$((2 ** retry))'s'
        else
            echo '[WARNING] Service ne repond pas apres '`$max_retries' tentatives'
        fi
    fi
done
"@
}

# ============================================================================
#  PHASE BUILD (frontend uniquement)
# ============================================================================
function Invoke-FrontendBuild {
    if ($SkipBuild) {
        Write-Warn "[BUILD] -SkipBuild actif : on utilise le dist/ existant"
        if (-not (Test-Path (Join-Path $ProjectRoot 'dist'))) {
            Write-Err "[ERREUR] dist/ absent. Lance un build au moins une fois sans -SkipBuild."
            exit 1
        }
        return
    }
    Write-Section "BUILD FRONTEND"
    & pnpm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Err "[ERREUR] pnpm run build a echoue"
        exit 1
    }
    Write-Success "[OK] Build termine"
}

# ============================================================================
#  PHASE DEPLOY BACKEND
# ============================================================================
function Publish-Backend {
    Write-Section "DEPLOY BACKEND"

    if (-not $script:BackendPath) {
        $cfg = Join-Path $ProjectRoot 'backend\.synology-deploy.json'
        if (Test-Path $cfg) {
            $script:BackendPath = (Get-Content $cfg | ConvertFrom-Json).deployPath.Trim()
        }
    }
    if (-not $script:BackendPath) {
        Write-Err "[ERREUR] BackendPath requis (param ou backend\.synology-deploy.json)"
        exit 1
    }
    Write-Info "Destination : $script:BackendPath"

    # Volumes accessibles a Docker non-root (1 seul ssh)
    Invoke-Ssh "mkdir -p $script:BackendPath/logs $script:BackendPath/output $script:BackendPath/temp && chmod 777 $script:BackendPath/logs $script:BackendPath/output $script:BackendPath/temp" | Out-Null

    Send-Tarball `
        -LocalDir (Join-Path $ProjectRoot 'backend') `
        -RemoteDir $script:BackendPath `
        -Excludes @('node_modules', '.git', '*.log', '.env', '.synology-deploy.json', 'dist', '.vscode', '.idea', '.cursor')

    if (-not (Test-Ssh "test -f $script:BackendPath/docker-compose.yml")) {
        Write-Warn "   docker-compose.yml introuvable, etape Docker sautee"
        return
    }

    $bashScript = New-ComposeRunScript `
        -RemoteDir $script:BackendPath `
        -ComponentName 'Backend' `
        -LogService 'backend' `
        -HealthCmd 'curl -f http://localhost:3001/health > /dev/null 2>&1'

    $r = Invoke-RemoteBashScript $bashScript
    Show-RemoteOutput $r.Output
    if ($r.ExitCode -ne 0) {
        Write-Err "[ERREUR] Echec deploiement backend"
        exit 1
    }

    # Helper script (commandes pratiques sur le NAS)
    $helper = Join-Path $ProjectRoot 'backend\docker-helper.sh'
    if (Test-Path $helper) {
        Get-Content $helper -Raw | & ssh @Script:SshOpts $SshAlias "tr -d '\r' > $script:BackendPath/docker-helper.sh && chmod +x $script:BackendPath/docker-helper.sh" 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { Write-Success "   docker-helper.sh deploye" }
    }

    Write-Success "[OK] Backend deploye"
}

# ============================================================================
#  PHASE DEPLOY FRONTEND
# ============================================================================
function Publish-Frontend {
    Write-Section "DEPLOY FRONTEND"

    if (-not $script:FrontendPath) {
        $cfg = Join-Path $ProjectRoot '.synology-deploy.json'
        if (Test-Path $cfg) {
            $obj = Get-Content $cfg | ConvertFrom-Json
            # Seul un champ explicite frontendDeployPath est lu ici.
            # On n'utilise PAS .deployPath du root : il appartient historiquement
            # au backend (legacy deploy-backend.ps1 lance depuis la racine).
            if ($obj.frontendDeployPath) { $script:FrontendPath = $obj.frontendDeployPath.Trim() }
        }
    }
    if (-not $script:FrontendPath) { $script:FrontendPath = '/volume1/docker/teachdigital/frontend' }

    # GARDE-FOU : refuser un FrontendPath qui collide avec le BackendPath.
    # Sans ca, on ecrase le Dockerfile et le docker-compose.yml du backend.
    if ($script:BackendPath -and $script:FrontendPath -eq $script:BackendPath) {
        Write-Err "[ERREUR] FrontendPath et BackendPath sont identiques : $script:FrontendPath"
        Write-Info "   Definissez un chemin distinct via -FrontendPath ou ajoutez"
        Write-Info "   `"frontendDeployPath`" dans .synology-deploy.json"
        exit 1
    }
    Write-Info "Destination : $script:FrontendPath"

    # Prep + nettoyage dist en 1 seul ssh
    Invoke-Ssh "mkdir -p $script:FrontendPath/logs && chmod 777 $script:FrontendPath/logs && rm -rf $script:FrontendPath/dist" | Out-Null

    $files = @('dist', 'nginx-frontend.conf', 'Dockerfile.frontend.prebuilt', 'docker-compose.frontend.yml')
    $missing = $files | Where-Object { -not (Test-Path (Join-Path $ProjectRoot $_)) }
    if ($missing) {
        Write-Err "[ERREUR] Fichiers manquants : $($missing -join ', ')"
        exit 1
    }

    Send-Tarball -LocalDir $ProjectRoot -RemoteDir $script:FrontendPath -IncludePaths $files

    # Renommage cote serveur (1 ssh)
    Invoke-Ssh "mv -f $script:FrontendPath/docker-compose.frontend.yml $script:FrontendPath/docker-compose.yml && mv -f $script:FrontendPath/Dockerfile.frontend.prebuilt $script:FrontendPath/Dockerfile" | Out-Null

    $bashScript = New-ComposeRunScript `
        -RemoteDir $script:FrontendPath `
        -ComponentName 'Frontend' `
        -HealthCmd 'wget --quiet --tries=1 --spider http://localhost:3000 > /dev/null 2>&1'

    $r = Invoke-RemoteBashScript $bashScript
    Show-RemoteOutput $r.Output
    if ($r.ExitCode -ne 0) {
        Write-Err "[ERREUR] Echec deploiement frontend"
        exit 1
    }
    Write-Success "[OK] Frontend deploye"
}

# ============================================================================
#  MAIN
# ============================================================================
Write-Section "DEPLOIEMENT TEACHDIGITAL"
Write-Info "Target : $Target | SSH alias : $SshAlias"

Assert-LocalTar
Initialize-Ssh
Resolve-RemoteDocker

if ($Target -in 'frontend', 'both') { Invoke-FrontendBuild }
if ($Target -in 'backend',  'both') { Publish-Backend }
if ($Target -in 'frontend', 'both') { Publish-Frontend }

Write-Section "DEPLOIEMENT TERMINE"
if ($Target -in 'backend', 'both' -and $script:BackendPath) {
    Write-Info "  Backend  logs    : ssh $SshAlias `"$script:BackendPath/docker-helper.sh logs`""
}
if ($Target -in 'frontend', 'both' -and $script:FrontendPath) {
    Write-Info "  Frontend logs    : ssh $SshAlias `"cd $script:FrontendPath && $Script:DockerComposeCmd logs -f`""
}
