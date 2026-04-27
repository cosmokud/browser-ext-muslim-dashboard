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

$topLevelFiles = @("manifest.json")
$topLevelHtmlFiles = @(
  Get-ChildItem -Path $repoRoot -File -Filter *.html |
    Sort-Object -Property Name |
    Select-Object -ExpandProperty Name
)

if ($topLevelHtmlFiles.Count -eq 0) {
  throw "No top-level HTML files found. Expected at least one extension entry page."
}

$topLevelFiles += $topLevelHtmlFiles

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

function Add-RelativePathToSet {
  param(
    [hashtable]$TargetSet,
    [string]$PathValue
  )

  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    return
  }

  $candidate = $PathValue.Replace("\", "/").Trim()
  if ([string]::IsNullOrWhiteSpace($candidate)) {
    return
  }

  if (
    $candidate.StartsWith("http://") -or
    $candidate.StartsWith("https://") -or
    $candidate.StartsWith("data:") -or
    $candidate.StartsWith("chrome-extension://")
  ) {
    return
  }

  if ($candidate.Contains("*")) {
    return
  }

  $candidate = $candidate.TrimStart("/")
  if ([string]::IsNullOrWhiteSpace($candidate)) {
    return
  }

  $TargetSet[$candidate] = $true
}

function Add-ManifestPathsFromValue {
  param(
    [hashtable]$TargetSet,
    [object]$Value
  )

  if ($null -eq $Value) {
    return
  }

  if ($Value -is [string]) {
    Add-RelativePathToSet -TargetSet $TargetSet -PathValue $Value
    return
  }

  $psProperties = @()
  if ($null -ne $Value.PSObject) {
    $psProperties = @($Value.PSObject.Properties)
  }

  if ($Value -is [System.Array]) {
    foreach ($entry in $Value) {
      Add-ManifestPathsFromValue -TargetSet $TargetSet -Value $entry
    }
    return
  }

  if (
    $Value -is [System.Collections.IEnumerable] -and
    -not ($Value -is [string]) -and
    $psProperties.Count -eq 0
  ) {
    foreach ($entry in $Value) {
      Add-ManifestPathsFromValue -TargetSet $TargetSet -Value $entry
    }
    return
  }

  if ($psProperties.Count -gt 0) {
    foreach ($property in $psProperties) {
      Add-ManifestPathsFromValue -TargetSet $TargetSet -Value $property.Value
    }
  }
}

function Assert-ReferencedFilesExist {
  param(
    [string]$RootPath,
    [hashtable]$RelativePathSet,
    [string]$ErrorPrefix
  )

  foreach ($relativePath in ($RelativePathSet.Keys | Sort-Object)) {
    $absolutePath = Join-Path $RootPath $relativePath
    if (-not (Test-Path -LiteralPath $absolutePath)) {
      throw "$ErrorPrefix$relativePath"
    }
  }
}

function Get-PathWithoutQueryOrHash {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return ""
  }

  $clean = $Value
  $hashIndex = $clean.IndexOf("#")
  if ($hashIndex -ge 0) {
    $clean = $clean.Substring(0, $hashIndex)
  }

  $queryIndex = $clean.IndexOf("?")
  if ($queryIndex -ge 0) {
    $clean = $clean.Substring(0, $queryIndex)
  }

  return $clean.Trim()
}

function Get-ObjectPropertyValue {
  param(
    [object]$ObjectValue,
    [string]$PropertyName
  )

  if ($null -eq $ObjectValue) {
    return $null
  }

  $property = $ObjectValue.PSObject.Properties[$PropertyName]
  if ($null -eq $property) {
    return $null
  }

  return $property.Value
}

$manifestReferencedPaths = @{}

# Manifest entry points/pages
$manifestBackground = Get-ObjectPropertyValue -ObjectValue $manifest -PropertyName "background"
$manifestAction = Get-ObjectPropertyValue -ObjectValue $manifest -PropertyName "action"
$manifestOptionsUi = Get-ObjectPropertyValue -ObjectValue $manifest -PropertyName "options_ui"
$manifestSidePanel = Get-ObjectPropertyValue -ObjectValue $manifest -PropertyName "side_panel"
$manifestSandbox = Get-ObjectPropertyValue -ObjectValue $manifest -PropertyName "sandbox"
$manifestWebAccessibleResources = Get-ObjectPropertyValue -ObjectValue $manifest -PropertyName "web_accessible_resources"

