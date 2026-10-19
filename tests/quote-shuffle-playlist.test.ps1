$ErrorActionPreference = "Stop"

$sourcePath = Join-Path $PSScriptRoot "..\js\quotes.js"
$source = Get-Content -Path $sourcePath -Raw

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
  -Needle 'this._quoteShufflePlaylist = [];' `
  -Message "Quote shuffle mode must keep an in-memory playlist for the current new-tab page instance."

Assert-Matches `
  -Haystack $source `
  -Pattern 'async init\(\) \{[\s\S]*?this\.resetQuoteShufflePlaylist\(\);[\s\S]*?this\.displayRandomQuote\(\);' `
  -Message "Quote shuffle playlist must be generated before the first quote displays on page load."

Assert-Matches `
  -Haystack $source `
  -Pattern 'displayRandomQuote\(\) \{[\s\S]*?this\.getNextQuoteFromShufflePlaylist\(quotes\)[\s\S]*?this\.setCurrentQuote\(newQuote, \{ pushToHistory: true \}\);' `
  -Message "Shuffle mode must advance through the page playlist instead of selecting a fresh random quote each click."

Assert-Matches `
  -Haystack $source `
  -Pattern 'showPreviousQuote\(\) \{[\s\S]*?if \(this\._quoteHistoryIndex > 0\)[\s\S]*?this\.setCurrentQuote\(q, \{ pushToHistory: false \}\);[\s\S]*?return;[\s\S]*?\}' `
  -Message "Previous quote must use existing history in shuffle mode, not generate a random quote."

Assert-Contains `
  -Haystack $source `
  -Needle 'getPreviousQuoteFromShufflePlaylist(quotes)' `
  -Message "Shuffle mode previous navigation must walk backward through the page playlist."

Assert-Matches `
  -Haystack $source `
  -Pattern 'getPreviousQuoteFromShufflePlaylist\(quotes\) \{[\s\S]*?this\._quoteShufflePlaylistIndex -= 1;[\s\S]*?this\._quoteShufflePlaylistIndex = this\._quoteShufflePlaylist\.length - 1;[\s\S]*?return this\._quoteShufflePlaylist\[this\._quoteShufflePlaylistIndex\];[\s\S]*?\}' `
  -Message "Shuffle mode previous navigation must wrap from the first playlist item to the last."

Assert-Matches `
  -Haystack $source `
  -Pattern 'showPreviousQuote\(\) \{[\s\S]*?this\.quoteShuffleEnabled !== false[\s\S]*?this\.getPreviousQuoteFromShufflePlaylist\(quotes\)[\s\S]*?this\.setCurrentQuote\(q, \{ pushToHistory: true \}\);[\s\S]*?return;[\s\S]*?\}' `
  -Message "Shuffle mode previous button must wrap through the generated playlist when history is at the beginning."

Assert-Matches `
  -Haystack $source `
  -Pattern 'showPreviousQuote\(\) \{[\s\S]*?let previousIndex =[\s\S]*?previousIndex -= 1;[\s\S]*?if \(previousIndex < 0\) \{[\s\S]*?previousIndex = quotes\.length - 1;[\s\S]*?\}[\s\S]*?this\.setCurrentQuote\(quotes\[previousIndex\], \{ pushToHistory: true \}\);' `
  -Message "Sequential previous navigation must wrap from the first quote to the last."

Assert-Matches `
  -Haystack $source `
  -Pattern 'showNextQuote\(\) \{[\s\S]*?const canForward =[\s\S]*?this\.setCurrentQuote\(q, \{ pushToHistory: false \}\);[\s\S]*?return;[\s\S]*?this\.displayRandomQuote\(\);' `
  -Message "Next quote must reuse forward history before advancing the shuffle playlist."

Write-Host "Quote shuffle playlist regression tests passed."
