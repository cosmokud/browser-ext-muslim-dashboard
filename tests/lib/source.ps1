# A class split across files lives in js/<name>/: index.js declares the class and
# the other files add its methods, in the order index.html loads them. Tests
# assert against the concatenated source so a pattern can live in any file.
# Dot-source this before reading a script's text:
#
#   . (Join-Path $PSScriptRoot "lib\source.ps1")
#   $source = Get-SourceText -Path $settingsPath

function Get-SourceText {
  param([Parameter(Mandatory = $true)][string]$Path)

  $base = [System.IO.Path]::GetFileNameWithoutExtension($Path)
  $directory = Split-Path -Parent $Path
  $folder = Join-Path $directory $base

  if (Test-Path -LiteralPath $folder -PathType Container) {
    $repoRoot = Split-Path -Parent $directory
    $page = Join-Path $repoRoot "index.html"
    $order = @()
    if (Test-Path -LiteralPath $page) {
      $pattern = 'js/{0}/([^"]+\.js)' -f [regex]::Escape($base)
      $order = @(
        [regex]::Matches((Get-Content -LiteralPath $page -Raw), $pattern) |
          ForEach-Object { $_.Groups[1].Value } |
          Select-Object -Unique
      )
    }
    $files = @(
      $order |
        ForEach-Object { Join-Path $folder $_ } |
        Where-Object { Test-Path -LiteralPath $_ }
    )
    $texts = @($files | ForEach-Object { Get-Content -LiteralPath $_ -Raw })
    return ($texts -join "`n")
  }

  # A class kept in one file: js/<name>.js plus js/<name>-2.js, -3.js… in order.
  $parts = @(
    Get-ChildItem -Path (Join-Path $directory "$base-*.js") -File -ErrorAction SilentlyContinue |
      ForEach-Object {
        $match = [regex]::Match($_.Name, "^$([regex]::Escape($base))-(\d+)\.js$")
        if ($match.Success) {
          [pscustomobject]@{ Path = $_.FullName; Order = [int]$match.Groups[1].Value }
        }
      } |
      Sort-Object -Property Order
  )

  $files = @($Path) + @($parts | ForEach-Object { $_.Path })
  $texts = @($files | ForEach-Object { Get-Content -LiteralPath $_ -Raw })
  return ($texts -join "`n")
}
