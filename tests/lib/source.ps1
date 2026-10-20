# A class split across files lives at js/<name>.js plus js/<name>-2.js, -3.js…,
# in that order. Tests assert against the concatenated source so a pattern can
# live in any of the files. Dot-source this before reading a script's text:
#
#   . (Join-Path $PSScriptRoot "lib\source.ps1")
#   $source = Get-SourceText -Path $settingsPath

function Get-SourceText {
  param([Parameter(Mandatory = $true)][string]$Path)

  $base = [System.IO.Path]::GetFileNameWithoutExtension($Path)
  $directory = Split-Path -Parent $Path
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
