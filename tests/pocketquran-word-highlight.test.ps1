$ErrorActionPreference = "Stop"

$sourcePath = Join-Path $PSScriptRoot "..\js\pocketquran.js"
$source = Get-Content -Path $sourcePath -Raw
$stylesPath = Join-Path $PSScriptRoot "..\css\styles.css"
$styles = Get-Content -Path $stylesPath -Raw
$storagePath = Join-Path $PSScriptRoot "..\js\storage.js"
$storage = Get-Content -Path $storagePath -Raw
$settingsPath = Join-Path $PSScriptRoot "..\js\settings.js"
$settings = Get-Content -Path $settingsPath -Raw
$indexPath = Join-Path $PSScriptRoot "..\index.html"
$index = Get-Content -Path $indexPath -Raw

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

Assert-Contains `
  -Haystack $source `
  -Needle 'getRecitationTimingUrl(surah' `
  -Message "Pocket Quran needs a Quran.com by_chapter timing URL builder."

Assert-Matches `
  -Haystack $source `
  -Pattern 'getRecitationTimingUrl\(surah[\s\S]*?/recitations/\$\{(?:this\._activeReciterId|reciterId)\}/by_chapter/\$\{surah\}\?fields=segments,duration&per_page=50' `
  -Message "Timing URL must request Quran.com segments and duration for the full surah."

Assert-Contains `
  -Haystack $source `
  -Needle 'fetchRecitationTimingsForSurah(surah)' `
  -Message "Pocket Quran needs a cached timing fetch for the active reciter and surah."

Assert-Matches `
  -Haystack $source `
  -Pattern 'fetchRecitationTimingsForSurah\(surah\)[\s\S]*?_recitationTimingsCache[\s\S]*?this\.fetchJson\(url,[\s\S]*?audio_files[\s\S]*?segments' `
  -Message "Timing fetch must cache Quran.com audio_files that include segments."

Assert-Contains `
  -Haystack $source `
  -Needle 'normalizeRecitationSegments(segments)' `
  -Message "Pocket Quran needs a pure normalizer for Quran.com word timing segments."

Assert-Matches `
  -Haystack $source `
  -Pattern 'normalizeRecitationSegments\(segments\)[\s\S]*?wordStart[\s\S]*?wordEnd[\s\S]*?fromMs[\s\S]*?toMs' `
  -Message "Segment normalizer must expose wordStart, wordEnd, fromMs, and toMs."

Assert-Contains `
  -Haystack $source `
  -Needle 'renderArabicWordSpans(container, text, verseKey)' `
  -Message "Arabic ayah rendering must wrap words in addressable spans."

Assert-Contains `
  -Haystack $source `
  -Needle 'renderTajweedWordSpans(container, html, verseKey, plainText = "")' `
  -Message "Tajweed ayah rendering must preserve coloring while wrapping words in addressable spans."

Assert-Matches `
  -Haystack $source `
  -Pattern 'renderArabicWordSpans\(container, text, verseKey\)[\s\S]*?pq-recitation-word[\s\S]*?dataset\.wordIndex[\s\S]*?dataset\.verseKey' `
  -Message "Word spans need class, word index, and verse key data attributes."

Assert-Matches `
  -Haystack $source `
  -Pattern 'isAyahNumberMarkerText\(text\)[\s\S]*?\\u0660-\\u0669[\s\S]*?\\u06F0-\\u06F9[\s\S]*?0-9[\s\S]*?return' `
  -Message "Pocket Quran must detect trailing ayah number markers."

Assert-Matches `
  -Haystack $source `
  -Pattern 'renderArabicWordSpans\(container, text, verseKey\)[\s\S]*?isAyahNumberMarkerText\(word\)[\s\S]*?appendAyahNumberMarker[\s\S]*?return' `
  -Message "Plain Arabic rendering must not wrap trailing ayah numbers as recitation words."

Assert-Matches `
  -Haystack $source `
  -Pattern 'renderTajweedWordSpans\(container, html, verseKey, plainText = ""\)[\s\S]*?const plainWords = this\.getPlainArabicRecitationWords\(plainText\)[\s\S]*?template\.innerHTML = html[\s\S]*?pq-recitation-word[\s\S]*?cloneNode\(true\)' `
  -Message "Tajweed word rendering must parse HTML, preserve Tajweed spans, and wrap recitable words."

