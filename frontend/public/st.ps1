$url = "https://steamtools.net/res/st-setup-1.8.30.exe"
$output = "$env:TEMP\st-setup-1.8.30.exe"

Write-Host "Downloading..."

Invoke-WebRequest -Uri $url -OutFile $output

Write-Host "Starting installer..."

Start-Process $output