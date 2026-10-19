$ErrorActionPreference = "Stop"

$sourcePath = Join-Path $PSScriptRoot "..\js\searchbar.js"
$source = Get-Content -Path $sourcePath -Raw
$faviconCachePath = Join-Path $PSScriptRoot "..\js\faviconcache.js"
$faviconCacheSource = Get-Content -Path $faviconCachePath -Raw
$colorThiefPath = Join-Path $PSScriptRoot "..\js\vendor\color-thief.js"
$fastAverageColorPath = Join-Path $PSScriptRoot "..\js\vendor\fast-average-color.js"
$indexPath = Join-Path $PSScriptRoot "..\index.html"
$indexSource = Get-Content -Path $indexPath -Raw
$appPath = Join-Path $PSScriptRoot "..\js\app.js"
$appSource = Get-Content -Path $appPath -Raw
$manifestPath = Join-Path $PSScriptRoot "..\manifest.json"
$manifestSource = Get-Content -Path $manifestPath -Raw
$stylesPath = Join-Path $PSScriptRoot "..\css\styles.css"
$styles = Get-Content -Path $stylesPath -Raw

function Assert-Matches {
  param(
    [string] $Haystack,
    [string] $Pattern,
    [string] $Message
  )

  if ($Haystack -notmatch $Pattern) {
    throw $Message
  }
}

function Assert-NotMatches {
  param(
    [string] $Haystack,
    [string] $Pattern,
    [string] $Message
  )

  if ($Haystack -match $Pattern) {
    throw $Message
  }
}

Assert-Matches `
  -Haystack $source `
  -Pattern '_ensureDefaultAccentForEngine\(engine, \{ force = false \} = \{\}\) \{[\s\S]*?const faviconUrl =[\s\S]*?engine\.cachedFavicon \|\|[\s\S]*?engine\.favicon \|\|[\s\S]*?this\.getFaviconUrlFromTemplate\(engine\.url\);' `
  -Message "Search bar accent extraction must prefer cached favicon data before Google favicon URLs."

Assert-NotMatches `
  -Haystack $indexSource `
  -Pattern '<script src="js/vendor/(color-thief|fast-average-color)\.js"></script>' `
  -Message "Searchbar dominant-color scanning must not load vendor color libraries."

Assert-Matches `
  -Haystack $faviconCacheSource `
  -Pattern 'fetchAndCache\(url, type = "pinned", forceRefresh = false\) \{[\s\S]*?const resp = await fetch\(faviconUrl, \{[\s\S]*?cache: forceRefresh \? "reload" : "force-cache"[\s\S]*?\}\);[\s\S]*?const dataUrl = await this\._blobToDataUrl\(blob\);[\s\S]*?await this\.setCached\(url, dataUrl, type, false\);[\s\S]*?return dataUrl;' `
  -Message "Favicon cache must fetch Google favicon bytes into a data URL so dominant-color scanning can read pixels."

Assert-Matches `
  -Haystack $faviconCacheSource `
  -Pattern 'fetchAndCache\(url, type = "pinned", forceRefresh = false\) \{[\s\S]*?const fallbackCached = await this\.getCached\(url, type\);[\s\S]*?if \(fallbackCached\) return fallbackCached;[\s\S]*?return faviconUrl;' `
  -Message "Favicon cache must fall back to stored data URLs after failed refresh instead of caching remote favicon URLs."

Assert-NotMatches `
  -Haystack $faviconCacheSource `
  -Pattern 'await this\.setCached\(url, faviconUrl, type, false\);' `
  -Message "Favicon cache must not persist remote Google favicon URLs as offline cache records."

Assert-Matches `
  -Haystack $faviconCacheSource `
  -Pattern 'setCached\(url, dataUrl, type = "pinned", isCustom = false\) \{[\s\S]*?this\._setLocalStorageCached\(key, record\);' `
  -Message "Favicon cache must mirror stored favicon data URLs into browser localStorage for offline fallback."

Assert-Matches `
  -Haystack $faviconCacheSource `
  -Pattern 'getCached\(url, type = "pinned"\) \{[\s\S]*?const localRecord = this\._getLocalStorageCached\(key\);[\s\S]*?resolve\(localRecord\.dataUrl\);' `
  -Message "Favicon cache must fall back to localStorage when IndexedDB has no favicon record."

Assert-Matches `
  -Haystack $appSource `
  -Pattern 'this\.searchBar = new SearchBarManager\(this\.storage\);[\s\S]*?window\.faviconCache[\s\S]*?\.initializeAll\(this\.pinnedApps\.apps, this\.searchBar\.searches\)[\s\S]*?\.catch\(\(\) => \{\}\);' `
  -Message "Dashboard startup must ask favicon cache to cache all pinned app and custom search favicons for offline use."

