$ErrorActionPreference = "Stop"

$sourcePath = Join-Path $PSScriptRoot "..\js\pocketquran.js"
$source = Get-Content -Path $sourcePath -Raw
$stylesPath = Join-Path $PSScriptRoot "..\css\styles.css"
$styles = Get-Content -Path $stylesPath -Raw
$indexPath = Join-Path $PSScriptRoot "..\index.html"
$index = Get-Content -Path $indexPath -Raw
$storagePath = Join-Path $PSScriptRoot "..\js\storage.js"
$storage = Get-Content -Path $storagePath -Raw
$settingsPath = Join-Path $PSScriptRoot "..\js\settings.js"
$settingsSource = Get-Content -Path $settingsPath -Raw
$popupPath = Join-Path $PSScriptRoot "..\js\popup.js"
$popupSource = Get-Content -Path $popupPath -Raw
$baseManagerPath = Join-Path $PSScriptRoot "..\js\base-manager.js"
$baseManagerSource = Get-Content -Path $baseManagerPath -Raw
$serviceWorkerPath = Join-Path $PSScriptRoot "..\js\service-worker.js"
$serviceWorkerSource = Get-Content -Path $serviceWorkerPath -Raw

function Assert-Contains {
  param(
    [string] $Haystack,
    [string] $Needle,
    [string] $Message
  )

  if (-not $Haystack.Contains($Needle)) {
    throw $Message
  }
}

function Assert-NotContains {
  param(
    [string] $Haystack,
    [string] $Needle,
    [string] $Message
  )

  if ($Haystack.Contains($Needle)) {
    throw $Message
  }
}

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

Assert-Contains `
  -Haystack $source `
  -Needle 'raw.includes("/search")' `
  -Message "Quran.com search endpoint must be cacheable in IndexedDB."

Assert-Contains `
  -Haystack $source `
  -Needle 'getSearchApiUrl(query, translationId, page = 1)' `
  -Message "Pocket Quran search needs a stable Quran.com search API URL builder."

Assert-Contains `
  -Haystack $source `
  -Needle 'buildPocketQuranSearchResults(query, verses)' `
  -Message "Pocket Quran search needs a pure result builder."

Assert-Contains `
  -Haystack $source `
  -Needle 'createPocketQuranSearchButton()' `
  -Message "Pocket Quran header needs a search button."

Assert-Contains `
  -Haystack $source `
  -Needle 'pq-search-progress-ring' `
  -Message "Pocket Quran search loading needs a cheap circular progress ring."

Assert-Contains `
  -Haystack $source `
  -Needle 'getFallbackTranslationSearchResults(query, translationId)' `
  -Message "Pocket Quran search needs full-translation fallback for Quran.com zero-hit common words."

Assert-Contains `
  -Haystack $source `
  -Needle 'appendHighlightedText(container, text, query)' `
  -Message "Pocket Quran search results need text highlighting."

Assert-Contains `
  -Haystack $source `
  -Needle 'const perPage = 100;' `
  -Message "Pocket Quran search results need 100 results per page pagination."

Assert-Contains `
  -Haystack $source `
  -Needle 'renderPocketQuranSearchPagination(totalPages, currentPage)' `
  -Message "Pocket Quran search needs pagination controls."

Assert-Contains `
  -Haystack $source `
  -Needle 'modal.classList.add("active")' `
  -Message "Pocket Quran search modal must use the existing active modal visibility class."

Assert-NotContains `
  -Haystack $styles `
  -Needle '.pq-search-result:hover' `
  -Message "Pocket Quran search results must not highlight on mouse hover."

Assert-Matches `
  -Haystack $source `
  -Pattern 'const item = document\.createElement\("div"\);[\s\S]*?item\.className = "pq-search-result";' `
  -Message "Pocket Quran search result rows must be selectable non-button containers."

