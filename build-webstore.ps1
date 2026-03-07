param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$distRoot = Join-Path $repoRoot "dist"
$packageRoot = Join-Path $distRoot "chrome-webstore"
$zipPath = Join-Path $distRoot "chrome-webstore.zip"

$topLevelFiles = @(
  "manifest.json",
  "index.html",
  "popup.html"
)

$runtimeDirectories = @(
  "assets",
  "css",
  "data",
  "fonts",
  "icons",
  "js"
)

function Write-MatchList {
  param([object[]]$Matches)

  foreach ($match in $Matches) {
    Write-Host (" - {0}:{1}: {2}" -f $match.Path, $match.LineNumber, $match.Line.Trim())
  }
}

if (Test-Path -LiteralPath $distRoot) {
  Remove-Item -LiteralPath $distRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $packageRoot -Force | Out-Null

foreach ($file in $topLevelFiles) {
  $sourcePath = Join-Path $repoRoot $file
  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Missing required file: $sourcePath"
  }

  Copy-Item -LiteralPath $sourcePath -Destination (Join-Path $packageRoot $file) -Force
}

foreach ($dir in $runtimeDirectories) {
  $sourcePath = Join-Path $repoRoot $dir
  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Missing required directory: $sourcePath"
  }

  Copy-Item -LiteralPath $sourcePath -Destination (Join-Path $packageRoot $dir) -Recurse -Force
}

$legacySnapshotPath = Join-Path $packageRoot "data\hisn.html"
if (Test-Path -LiteralPath $legacySnapshotPath) {
  Remove-Item -LiteralPath $legacySnapshotPath -Force
}

$htmlFiles = Get-ChildItem -Path $packageRoot -Recurse -File -Include *.html
$remoteScriptMatches = @()
if ($htmlFiles) {
  $remoteScriptMatches = @(
    Select-String -Path $htmlFiles.FullName -Pattern '<script[^>]+src=["'']https?://'
  )
}

if ($remoteScriptMatches.Count -gt 0) {
  Write-Host "Remote script references detected in packaged HTML:"
  Write-MatchList -Matches $remoteScriptMatches
  throw "Packaged extension still contains remote script tags."
}

$styleFiles = Get-ChildItem -Path $packageRoot -Recurse -File -Include *.html,*.css
$remoteStyleMatches = @()
if ($styleFiles) {
  $remoteStyleMatches = @(
    Select-String -Path $styleFiles.FullName -Pattern @(
      '<link[^>]+href=["'']https?://',
      '@import\s+(url\()?\s*["'']?https?://',
      'src:\s*url\(["'']?https?://'
    )
  )
}

if ($remoteStyleMatches.Count -gt 0) {
  Write-Host "Remote stylesheet or font references detected in packaged assets:"
  Write-MatchList -Matches $remoteStyleMatches
  throw "Packaged extension still contains remote stylesheet or font references."
}

$codeFiles = Get-ChildItem -Path $packageRoot -Recurse -File -Include *.js,*.html
$remoteImportMatches = @()
if ($codeFiles) {
  $remoteImportMatches = @(
    Select-String -Path $codeFiles.FullName -Pattern @(
      'importScripts\(["'']https?://',
      '\bimport\(["'']https?://',
      '\bfrom\s+["'']https?://'
    )
  )
}

if ($remoteImportMatches.Count -gt 0) {
  Write-Host "Remote code import patterns detected in packaged sources:"
  Write-MatchList -Matches $remoteImportMatches
  throw "Packaged extension still contains remote code import patterns."
}

Compress-Archive -Path (Join-Path $packageRoot "*") -DestinationPath $zipPath -Force

Write-Host "Built package folder: $packageRoot"
Write-Host "Built package ZIP: $zipPath"