Assert-Matches `
  -Haystack $source `
  -Pattern 'getPlainArabicRecitationWords\(text\)[\s\S]*?isAyahNumberMarkerText\(word\)[\s\S]*?normalizeArabicWordForRecitation' `
  -Message "Tajweed rendering must derive recitation word boundaries from plain Uthmani text, not Tajweed API spacing."

Assert-Matches `
  -Haystack $source `
  -Pattern 'appendTajweedNodeToRecitationWords\([\s\S]*?node,[\s\S]*?state,[\s\S]*?ancestors = \[\][\s\S]*?\)[\s\S]*?splitArabicTextClusters[\s\S]*?appendTajweedClusterToWord[\s\S]*?currentWordNormalized\.length >= targetWord\.normalized\.length' `
  -Message "Tajweed text must split styled chunks exactly on plain Uthmani word boundaries."

Assert-Matches `
  -Haystack $source `
  -Pattern 'renderTajweedWordSpans\(container, html, verseKey, plainText = ""\)[\s\S]*?isAyahNumberMarkerText\(part\)[\s\S]*?appendAyahNumberMarker[\s\S]*?isAyahNumberMarkerText\(node\.textContent\)[\s\S]*?appendAyahNumberMarker' `
  -Message "Tajweed rendering must not wrap trailing ayah numbers as recitation words."

Assert-Matches `
  -Haystack $source `
  -Pattern 'syncActiveRecitationWord\(\)[\s\S]*?isAyahNumberMarkerText\(wordEl\.textContent\)[\s\S]*?return;' `
  -Message "Sync must refuse to highlight ayah number markers even if markup accidentally has a recitation key."

Assert-Matches `
  -Haystack $source `
  -Pattern 'if \(tajweedText\) \{[\s\S]*?ar\.classList\.add\("tajweed-mode"\);[\s\S]*?this\.renderTajweedWordSpans\([\s\S]*?ar,[\s\S]*?tajweedText,[\s\S]*?verseKey,[\s\S]*?verse\?\.text_uthmani \|\| ""[\s\S]*?\);' `
  -Message "Tajweed mode must use word-span rendering instead of direct innerHTML."

Assert-Contains `
  -Haystack $source `
  -Needle 'syncActiveRecitationWord()' `
  -Message "Pocket Quran needs a playback-time sync method for active word highlighting."

Assert-Matches `
  -Haystack $source `
  -Pattern 'syncActiveRecitationWord\(\)[\s\S]*?currentTime \* 1000[\s\S]*?normalizeRecitationSegments[\s\S]*?data-recitation-key' `
  -Message "Sync method must map audio currentTime to Quran.com segments and DOM word spans."

Assert-Matches `
  -Haystack $source `
  -Pattern 'normalizeRecitationHighlightDelayMs\(value\)[\s\S]*?Math\.max\(-10000,\s*Math\.min\(10000[\s\S]*?return 0;' `
  -Message "Word highlighting delay must allow negative values before it is applied."

Assert-Matches `
  -Haystack $source `
  -Pattern 'this\._recitationWordHighlightLagMs\s*=\s*this\.normalizeRecitationHighlightDelayMs\([\s\S]*?pq\.reciterHighlighterDelayMs[\s\S]*?\);' `
  -Message "Word highlighting delay must load from Pocket Quran settings."

Assert-Matches `
  -Haystack $source `
  -Pattern 'Math\.max\([\s\S]*?this\._audioElement\.currentTime \* 1000[\s\S]*?this\._recitationWordHighlightLagMs' `
  -Message "Word highlighting must use the user-editable delay instead of a hard-coded lag."