Assert-Matches `
  -Haystack $manifestSource `
  -Pattern '"https://\*\.gstatic\.com/\*"' `
  -Message "Manifest must allow redirected Google favicon hosts such as t3.gstatic.com so cached favicon bytes are readable."

Assert-Matches `
  -Haystack $source `
  -Pattern 'loadFromStorage\(\) \{[\s\S]*?const faviconDominantRgb = this\._normalizeOptionalRgbString\([\s\S]*?s\.faviconDominantRgb,[\s\S]*?faviconDominantRgb,' `
  -Message "Favicon dominant color must persist separately from the currently selected accent color."

Assert-Matches `
  -Haystack $source `
  -Pattern '_ensureDefaultAccentForEngine\(engine, \{ force = false \} = \{\}\) \{[\s\S]*?engine\.faviconDominantRgb = normalizedDominant;[\s\S]*?if \(engine\.accentRgbSource === "custom"\) \{[\s\S]*?this\.persist\(\);[\s\S]*?return;[\s\S]*?\}' `
  -Message "Scanning a favicon must update faviconDominantRgb without overwriting a custom selected accent."

Assert-Matches `
  -Haystack $source `
  -Pattern '_ensureDefaultAccentForEngine\(engine, \{ force = false \} = \{\}\) \{[\s\S]*?const dominant = await this\._getFaviconDominantRgb\(faviconUrl, \{ force \}\);[\s\S]*?const normalizedDominant = this\._normalizeRgbString\(dominant\);[\s\S]*?this\.setEngineAccent\(engine\.id, normalizedDominant, \{ source: "favicon" \}\);' `
  -Message "Search bar must promote dominant favicon color to the live engine accent."

Assert-Matches `
  -Haystack $source `
  -Pattern 'context-menu-accent-custom[\s\S]*?<span>Custom color…</span>[\s\S]*?context-menu-accent-dominant[\s\S]*?<span>Dominant color</span>' `
  -Message "Accent menu must expose a Dominant color button directly under Custom color."

Assert-Matches `
  -Haystack $source `
  -Pattern '\.querySelector\("\.context-menu-accent-dominant"\)[\s\S]*?addEventListener\("click", async \(e\) => \{[\s\S]*?await this\.applyDominantAccentForEngine\(engineId, \{[\s\S]*?force: true,[\s\S]*?closeMenu: true,[\s\S]*?\}\);' `
  -Message "Dominant color button must force-refresh and apply the selected engine favicon color."

Assert-Matches `
  -Haystack $source `
  -Pattern 'applyDominantAccentForEngine\([\s\S]*?engineId,[\s\S]*?\{ force = true, closeMenu = true \} = \{\},[\s\S]*?\) \{[\s\S]*?await this\.refreshEngineFaviconForDominantColor\(engine\);[\s\S]*?await this\._getFaviconDominantRgb\(faviconUrl, \{ force \}\);[\s\S]*?engine\.faviconDominantRgb = normalizedDominant;[\s\S]*?this\.setEngineAccent\(engine\.id, normalizedDominant, \{ source: "favicon" \}\);' `
  -Message "Dominant color button must scan the refreshed favicon and apply it as a favicon-sourced accent."

Assert-Matches `
  -Haystack $source `
  -Pattern 'setEngineAccent\(engineId, rgbString, \{ source = "custom" \} = \{\}\) \{[\s\S]*?accentRgbSource: source,' `
  -Message "Manual search accent selections must be tracked separately from favicon-derived accents."

Assert-Matches `
  -Haystack $source `
  -Pattern '_renderAccentPaletteForEngine\([\s\S]*?engineId,[\s\S]*?\{ refreshDominant = false, applyDominant = false \} = \{\},[\s\S]*?\) \{[\s\S]*?const faviconUrl =[\s\S]*?engine\.cachedFavicon \|\|[\s\S]*?engine\.favicon \|\|[\s\S]*?this\.getFaviconUrlFromTemplate\(engine\.url\);' `
  -Message "Dominant favicon swatch must be computed from the same icon shown for each custom search."

Assert-NotMatches `
  -Haystack $source `
  -Pattern '_renderAccentPaletteForEngine\([\s\S]*?const cachedDominant = this\.getCachedFaviconDominantRgb\(faviconUrl\);[\s\S]*?const initialDominant = cachedDominant \|\| rainbow29\[0\] \|\| "255, 255, 255";' `
  -Message "Dominant favicon swatch must not fall back to a generated palette color."

