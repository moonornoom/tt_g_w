# 本地执行 - 上传代码到服务器
# 使用 scp 上传构建后的代码

param(
    [string]$ServerIP = "8.162.28.217",
    [string]$User = "admin",
    [string]$RemotePath = "/var/www/fund-compare"
)

$LocalPath = Split-Path -Parent $PSScriptRoot
$ExcludePatterns = @("node_modules", ".next", ".git", "logs", "*.log")

Write-Host "==========================================" -ForegroundColor Green
Write-Host "  上传代码到服务器" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "本地路径: $LocalPath"
Write-Host "服务器: ${User}@${ServerIP}:${RemotePath}"
Write-Host ""

# 1. 先在本地构建
Write-Host "[1/4] 本地构建..." -ForegroundColor Yellow
Set-Location $LocalPath
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "构建失败!" -ForegroundColor Red
    exit 1
}

# 2. 压缩需要上传的文件
Write-Host "[2/4] 压缩文件..." -ForegroundColor Yellow
$TempZip = Join-Path $env:TEMP "fund-compare-deploy.zip"

# 使用 7zip 或 PowerShell 压缩
$ExcludeList = $ExcludePatterns -join "|"
Get-ChildItem -Path $LocalPath -Exclude $ExcludePatterns | Compress-Archive -DestinationPath $TempZip -Force

# 3. 上传到服务器
Write-Host "[3/4] 上传到服务器..." -ForegroundColor Yellow
scp $TempZip "${User}@${ServerIP}:/tmp/fund-compare.zip"

# 4. 在服务器上解压
Write-Host "[4/4] 服务器解压..." -ForegroundColor Yellow
ssh ${User}@${ServerIP} @"
    cd $RemotePath
    unzip -o /tmp/fund-compare.zip
    npm install --production=false
    pm2 restart fund-compare || pm2 start ecosystem.config.js
    rm /tmp/fund-compare.zip
"@

# 清理临时文件
Remove-Item $TempZip -Force

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  部署完成!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "访问: http://${ServerIP}" -ForegroundColor Cyan