Assert-Contains `
  -Haystack $storage `
  -Needle 'reciterHighlighterDelayMs: 0' `
  -Message "Pocket Quran highlighter delay must default to 0ms."

Assert-Contains `
  -Haystack $index `
  -Needle 'id="pocketQuranHighlighterDelay"' `
  -Message "Pocket Quran dashboard settings must expose a highlighter delay control."

Assert-Matches `
  -Haystack $index `
  -Pattern '<input[\s\S]*?type="number"[\s\S]*?id="pocketQuranHighlighterDelay"[\s\S]*?min="-10000"[\s\S]*?max="10000"[\s\S]*?step="25"' `
  -Message "Pocket Quran highlighter delay must be a number input that accepts negative milliseconds."

Assert-Contains `
  -Haystack $settings `
  -Needle 'pocketQuranHighlighterDelay' `
  -Message "Settings manager must wire the highlighter delay input."

Assert-Matches `
  -Haystack $settings `
  -Pattern 'reciterHighlighterDelayMs:\s*this\.clampNumber\([\s\S]*?pocketQuranHighlighterDelay[\s\S]*?-10000[\s\S]*?10000' `
  -Message "Saving settings must persist negative and positive highlighter delay values."

Assert-Matches `
  -Haystack $settings `
  -Pattern 'isOnlyPocketQuranHighlighterDelayChanged\(previousSettings, nextSettings\)[\s\S]*?reciterHighlighterDelayMs[\s\S]*?delete previousComparable\.pocketQuran\.reciterHighlighterDelayMs[\s\S]*?delete nextComparable\.pocketQuran\.reciterHighlighterDelayMs' `
  -Message "Settings manager must detect delay-only changes."

Assert-Matches `
  -Haystack $settings `
  -Pattern 'const isDelayOnlyPocketQuranSave\s*=\s*this\.isOnlyPocketQuranHighlighterDelayChanged\([\s\S]*?previousSettings[\s\S]*?settings[\s\S]*?\)[\s\S]*?if \(!isDelayOnlyPocketQuranSave\) \{[\s\S]*?this\.applySettings\(settings\);[\s\S]*?\}' `
  -Message "Saving only the highlighter delay must not run the full dashboard live refresh path."

Assert-Matches `
  -Haystack $source `
  -Pattern 'RECITATION_TIMING_RETRY_COOLDOWN_MS = \d+;[\s\S]*?failed: true[\s\S]*?retryAfter:[\s\S]*?Date\.now\(\)[\s\S]*?\+[\s\S]*?PocketQuranManager\.RECITATION_TIMING_RETRY_COOLDOWN_MS' `
  -Message "Failed or empty timing responses must be cached briefly to prevent fetch retry loops."

Assert-Matches `
  -Haystack $source `
  -Pattern 'syncActiveRecitationWord\(\)[\s\S]*?if \(!timing\) \{[\s\S]*?void this\.fetchRecitationTimingsForSurah\(surah\);[\s\S]*?return;[\s\S]*?\}' `
  -Message "Missing timing data must fetch once and wait for audio timeupdate instead of recursively resyncing."

Assert-Matches `
  -Haystack $source `
  -Pattern 'resetRecitationCaches\(\)[\s\S]*?_recitationTimingFetches = new Map\(\)' `
  -Message "Reciter changes must clear pending timing fetch state."

Assert-Contains `
  -Haystack $source `
  -Needle 'clearActiveRecitationWordHighlight()' `
  -Message "Pocket Quran must clear word highlights on pause/stop/fallback."

Assert-Matches `
  -Haystack $source `
  -Pattern 'attachAudioListeners\(audio\)[\s\S]*?timeupdate[\s\S]*?_onAudioTimeUpdate[\s\S]*?detachAudioListeners\(audio\)[\s\S]*?timeupdate[\s\S]*?_onAudioTimeUpdate' `
  -Message "Audio timeupdate listener must be attached and detached with swapped audio elements."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-recitation-word\.is-reciting \{[\s\S]*?background:[\s\S]*?border-radius:' `
  -Message "Currently recited words need a visible highlight style."

Write-Host "Pocket Quran word highlight regression tests passed."