Assert-Matches `
  -Haystack $source `
  -Pattern 'const knownDominant =[\s\S]*?cachedDominant \|\|[\s\S]*?this\._normalizeOptionalRgbString\(engine\.faviconDominantRgb\);' `
  -Message "Dominant swatch must use stored faviconDominantRgb, not the currently selected accent."

Assert-Matches `
  -Haystack $source `
  -Pattern 'if \(knownDominant\) \{[\s\S]*?this\._renderSwatches\(paletteEl, \[\.\.\.rainbow29, knownDominant\], \{[\s\S]*?dominantIndex: rainbow29\.length,[\s\S]*?\}\);[\s\S]*?\} else \{[\s\S]*?this\._renderSwatches\(paletteEl, rainbow29\);[\s\S]*?\}' `
  -Message "Known favicon-derived dominant color must be shown in the bottom-right swatch while refresh runs."

Assert-Matches `
  -Haystack $source `
  -Pattern '_renderAccentPaletteForEngine\([\s\S]*?this\._renderSwatches\(paletteEl, \[\.\.\.rainbow29, dominant\], \{[\s\S]*?dominantIndex: rainbow29\.length,[\s\S]*?\}\);' `
  -Message "Freshly scanned dominant favicon color must render in the bottom-right swatch."

Assert-Matches `
  -Haystack $source `
  -Pattern '_renderSwatches\(paletteEl, rgbList, \{ dominantIndex = -1 \} = \{\}\) \{[\s\S]*?btn\.setAttribute\([\s\S]*?"title",[\s\S]*?idx === dominantIndex \? "Dominant favicon color" : "",[\s\S]*?\);' `
  -Message "Only the configured bottom-right dominant swatch may be labeled as the dominant favicon color."

Assert-Matches `
  -Haystack $source `
  -Pattern 'loadCachedFaviconForEngine\(engine, btnEl\) \{[\s\S]*?engine\.cachedFavicon = cached;[\s\S]*?String\(this\.selectedId\) === String\(engine\.id\)[\s\S]*?engine\.accentRgbSource !== "custom"[\s\S]*?this\._ensureDefaultAccentForEngine\(engine\)\.catch\(\(\) => \{\}\);' `
  -Message "Selected engine must refresh its accent after async cached favicon load."

Assert-Matches `
  -Haystack $source `
  -Pattern 'applyEngineAccent\(engine\) \{[\s\S]*?this\.shell\.style\.setProperty\("--sb-accent-rgb", rgb\);[\s\S]*?engine\.accentRgbSource !== "custom"[\s\S]*?this\._ensureDefaultAccentForEngine\(engine\)\.catch\(\(\) => \{\}\);' `
  -Message "Applying a non-custom search engine accent must refresh stale stored colors from the favicon."

Assert-Matches `
  -Haystack $source `
  -Pattern 'addCustomSearchFromModal\(\) \{[\s\S]*?this\.searches\.push\(entry\);[\s\S]*?this\.selectedId = entry\.id;[\s\S]*?await this\._ensureDefaultAccentForEngine\(entry, \{ force: true \}\);[\s\S]*?this\.render\(\);' `
  -Message "Adding a new custom search engine must set the fresh favicon dominant color as the default accent before final render."

Assert-Matches `
  -Haystack $source `
  -Pattern 'updateCustomSearchFromModal\(\) \{[\s\S]*?const faviconChanged = Boolean\(this\.pendingFaviconDataUrl\) \|\| urlChanged;[\s\S]*?this\._ensureDefaultAccentForEngine\(this\.searches\[idx\], \{[\s\S]*?force: faviconChanged,[\s\S]*?\}\)\.catch\(\(\) => \{\}\);' `
  -Message "Saving an edited search favicon or URL must recompute automatic accent from a fresh dominant color."

