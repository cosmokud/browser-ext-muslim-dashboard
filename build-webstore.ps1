param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$distRoot = Join-Path $repoRoot "dist"
$packageRoot = Join-Path $distRoot "chrome-webstore"

$manifestPath = Join-Path $repoRoot "manifest.json"
if (-not (Test-Path -LiteralPath $manifestPath)) {
  throw "Missing required file: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$manifestVersion = [string]$manifest.version
if ([string]::IsNullOrWhiteSpace($manifestVersion)) {
  throw "manifest.json is missing the required version field."
}

if ($manifestVersion -notmatch '^\d+\.\d+\.\d+$') {
  throw "Unsupported manifest version format: $manifestVersion. Expected semantic version like 1.2.3"
}

$zipName = "muslim-dashboard-v$manifestVersion.zip"
$zipPath = Join-Path $distRoot $zipName

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

$configPath = Join-Path $repoRoot "js\config.js"
if (-not (Test-Path -LiteralPath $configPath)) {
  throw "Missing required file: $configPath"
}

$debugAssignments = @()
$configLines = Get-Content -LiteralPath $configPath
$updatedConfigLines = @()
$configWasUpdated = $false

foreach ($line in $configLines) {
  $effectiveLine = $line
  $trimmedLine = $line.Trim()
  if (
    -not (
      $trimmedLine.StartsWith("//") -or
      $trimmedLine.StartsWith("/*") -or
      $trimmedLine.StartsWith("*")
    )
  ) {
    $assignmentMatch = [regex]::Match(
      $line,
      'globalThis\.ENABLE_DEBUG_MODE\s*=\s*(true|false)\s*;'
    )
    if ($assignmentMatch.Success) {
      $assignmentValue = $assignmentMatch.Groups[1].Value.ToLowerInvariant()
      if ($assignmentValue -eq "true") {
        $effectiveLine = [regex]::Replace(
          $line,
          'globalThis\.ENABLE_DEBUG_MODE\s*=\s*true\s*;',
          'globalThis.ENABLE_DEBUG_MODE = false;'
        )
        $assignmentValue = "false"
        $configWasUpdated = $true
      }
      $debugAssignments += $assignmentValue
    }
  }

  $updatedConfigLines += $effectiveLine
}

if ($debugAssignments.Count -eq 0) {
  throw "Missing debug mode assignment in js/config.js. Expected: globalThis.ENABLE_DEBUG_MODE = false;"
}

if ($configWasUpdated) {
  Set-Content -LiteralPath $configPath -Value $updatedConfigLines -Encoding UTF8
  Write-Host "Auto-disabled debug mode in js/config.js for release packaging."
}

$lastDebugValue = $debugAssignments[$debugAssignments.Count - 1]
if ($lastDebugValue -ne "false") {
  throw "Final debug mode assignment in js/config.js must be false before building webstore package."
}

function Write-MatchList {
  param([object[]]$MatchList)

  foreach ($match in $MatchList) {
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
  Write-MatchList -MatchList $remoteScriptMatches
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
  Write-MatchList -MatchList $remoteStyleMatches
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
  Write-MatchList -MatchList $remoteImportMatches
  throw "Packaged extension still contains remote code import patterns."
}

Compress-Archive -Path (Join-Path $packageRoot "*") -DestinationPath $zipPath -Force

Write-Host "Built package folder: $packageRoot"
Write-Host "Built package ZIP: $zipPath"