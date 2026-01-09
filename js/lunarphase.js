/**
 * Lunar Phase Manager
 * Computes and displays the current Moon phase.
 *
 * Notes:
 * - The Moon phase is fundamentally time-based; we optionally adjust the sampling time
 *   by longitude to reflect a location-based local-date boundary.
 * - No external APIs are required.
 */

class LunarPhaseManager {
  constructor(storage, prayerTimes) {
    this.storage = storage;
    this.prayerTimes = prayerTimes;

    this.card = document.getElementById("lunarPhaseCard");
    this.locationEl = document.getElementById("lunarPhaseLocation");
    this.moonEl = document.getElementById("lunarPhaseMoon");
    this.nameEl = document.getElementById("lunarPhaseName");
    this.metaEl = document.getElementById("lunarPhaseMeta");

    this._timer = null;
  }

  init() {
    if (!this.card) return;

    this.refresh();

    if (this._timer) window.clearInterval(this._timer);
    // Phase changes slowly; update periodically.
    this._timer = window.setInterval(() => this.refresh(), 30 * 60 * 1000);
  }

  refresh() {
    if (!this.card) return;

    const loc = this._resolveLocation();
    const longitude = Number.isFinite(Number(loc.longitude))
      ? Number(loc.longitude)
      : 0;

    const now = new Date();
    const data = this._computeLunarPhase(now, longitude);

    if (this.locationEl) {
      const city = (loc.city || "").trim();
      if (city) {
        this.locationEl.innerHTML = `<i data-lucide="map-pin"></i> ${city}`;
      } else if (
        Number.isFinite(Number(loc.latitude)) &&
        Number.isFinite(Number(loc.longitude))
      ) {
        this.locationEl.innerHTML = `<i data-lucide="map-pin"></i> ${Number(
          loc.latitude
        ).toFixed(2)}, ${Number(loc.longitude).toFixed(2)}`;
      } else {
        this.locationEl.innerHTML = '<i data-lucide="map-pin"></i> Location';
      }

      if (typeof window.renderLucideIcons === "function") {
        window.renderLucideIcons(this.locationEl);
      }
    }

    if (this.nameEl) this.nameEl.textContent = data.phaseName;

    if (this.metaEl) {
      const illumPct = Math.round(data.illumination * 100);
      this.metaEl.textContent = `${illumPct}% illuminated • Age ${data.ageDays.toFixed(
        1
      )} days`;
    }

    if (this.moonEl) {
      this.moonEl.innerHTML = this._renderMoonSvg(data.phaseFraction);
    }
  }

  _resolveLocation() {
    // Prefer the prayerTimes location object if available.
    try {
      if (
        this.prayerTimes &&
        typeof this.prayerTimes.getCurrentLocation === "function"
      ) {
        const loc = this.prayerTimes.getCurrentLocation();
        if (loc && (loc.latitude != null || loc.longitude != null)) return loc;
      }
    } catch (e) {
      // ignore
    }

    const settings = this.storage?.getSettings?.() || {};
    return {
      city: settings.city || "",
      latitude: settings.latitude,
      longitude: settings.longitude,
    };
  }

  _computeLunarPhase(date, longitudeDegrees) {
    // Longitude-based sampling adjustment (4 minutes per degree).
    const longitudeOffsetMs = (Number(longitudeDegrees) || 0) * 240000;
    const t = new Date(date.getTime() + longitudeOffsetMs);

    // Julian date from Unix epoch (UTC-based).
    const jd = t.getTime() / 86400000 + 2440587.5;

    // Reference new moon: 2000-01-06 18:14 UTC (approx), Julian date 2451550.1
    const jdRefNewMoon = 2451550.1;
    const synodicMonth = 29.530588853;

    let phase = (jd - jdRefNewMoon) / synodicMonth;
    phase = phase - Math.floor(phase);
    if (phase < 0) phase += 1;

    const ageDays = phase * synodicMonth;
    const illumination = 0.5 * (1 - Math.cos(2 * Math.PI * phase));

    return {
      phaseFraction: phase,
      ageDays,
      illumination,
      phaseName: this._phaseName(phase),
    };
  }

  _phaseName(phaseFraction) {
    const p = ((Number(phaseFraction) % 1) + 1) % 1;

    // 8-phase naming with soft boundaries.
    if (p < 0.0625 || p >= 0.9375) return "New Moon";
    if (p < 0.1875) return "Waxing Crescent";
    if (p < 0.3125) return "First Quarter";
    if (p < 0.4375) return "Waxing Gibbous";
    if (p < 0.5625) return "Full Moon";
    if (p < 0.6875) return "Waning Gibbous";
    if (p < 0.8125) return "Third Quarter";
    return "Waning Crescent";
  }

  _renderMoonSvg(phaseFraction) {
    const p = ((Number(phaseFraction) % 1) + 1) % 1;
    const r = 40;

    // This path describes the illuminated portion. It works by drawing a full disk arc,
    // then closing it with a second arc whose x-radius depends on phase.
    const rx = Math.max(0.01, r * Math.abs(Math.cos(2 * Math.PI * p)));
    const sweep = p < 0.5 ? 1 : 0;
    const d = `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${rx} ${r} 0 1 ${sweep} 0 ${-r} Z`;

    // Flip for waning so the lit side is consistent.
    const flip = p > 0.5 ? "scale(-1 1)" : "";

    return `
<svg viewBox="-50 -50 100 100" role="img" aria-label="Moon phase">
  <defs>
    <radialGradient id="moonLit" cx="35%" cy="35%" r="70%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.98)" />
      <stop offset="55%" stop-color="rgba(235,235,235,0.92)" />
      <stop offset="100%" stop-color="rgba(200,200,200,0.85)" />
    </radialGradient>
    <radialGradient id="moonDark" cx="35%" cy="35%" r="75%">
      <stop offset="0%" stop-color="rgba(40,40,55,0.95)" />
      <stop offset="100%" stop-color="rgba(10,10,18,0.98)" />
    </radialGradient>
    <filter id="moonGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.45)" />
      <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="rgba(255,255,255,0.08)" />
    </filter>
  </defs>

  <g filter="url(#moonGlow)">
    <circle cx="0" cy="0" r="${r}" fill="url(#moonDark)" />
    <g transform="${flip}">
      <path d="${d}" fill="url(#moonLit)" />
    </g>

    <!-- subtle crater texture -->
    <g opacity="0.18" fill="rgba(0,0,0,0.6)">
      <circle cx="-14" cy="-10" r="4" />
      <circle cx="-6" cy="12" r="3" />
      <circle cx="18" cy="6" r="2.5" />
    </g>
  </g>
</svg>
`;
  }
}