Assert-Matches `
  -Haystack $source `
  -Pattern 'showContextMenu\(x, y, engineId\) \{[\s\S]*?this\._renderAccentPaletteForEngine\(engineId, \{[\s\S]*?refreshDominant: true,[\s\S]*?applyDominant: true,[\s\S]*?\}\);' `
  -Message "Right-clicking a custom search engine must force-refresh its dominant favicon color palette."

Assert-Matches `
  -Haystack $source `
  -Pattern '_getFaviconDominantRgb\(faviconUrl, \{ force = false \} = \{\}\) \{[\s\S]*?if \(force\) \{[\s\S]*?this\.faviconDominantCache\.delete\(key\);[\s\S]*?\}' `
  -Message "Dominant favicon color refresh must bypass the stale in-memory dominant-color cache."

Assert-Matches `
  -Haystack $source `
  -Pattern '_getFaviconDominantRgb\(faviconUrl, \{ force = false \} = \{\}\) \{[\s\S]*?this\._computeFaviconDominantRgb\(key, \{ force \}\)' `
  -Message "Forced dominant-color refresh must pass through to the favicon image fetcher."

Assert-Matches `
  -Haystack $source `
  -Pattern '_createReadableFaviconSampleUrl\(url, \{ force = false \} = \{\}\) \{[\s\S]*?if \(force\)[\s\S]*?searchParams\.set\([\s\S]*?"_sb_favicon_color_refresh"[\s\S]*?fetchUrl = parsedUrl\.toString\(\);[\s\S]*?const resp = await fetch\(fetchUrl, \{[\s\S]*?cache: force \? "reload" : "force-cache"[\s\S]*?\}\);[\s\S]*?const objectUrl = URL\.createObjectURL\(blob\);[\s\S]*?await this\._normalizeFaviconSampleToPngUrl\(objectUrl\)' `
  -Message "Right-click dominant-color refresh must fetch favicon bytes and normalize them before sampling pixels."

Assert-Matches `
  -Haystack $source `
  -Pattern '_normalizeFaviconSampleToPngUrl\(sourceUrl\) \{[\s\S]*?const img = new Image\(\);[\s\S]*?ctx\.drawImage\(img,[\s\S]*?canvas\.toBlob\([\s\S]*?URL\.createObjectURL\(pngBlob\)[\s\S]*?"image/png"' `
  -Message "Favicon dominant-color sampling must decode ICO/SVG favicons into PNG before Color Thief reads pixels."

Assert-Matches `
  -Haystack $source `
  -Pattern '_computeFaviconDominantRgb\(url, \{ force = false \} = \{\}\) \{[\s\S]*?const sample = await this\._createReadableFaviconSample\(url, \{ force \}\);[\s\S]*?imageData = sample\.ctx\.getImageData\([\s\S]*?this\._getDominantFaviconRgbFromImageData\(imageData\)' `
  -Message "Dominant-color scanner must use the local decoded ImageData implementation."

Assert-Matches `
  -Haystack $source `
  -Pattern '_getDominantFaviconRgbFromImageData\(imageData\) \{[\s\S]*?this\._pickDominantFaviconRgb\(pixels, \{[\s\S]*?ignoreNearWhite: true,[\s\S]*?ignoreNearBlack: true,[\s\S]*?\}\) \|\|[\s\S]*?this\._pickDominantFaviconRgb\(pixels, \{[\s\S]*?ignoreNearWhite: false,[\s\S]*?ignoreNearBlack: false,[\s\S]*?\}\) \|\|[\s\S]*?minAlpha: 1' `
  -Message "Local dominant-color scanner must retry without black/white filtering before failing."

Assert-Matches `
  -Haystack $source `
  -Pattern '_pickDominantFaviconRgb\([\s\S]*?pixels,[\s\S]*?ignoreNearWhite = true,[\s\S]*?ignoreNearBlack = true,[\s\S]*?\} = \{\},[\s\S]*?\) \{[\s\S]*?const bucketKey = \[[\s\S]*?Math\.round\(r / divider\)[\s\S]*?buckets\.set\(bucketKey, bucket\)[\s\S]*?return best\?\.rgb \|\| null;' `
  -Message "Local dominant-color scanner must bucket favicon pixels without vendor libraries."