Add-RelativePathToSet -TargetSet $manifestReferencedPaths -PathValue (Get-ObjectPropertyValue -ObjectValue $manifestBackground -PropertyName "service_worker")
Add-RelativePathToSet -TargetSet $manifestReferencedPaths -PathValue (Get-ObjectPropertyValue -ObjectValue $manifestAction -PropertyName "default_popup")
Add-ManifestPathsFromValue -TargetSet $manifestReferencedPaths -Value (Get-ObjectPropertyValue -ObjectValue $manifest -PropertyName "chrome_url_overrides")
Add-RelativePathToSet -TargetSet $manifestReferencedPaths -PathValue (Get-ObjectPropertyValue -ObjectValue $manifest -PropertyName "options_page")
Add-RelativePathToSet -TargetSet $manifestReferencedPaths -PathValue (Get-ObjectPropertyValue -ObjectValue $manifest -PropertyName "devtools_page")
Add-RelativePathToSet -TargetSet $manifestReferencedPaths -PathValue (Get-ObjectPropertyValue -ObjectValue $manifestOptionsUi -PropertyName "page")
Add-RelativePathToSet -TargetSet $manifestReferencedPaths -PathValue (Get-ObjectPropertyValue -ObjectValue $manifestSidePanel -PropertyName "default_path")
Add-ManifestPathsFromValue -TargetSet $manifestReferencedPaths -Value (Get-ObjectPropertyValue -ObjectValue $manifestSandbox -PropertyName "pages")

# Manifest assets
Add-ManifestPathsFromValue -TargetSet $manifestReferencedPaths -Value (Get-ObjectPropertyValue -ObjectValue $manifest -PropertyName "icons")
Add-ManifestPathsFromValue -TargetSet $manifestReferencedPaths -Value (Get-ObjectPropertyValue -ObjectValue $manifestAction -PropertyName "default_icon")

if ($manifestWebAccessibleResources) {
  foreach ($entry in $manifestWebAccessibleResources) {
    Add-ManifestPathsFromValue -TargetSet $manifestReferencedPaths -Value (Get-ObjectPropertyValue -ObjectValue $entry -PropertyName "resources")
  }
}

Assert-ReferencedFilesExist `
  -RootPath $repoRoot `
  -RelativePathSet $manifestReferencedPaths `
  -ErrorPrefix "manifest.json references a missing source file: "

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

Assert-ReferencedFilesExist `
  -RootPath $packageRoot `
  -RelativePathSet $manifestReferencedPaths `
  -ErrorPrefix "Packaged extension is missing manifest-referenced file: "

$legacySnapshotPath = Join-Path $packageRoot "data\hisn.html"
if (Test-Path -LiteralPath $legacySnapshotPath) {
  Remove-Item -LiteralPath $legacySnapshotPath -Force
}

$htmlFiles = Get-ChildItem -Path $packageRoot -Recurse -File -Include *.html

foreach ($htmlFile in $htmlFiles) {
  $htmlContent = Get-Content -LiteralPath $htmlFile.FullName -Raw
  $tagMatches = [regex]::Matches(
    $htmlContent,
    '(?is)<(?:script\b[^>]*\bsrc|link\b[^>]*\bhref)\s*=\s*["'']([^"'']+)["'']'
  )

  foreach ($match in $tagMatches) {
    $rawReference = $match.Groups[1].Value
    $normalizedReference = Get-PathWithoutQueryOrHash -Value $rawReference
    if ([string]::IsNullOrWhiteSpace($normalizedReference)) {
      continue
    }

    if (
      $normalizedReference.StartsWith("http://") -or
      $normalizedReference.StartsWith("https://") -or
      $normalizedReference.StartsWith("//") -or
      $normalizedReference.StartsWith("data:") -or
      $normalizedReference.StartsWith("#")
    ) {
      continue
    }

    $resolvedPath =
      if ($normalizedReference.StartsWith("/")) {
        Join-Path $packageRoot ($normalizedReference.TrimStart("/"))
      } else {
        Join-Path $htmlFile.Directory.FullName $normalizedReference
      }

    if (-not (Test-Path -LiteralPath $resolvedPath)) {
      throw "HTML reference missing in package: $($htmlFile.FullName) -> $normalizedReference"
    }
  }
}

$codeFilesForRuntimeGetUrlCheck = Get-ChildItem -Path $packageRoot -Recurse -File -Include *.js,*.html
foreach ($codeFile in $codeFilesForRuntimeGetUrlCheck) {
  $codeContent = Get-Content -LiteralPath $codeFile.FullName -Raw
  $runtimeGetUrlMatches = [regex]::Matches(
    $codeContent,
    'chrome\.runtime\.getURL\(\s*["'']([^"'']+)["'']\s*\)'
  )

  foreach ($match in $runtimeGetUrlMatches) {
    $rawReference = $match.Groups[1].Value
    $normalizedReference = Get-PathWithoutQueryOrHash -Value $rawReference
    if ([string]::IsNullOrWhiteSpace($normalizedReference)) {
      continue
    }

    if (
      $normalizedReference.StartsWith("http://") -or
      $normalizedReference.StartsWith("https://") -or
      $normalizedReference.StartsWith("data:") -or
      $normalizedReference.Contains("*")
    ) {
      continue
    }

    $resolvedPath = Join-Path $packageRoot ($normalizedReference.TrimStart("/"))
    if (-not (Test-Path -LiteralPath $resolvedPath)) {
      throw "chrome.runtime.getURL() references missing file in package: $($codeFile.FullName) -> $normalizedReference"
    }
  }
}

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
