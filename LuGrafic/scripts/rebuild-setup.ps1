[CmdletBinding()]
param(
    [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$packagePath = Join-Path $projectRoot 'package.json'
$tauriConfigPath = Join-Path $projectRoot 'src-tauri\tauri.conf.json'
$bundleRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot 'src-tauri\target\release\bundle'))
$nsisDirectory = [IO.Path]::GetFullPath((Join-Path $bundleRoot 'nsis'))
$msiDirectory = [IO.Path]::GetFullPath((Join-Path $bundleRoot 'msi'))

if (-not (Test-Path -LiteralPath $packagePath -PathType Leaf) -or
    -not (Test-Path -LiteralPath $tauriConfigPath -PathType Leaf)) {
    throw 'Execute este script dentro de uma cópia válida do projeto LuGrafic.'
}

foreach ($directory in @($nsisDirectory, $msiDirectory)) {
    if (-not $directory.StartsWith($bundleRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Diretório de bundle fora do projeto: $directory"
    }
}

$package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
$tauriConfig = Get-Content -LiteralPath $tauriConfigPath -Raw | ConvertFrom-Json

if ($package.version -ne $tauriConfig.version) {
    throw "Versões divergentes: package.json=$($package.version), tauri.conf.json=$($tauriConfig.version)."
}

$version = [string]$tauriConfig.version
$productName = [string]$tauriConfig.productName
Write-Host "Gerando $productName $version..." -ForegroundColor Cyan

Push-Location $projectRoot
try {
    if (-not $SkipTests) {
        & npm.cmd test
        if ($LASTEXITCODE -ne 0) { throw 'Os testes falharam; os instaladores antigos foram preservados.' }
    }

    & npm.cmd run tauri -- build
    if ($LASTEXITCODE -ne 0) { throw 'O build do Tauri falhou; os instaladores antigos foram preservados.' }
}
finally {
    Pop-Location
}

$currentInstallers = @(
    Get-ChildItem -LiteralPath $nsisDirectory -Filter "${productName}_${version}_*-setup.exe" -File -ErrorAction SilentlyContinue
    Get-ChildItem -LiteralPath $msiDirectory -Filter "${productName}_${version}_*.msi" -File -ErrorAction SilentlyContinue
)

if ($currentInstallers.Count -lt 2) {
    throw "O build terminou, mas os instaladores esperados da versão $version não foram encontrados. Nada foi excluído."
}

$currentPaths = @($currentInstallers | ForEach-Object { $_.FullName })
$oldInstallers = @(
    @(
        Get-ChildItem -LiteralPath $nsisDirectory -Filter '*.exe' -File -ErrorAction SilentlyContinue
        Get-ChildItem -LiteralPath $msiDirectory -Filter '*.msi' -File -ErrorAction SilentlyContinue
    ) | Where-Object { $_.FullName -notin $currentPaths }
)

foreach ($installer in $oldInstallers) {
    Remove-Item -LiteralPath $installer.FullName -Force
    Write-Host "Removido: $($installer.Name)" -ForegroundColor DarkGray
}

Write-Host ''
Write-Host 'Instaladores atuais:' -ForegroundColor Green
$currentInstallers | Sort-Object Name | ForEach-Object {
    $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    Write-Host "- $($_.FullName)"
    Write-Host "  SHA-256: $hash"
}

if ($oldInstallers.Count -eq 0) {
    Write-Host 'Nenhum instalador antigo foi encontrado.' -ForegroundColor DarkGray
}