Assert-Matches `
  -Haystack $source `
  -Pattern '_pickDominantFaviconRgb\(pixels, \{[\s\S]*?if \(a < minAlpha\) \{[\s\S]*?continue;[\s\S]*?\}[\s\S]*?if \(ignoreNearWhite && this\._isNearWhiteRgb\(r, g, b\)\) \{[\s\S]*?continue;[\s\S]*?\}[\s\S]*?if \(ignoreNearBlack && this\._isNearBlackRgb\(r, g, b\)\) \{[\s\S]*?continue;' `
  -Message "Strict dominant-color pass must filter only transparent and near-background pixels."

Assert-Matches `
  -Haystack $source `
  -Pattern 'this\.faviconDominantFailureReason = null;' `
  -Message "Searchbar must track the exact latest favicon dominant-color failure reason."

Assert-Matches `
  -Haystack $source `
  -Pattern '_setFaviconDominantFailure\(message\) \{[\s\S]*?this\.faviconDominantFailureReason = String\(message \|\| ""\);[\s\S]*?return null;' `
  -Message "Searchbar must centralize dominant-color failure messages."

Assert-Matches `
  -Haystack $source `
  -Pattern 'this\.notify\([\s\S]*?this\.faviconDominantFailureReason \|\|[\s\S]*?"Could not read the favicon dominant color\.",[\s\S]*?"error"[\s\S]*?\);' `
  -Message "Dominant color button must show the branch-specific failure reason."

foreach ($failureMessage in @(
  "Favicon dominant color failed: favicon fetch failed.",
  "Favicon dominant color failed: favicon image decode failed.",
  "Favicon dominant color failed: canvas is unavailable.",
  "Favicon dominant color failed: canvas pixel read failed.",
  "Favicon dominant color failed: favicon has no visible pixels."
)) {
  Assert-Matches `
    -Haystack $source `
    -Pattern ([regex]::Escape($failureMessage)) `
    -Message "Dominant-color scan must expose specific failure message: $failureMessage"
}

Assert-NotMatches `
  -Haystack $source `
  -Pattern 'ColorThief|FastAverageColor|no usable color found after filtering favicon pixels' `
  -Message "Searchbar dominant-color scanner must not depend on vendor color libraries or the old all-pixels-filtered error."

if (Test-Path $colorThiefPath) {
  throw "Bundled Color Thief adapter must be deleted from js/vendor."
}

if (Test-Path $fastAverageColorPath) {
  throw "Bundled fast-average-color adapter must be deleted from js/vendor."
}

Assert-NotMatches `
  -Haystack $source `
  -Pattern '_computeFaviconDominantRgb\(url, \{ force = false \} = \{\}\) \{[\s\S]*?getColorAsync\(fetchUrl,' `
  -Message "Dominant-color scanner must not pass remote Google favicon URLs directly to image-color libraries."

Assert-Matches `
  -Haystack $source `
  -Pattern 'refreshEngineFaviconForDominantColor\(engine\) \{[\s\S]*?window\.faviconCache\.refreshFromGoogle\([\s\S]*?engine\.url,[\s\S]*?"search"[\s\S]*?\)[\s\S]*?engine\.cachedFavicon = refreshedFavicon;' `
  -Message "Right-click dominant-color refresh must refresh the custom search favicon before scanning it."

Assert-Matches `
  -Haystack $source `
  -Pattern '_renderAccentPaletteForEngine\([\s\S]*?engineId,[\s\S]*?\{ refreshDominant = false, applyDominant = false \} = \{\},[\s\S]*?\) \{[\s\S]*?this\._getFaviconDominantRgb\(faviconUrl, \{[\s\S]*?force: refreshDominant,[\s\S]*?\}\);[\s\S]*?if \(applyDominant && engine\.accentRgbSource !== "custom"\) \{[\s\S]*?const normalizedDominant = this\._normalizeRgbString\(dominant\);[\s\S]*?this\.setEngineAccent\(engine\.id, normalizedDominant, \{ source: "favicon" \}\);' `
  -Message "Dominant favicon palette refresh must promote the refreshed color to the engine default accent."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.search-bar-input \{[\s\S]*?caret-color: rgb\(var\(--sb-accent-rgb\)\);' `
  -Message "Search bar typing caret must follow the selected engine accent color."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.search-bar-btn \{[\s\S]*?box-shadow var\(--transition-fast\);' `
  -Message "Search bar buttons must animate accent glow changes."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.search-bar-btn:hover \{[\s\S]*?box-shadow: 0 0 0 3px rgba\(var\(--sb-accent-rgb\), 0\.[0-9]+\);' `
  -Message "Search bar button hover glow must use the selected engine accent color."

Write-Host "Search bar engine accent regression tests passed."
