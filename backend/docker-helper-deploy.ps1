# Quick script to deploy docker-helper.sh with proper line endings
$helperScript = Join-Path $PSScriptRoot "docker-helper.sh"
$content = Get-Content $helperScript -Raw

# Send to remote with tr to strip carriage returns
$content | & "C:\Program Files\Git\bin\bash.exe" -c "ssh synology 'cat > /tmp/docker-helper-temp.sh'"

# Convert line endings and move to final location
ssh synology "tr -d '\r' < /tmp/docker-helper-temp.sh > /volume1/docker/teachdigital/backend/docker-helper.sh && chmod +x /volume1/docker/teachdigital/backend/docker-helper.sh && rm /tmp/docker-helper-temp.sh"

Write-Host "docker-helper.sh deployed successfully" -ForegroundColor Green

# Verify the deployment
Write-Host "`nVerifying DOCKER_CMD variable:" -ForegroundColor Cyan
ssh synology "grep 'DOCKER_CMD=' /volume1/docker/teachdigital/backend/docker-helper.sh"
