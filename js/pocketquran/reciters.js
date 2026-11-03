/**
 * PocketQuranManager: reciter list and audio urls.
 * Part of the class declared in js/pocketquran/index.js; load this after it.
 */
(function (prototype, members) {
  for (const name of Object.getOwnPropertyNames(members.prototype)) {
    if (name === "constructor") continue;
    Object.defineProperty(
      prototype,
      name,
      Object.getOwnPropertyDescriptor(members.prototype, name),
    );
  }
})(PocketQuranManager.prototype, class {

  async loadReciters() {
    try {
      this._reciters = await new PocketQuranCatalog(this.storage).reciters();
    } catch (e) {
      console.error("PocketQuran: failed to load reciters", e);
      // Provide a fallback list of common reciters
      this._reciters = [
        { id: 7, name: "Mishary Rashid Alafasy", style: null },
        { id: 1, name: "Abdul Basit Abdul Samad", style: "Murattal" },
        { id: 2, name: "Abdul Basit Abdul Samad", style: "Mujawwad" },
        { id: 3, name: "Abdur-Rahman as-Sudais", style: null },
        { id: 4, name: "Abu Bakr al-Shatri", style: null },
        { id: 5, name: "Hani ar-Rifai", style: null },
        { id: 6, name: "Mahmoud Khalil Al-Husary", style: null },
      ];
    }
  }

  getAudioUrl(surah, ayah) {
    // Format: https://api.quran.com/api/v4/recitations/{reciter_id}/by_ayah/{surah}:{ayah}
    // This returns audio_file info, but we can use verses.media CDN directly
    // CDN pattern: https://verses.quran.com/{reciter_relative_path}
    // Or use: https://api.quran.com/api/v4/chapter_recitations/{reciter_id}/{chapter_id}
    // For per-ayah audio, we use: /recitations/{reciter_id}/by_ayah/{verse_key}

    return `${PocketQuranManager.API_BASE}/recitations/${this._activeReciterId}/by_ayah/${surah}:${ayah}`;
  }

  resolveRecitationAudioUrl(url) {
    const raw = String(url || "").trim();
    if (!raw) return null;

    // Already absolute.
    if (/^https?:\/\//i.test(raw)) return raw;

    // Protocol-relative.
    if (raw.startsWith("//")) return `https:${raw}`;

    // Quran.com per-ayah endpoint returns relative paths hosted on verses.quran.com.
    const path = raw.replace(/^\/+/, "");
    return `https://verses.quran.com/${path}`;
  }

  async getChapterRecitationAudioUrl(surah) {
    const url = `${PocketQuranManager.API_BASE}/chapter_recitations/${this._activeReciterId}/${surah}`;
    const data = await this.fetchJson(url, { timeoutMs: 15000 });
    const audioUrl = data?.audio_file?.audio_url || data?.audio_file?.url;
    return this.resolveRecitationAudioUrl(audioUrl);
  }
});