Assert-NotMatches `
  -Haystack $source `
  -Pattern 'item\.addEventListener\("click",\s*\(\) =>\s*this\.goToPocketQuranSearchResult\(result\)' `
  -Message "Pocket Quran search result rows must not navigate when clicked."

Assert-Matches `
  -Haystack $source `
  -Pattern 'const meta = document\.createElement\("div"\);[\s\S]*?meta\.className = "pq-search-result-meta";' `
  -Message "Pocket Quran search result meta must be a selectable container."

Assert-Contains `
  -Haystack $source `
  -Needle 'pq-search-result-meta-icon' `
  -Message "Pocket Quran search result meta needs an open ayah icon."

Assert-Matches `
  -Haystack $source `
  -Pattern 'const metaIcon = document\.createElement\("button"\);[\s\S]*?metaIcon\.addEventListener\("click",\s*\(\) =>\s*this\.goToPocketQuranSearchResult\(result\)' `
  -Message "Pocket Quran search result icon must own ayah navigation."

Assert-Contains `
  -Haystack $source `
  -Needle 'pq-search-result-copy' `
  -Message "Pocket Quran search results need an ayah copy button."

Assert-Matches `
  -Haystack $source `
  -Pattern 'copyButton\.addEventListener\("click", async \(e\) =>[\s\S]*?this\.copyPocketQuranAyah\(' `
  -Message "Pocket Quran search result copy button must copy the ayah."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-search-result \{[\s\S]*?user-select: text;' `
  -Message "Pocket Quran search result rows must allow text selection."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-search-result-meta-text \{[\s\S]*?user-select: text;' `
  -Message "Pocket Quran search result meta text must allow text selection."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-search-result-copy \{[\s\S]*?margin-inline-start: auto;' `
  -Message "Pocket Quran search result copy button must hug the right border."

Assert-Matches `
  -Haystack $source `
  -Pattern 'isTajweedAllowedForFont\(fontFamily\) \{[\s\S]*?return f\.startsWith\("KFGQPC "\);' `
  -Message "Pocket Quran Tajweed must only be available for KFGQPC Arabic fonts."

Assert-Matches `
  -Haystack $popupSource `
  -Pattern 'isPocketQuranTajweedAllowedForFont\(fontFamily\) \{[\s\S]*?startsWith\(\s*"KFGQPC ",' `
  -Message "Pocket Quran popup Tajweed must only be available for KFGQPC Arabic fonts."

Assert-Matches `
  -Haystack $popupSource `
  -Pattern 'isTajweedMode: pqSettings\.tajweedMode === true && isTajweedAllowed' `
  -Message "Pocket Quran popup fallback state must disable Tajweed for unsupported fonts."

Assert-Matches `
  -Haystack $popupSource `
  -Pattern 'popupPqMiniTajweedToggle\.disabled = !isTajweedAllowed;' `
  -Message "Pocket Quran popup Tajweed toggle must be disabled for unsupported fonts."

Assert-Matches `
  -Haystack $popupSource `
  -Pattern 'persistPocketQuranPopupTypography\(\{ arabicFontFamily: selectedFont \}\);[\s\S]*?if \(!isPocketQuranTajweedAllowedForFont\(selectedFont\)\) \{[\s\S]*?persistPocketQuranSettingsPatch\(\{ tajweedMode: false \}\);' `
  -Message "Pocket Quran popup font selection must force Tajweed off for unsupported fonts."

Assert-Matches `
  -Haystack $source `
  -Pattern 'toggleTajweedMode\(\) \{[\s\S]*?this\.refreshRenderedAyahs\(\{ preserveScroll: true \}\);[\s\S]*?this\.refreshSurahHeaderMeta\(\);' `
  -Message "Pocket Quran Tajweed toggle must immediately refresh rendered ayahs."

Assert-Matches `
  -Haystack $source `
  -Pattern 'disableTajweedMode\(\) \{[\s\S]*?const wasEnabled = this\._isTajweedMode === true;[\s\S]*?this\.refreshRenderedAyahs\(\{ preserveScroll: true \}\);' `
  -Message "Pocket Quran disabling Tajweed must immediately refresh rendered ayahs."

Assert-Matches `
  -Haystack $source `
  -Pattern 'renderVisibleAyahs\(opts = \{\}\) \{[\s\S]*?const force = opts\?\.force === true;' `
  -Message "Pocket Quran rendered ayahs need a forced refresh path."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pocket-quran-header\.pq-has-recitation-controls \{[\s\S]*?display: grid;[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto;' `
  -Message "Pocket Quran header with recitation controls must use two-column grid layout."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pocket-quran-header\.pq-has-recitation-controls[\s\S]*?\.pq-recitation-controls:not\(\.pq-recitation-controls-floating\) \{[\s\S]*?grid-column: 2;[\s\S]*?grid-row: 2;[\s\S]*?justify-self: end;' `
  -Message "Pocket Quran recitation controls must sit below the header actions without spanning full width."

Assert-Matches `
  -Haystack $source `
  -Pattern 'const actions = header\.querySelector\("\.card-header-actions"\);[\s\S]*?if \(actions\) \{[\s\S]*?actions\.after\(this\._headerControlsBox\);' `
  -Message "Pocket Quran recitation controls must be placed after card header actions."

Assert-Matches `
  -Haystack $baseManagerSource `
  -Pattern 'resolveResourceUrl\(url\) \{[\s\S]*?chrome\.runtime\?\.getURL[\s\S]*?return chrome\.runtime\.getURL\(raw\.replace' `
  -Message "BaseManager relative resource fetches must resolve through extension URLs."

Assert-Matches `
  -Haystack $baseManagerSource `
  -Pattern 'fetchTextResource\([\s\S]*?fetch\(this\.resolveResourceUrl\(url\), \{ cache \}\)' `
  -Message "BaseManager text fetches must use resolved resource URLs."

Assert-Contains `
  -Haystack $storage `
  -Needle 'copyIncludeArabic: false' `
  -Message "Pocket Quran ayah copy should omit Arabic by default."

Assert-Matches `
  -Haystack $index `
  -Pattern 'id="pocketQuranSettingAyahCopy"[\s\S]*?id="pocketQuranSettingTajweedColors"' `
  -Message "Pocket Quran ayah copy setting must appear above Tajweed Colors."

Assert-Contains `
  -Haystack $source `
  -Needle 'badge.textContent = `${surah}:${ayahNumber}`' `
  -Message "Pocket Quran ayah badge must show Surah:Ayah."

Assert-Contains `
  -Haystack $source `
  -Needle 'copyBadge.addEventListener("click"' `
  -Message "Pocket Quran copy badge must own copy click behavior."

Assert-Contains `
  -Haystack $source `
  -Needle 'copyPocketQuranAyah(verse, surah, ayahNumber)' `
  -Message "Pocket Quran ayah badge must call ayah copy behavior."

Assert-Contains `
  -Haystack $source `
  -Needle 'formatPocketQuranAyahCopy(verse, surah, ayahNumber)' `
  -Message "Pocket Quran needs a dedicated ayah copy formatter."

Assert-Matches `
  -Haystack $source `
  -Pattern 'const controlsStack = document\.createElement\("div"\);[\s\S]*?controlsStack\.appendChild\(starBtn\);[\s\S]*?controlsStack\.appendChild\(playBtn\);[\s\S]*?controlsStack\.appendChild\(copyBadge\);[\s\S]*?ayahEl\.appendChild\(controlsStack\);[\s\S]*?ayahEl\.appendChild\(badge\);' `
  -Message "Pocket Quran must render copy badge bottom-left and Surah:Ayah badge bottom-right."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pocket-quran-ayah-badge \{\s*position: absolute;\s*right: var\(--spacing-md\);\s*top: calc\(var\(--spacing-md\) \+ var\(--pq-ayah-badge-align-offset, 0px\)\);' `
  -Message "Pocket Quran Surah:Ayah badge must stay top-right."

Assert-Contains `
  -Haystack $source `
  -Needle '--pq-ayah-badge-align-offset' `
  -Message "Pocket Quran Surah:Ayah badge alignment must update with Arabic font size."

Assert-Matches `
  -Haystack $styles `
  -Pattern 'top: calc\(var\(--spacing-md\) \+ var\(--pq-ayah-badge-align-offset, 0px\)\);' `
  -Message "Pocket Quran Surah:Ayah badge top must follow the Arabic first-line offset."

Assert-Contains `
  -Haystack $source `
  -Needle 'pocket-quran-ayah-copy-badge-icon' `
  -Message "Pocket Quran copy badge needs a visible copy icon."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pocket-quran-ayah-copy-badge \{[\s\S]*?position: static;' `
  -Message "Pocket Quran copy badge must stay in the bottom-left controls stack."

Assert-Contains `
  -Haystack $source `
  -Needle 'const copied = await this.copyPocketQuranAyah(verse, surah, ayahNumber)' `
  -Message "Pocket Quran copy badge must wait for successful copy before feedback."

Assert-Contains `
  -Haystack $source `
  -Needle 'this.showPocketQuranCopyIndicator(copyBadge)' `
  -Message "Pocket Quran copy badge must show a cheap success indicator."

Assert-Contains `
  -Haystack $source `
  -Needle 'return true;' `
  -Message "Pocket Quran copy helper must report successful copies."

Assert-Contains `
  -Haystack $styles `
  -Needle '.pocket-quran-ayah-copy-badge.copied' `
  -Message "Pocket Quran copy badge needs a copied success state."

Assert-NotContains `
  -Haystack $source `
  -Needle 'preserveVirtualScrollAnchor(anchor)' `
  -Message "Pocket Quran full-surah rendering must not rewrite scrollTop after idle measurement."

Assert-Contains `
  -Haystack $source `
  -Needle 'this._renderedRange = { start: 0, end: total - 1 };' `
  -Message "Pocket Quran must render the whole active surah instead of a moving window."

Assert-Contains `
  -Haystack $source `
  -Needle 'this._virtualContent.style.transform = "none";' `
  -Message "Pocket Quran full-surah rendering must not translate rendered ayahs."

Assert-Contains `
  -Haystack $source `
  -Needle 'containerRect.top +' `
  -Message "Pocket Quran active ayah detection should use rendered DOM position."

Assert-Contains `
  -Haystack $storage `
  -Needle 'getCoordinateExample()' `
  -Message "Storage must provide a one-time coordinate example value."

Assert-Contains `
  -Haystack $storage `
  -Needle 'generateCoordinateExample()' `
  -Message "Storage must generate valid randomized coordinate examples."

Assert-Contains `
  -Haystack $settingsSource `
  -Needle 'applyCoordinateExamples()' `
  -Message "Settings must apply stored randomized coordinate examples to coordinate UI."

Assert-Contains `
  -Haystack $popupSource `
  -Needle 'getPopupCoordinateExampleText()' `
  -Message "Popup coordinate paste fallback must use stored randomized examples."

Assert-Contains `
  -Haystack $serviceWorkerSource `
  -Needle 'getServiceWorkerCoordinateExample()' `
  -Message "Service worker default location must use a stored randomized coordinate."

Assert-NotContains `
  -Haystack $index `
  -Needle '21.4225' `
  -Message "Static coordinate examples must not leak in settings markup."

Assert-NotContains `
  -Haystack $settingsSource `
  -Needle '-7.918300911805475' `
  -Message "Settings clipboard fallback must not leak old static coordinate examples."

Assert-NotContains `
  -Haystack $popupSource `
  -Needle '-2.0104945156119673' `
  -Message "Popup clipboard fallback must not leak old static coordinate examples."

Assert-NotContains `
  -Haystack $serviceWorkerSource `
  -Needle 'Mecca (Default)' `
  -Message "Service worker must not use a fixed Mecca fallback location."
