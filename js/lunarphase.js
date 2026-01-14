/**
 * Lunar Phase Manager
 * Computes and displays the current Moon phase using a layered rendering model.
 *
 * Rendering Model (Layered Compositing):
 * - Layer 1: Dark background circle
 * - Layer 2: Moon texture (craters) rotated by `r` (disk rotation / parallactic angle)
 * - Layer 3: Shadow mask shaped by `i` (illumination) and rotated by `p` (position angle)
 *
 * Variables:
 * - `i` (0.0 - 1.0): Illumination fraction - how "fat" the lit portion is
 * - `p` (radians): Position angle of bright limb - which way the bright side points
 * - `r` (radians): Disk rotation - which way the lunar features are tilted
 *
 * Notes:
 * - The Moon phase is time-based and computed from Sun/Moon geometry at the instant.
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

    // Listen for icon theme changes
    document.addEventListener("md:icon-theme-change", () => {
      this.refresh();
    });
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
    const latitude = Number.isFinite(Number(loc.latitude))
      ? Number(loc.latitude)
      : 0;
    const longitude = Number.isFinite(Number(loc.longitude))
      ? Number(loc.longitude)
      : 0;

    const now = new Date();
    const data = this._computeLunarPhase(now, latitude, longitude);

    if (this.locationEl) {
      const city = (loc.city || "").trim();
      const pinIcon = this._getIcon("📍", { size: 14, inline: true });
      if (city) {
        this.locationEl.innerHTML = `${pinIcon} ${city}`;
      } else if (
        Number.isFinite(Number(loc.latitude)) &&
        Number.isFinite(Number(loc.longitude))
      ) {
        this.locationEl.innerHTML = `${pinIcon} ${Number(loc.latitude).toFixed(
          2
        )}, ${Number(loc.longitude).toFixed(2)}`;
      } else {
        this.locationEl.innerHTML = `${pinIcon} Location`;
      }
    }

    if (this.nameEl) this.nameEl.textContent = data.phaseName;

    if (this.metaEl) {
      const illumPct = Math.round(data.illumination * 100);
      const rotDeg = Math.round((data.diskRotation * 180) / Math.PI);
      this.metaEl.textContent = `${illumPct}% illum • Age ${data.ageDays.toFixed(
        1
      )}d • Tilt ${rotDeg}°`;
    }

    if (this.moonEl) {
      this.moonEl.innerHTML = this._renderMoonSvg(data);
    }
  }

  /**
   * Get icon based on current icon theme
   */
  _getIcon(emoji, options = {}) {
    if (window.dashboard?.iconThemes) {
      return window.dashboard.iconThemes.getIcon(emoji, options);
    }
    return emoji;
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

  /**
   * Compute lunar phase data including the three rendering parameters:
   * - i (illumination): 0-1 fraction of how much is lit
   * - p (position angle): angle of the bright limb in radians
   * - r (disk rotation): parallactic angle + axis rotation in radians
   */
  _computeLunarPhase(date, latitudeDegrees, longitudeDegrees) {
    // Julian date from Unix epoch (UTC-based).
    const jd = date.getTime() / 86400000 + 2440587.5;

    const synodicMonth = 29.530588853;

    // Calculate Moon and Sun positions for angles
    const moonPos = this._getMoonPosition(
      jd,
      latitudeDegrees,
      longitudeDegrees
    );
    const sunPos = this._getSunPosition(jd, latitudeDegrees, longitudeDegrees);

    // Angular separation between Sun and Moon (elongation)
    const dRA = sunPos.rightAscension - moonPos.rightAscension;
    const cosElongation =
      Math.sin(moonPos.declination) * Math.sin(sunPos.declination) +
      Math.cos(moonPos.declination) *
        Math.cos(sunPos.declination) *
        Math.cos(dRA);
    const elongation = Math.acos(Math.max(-1, Math.min(1, cosElongation)));

    // Phase angle from 0..2π using ecliptic longitude difference for waxing/waning
    const deltaLon = this._normalizeAngleRad(
      moonPos.eclipticLon - sunPos.eclipticLon
    );
    const phaseAngle =
      deltaLon <= Math.PI ? elongation : 2 * Math.PI - elongation;

    const phase = phaseAngle / (2 * Math.PI);
    const ageDays = phase * synodicMonth;

    // i = Illumination fraction (0 = new moon, 1 = full moon)
    const illumination = 0.5 * (1 - Math.cos(phaseAngle));

    // p = Position angle of bright limb
    // The angle from lunar north to the midpoint of the illuminated limb
    const positionAngle = this._calculatePositionAngle(moonPos, sunPos);

    // r = Disk rotation (parallactic angle)
    // How much the Moon appears rotated based on observer's latitude and Moon's position
    const diskRotation = this._calculateParallacticAngle(
      latitudeDegrees,
      moonPos.altitude,
      moonPos.azimuth
    );

    return {
      phaseFraction: phase,
      ageDays,
      illumination,
      positionAngle,
      diskRotation,
      phaseName: this._phaseName(phase),
    };
  }

  /**
   * Calculate approximate Moon position (altitude, azimuth, declination, right ascension)
   * Using simplified lunar ephemeris
   */
  _getMoonPosition(jd, latDeg, lonDeg) {
    const T = (jd - 2451545.0) / 36525; // Julian centuries from J2000.0

    // Mean longitude of the Moon
    const L0 = this._normalizeAngle(
      218.3164477 +
        481267.88123421 * T -
        0.0015786 * T * T +
        (T * T * T) / 538841
    );

    // Mean elongation of the Moon
    const D = this._normalizeAngle(
      297.8501921 +
        445267.1114034 * T -
        0.0018819 * T * T +
        (T * T * T) / 545868
    );

    // Mean anomaly of the Moon
    const M = this._normalizeAngle(
      134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + (T * T * T) / 69699
    );

    // Mean anomaly of the Sun
    const Msun = this._normalizeAngle(
      357.5291092 + 35999.0502909 * T - 0.0001536 * T * T
    );

    // Argument of latitude of the Moon
    const F = this._normalizeAngle(
      93.272095 + 483202.0175233 * T - 0.0036539 * T * T
    );

    // Longitude of ascending node
    const omega = this._normalizeAngle(125.04452 - 1934.136261 * T);

    // Convert to radians
    const Drad = (D * Math.PI) / 180;
    const Mrad = (M * Math.PI) / 180;
    const MsunRad = (Msun * Math.PI) / 180;
    const Frad = (F * Math.PI) / 180;
    const omegaRad = (omega * Math.PI) / 180;

    // Ecliptic longitude corrections (simplified)
    let lonCorr =
      6.289 * Math.sin(Mrad) +
      1.274 * Math.sin(2 * Drad - Mrad) +
      0.658 * Math.sin(2 * Drad) +
      0.214 * Math.sin(2 * Mrad) -
      0.186 * Math.sin(MsunRad) -
      0.114 * Math.sin(2 * Frad);

    // Ecliptic latitude
    let latCorr =
      5.128 * Math.sin(Frad) +
      0.281 * Math.sin(Mrad + Frad) +
      0.278 * Math.sin(Mrad - Frad);

    const eclipticLon = ((L0 + lonCorr) * Math.PI) / 180;
    const eclipticLat = (latCorr * Math.PI) / 180;

    // Obliquity of the ecliptic
    const eps = ((23.439291 - 0.0130042 * T) * Math.PI) / 180;

    // Convert to equatorial coordinates (RA, Dec)
    const sinDec =
      Math.sin(eclipticLat) * Math.cos(eps) +
      Math.cos(eclipticLat) * Math.sin(eps) * Math.sin(eclipticLon);
    const dec = Math.asin(sinDec);

    const y =
      Math.sin(eclipticLon) * Math.cos(eps) -
      Math.tan(eclipticLat) * Math.sin(eps);
    const x = Math.cos(eclipticLon);
    let ra = Math.atan2(y, x);
    if (ra < 0) ra += 2 * Math.PI;

    // Local sidereal time
    const gmst = this._getGMST(jd);
    const lst = gmst + (lonDeg * Math.PI) / 180;
    const ha = lst - ra; // Hour angle

    // Convert to horizontal coordinates (Alt, Az)
    const latRad = (latDeg * Math.PI) / 180;
    const sinAlt =
      Math.sin(latRad) * Math.sin(dec) +
      Math.cos(latRad) * Math.cos(dec) * Math.cos(ha);
    const altitude = Math.asin(sinAlt);

    const cosA =
      (Math.sin(dec) - Math.sin(latRad) * sinAlt) /
      (Math.cos(latRad) * Math.cos(altitude));
    let azimuth = Math.acos(Math.max(-1, Math.min(1, cosA)));
    if (Math.sin(ha) > 0) azimuth = 2 * Math.PI - azimuth;

    return {
      altitude,
      azimuth,
      declination: dec,
      rightAscension: ra,
      eclipticLon,
      eclipticLat,
    };
  }

  /**
   * Calculate approximate Sun position
   */
  _getSunPosition(jd, latDeg, lonDeg) {
    const T = (jd - 2451545.0) / 36525;

    // Mean longitude of the Sun
    const L0 = this._normalizeAngle(280.46646 + 36000.76983 * T);

    // Mean anomaly of the Sun
    const M = this._normalizeAngle(357.52911 + 35999.05029 * T);
    const Mrad = (M * Math.PI) / 180;

    // Equation of center
    const C =
      (1.914602 - 0.004817 * T) * Math.sin(Mrad) +
      0.019993 * Math.sin(2 * Mrad);

    // Sun's true longitude
    const sunLon = ((L0 + C) * Math.PI) / 180;

    // Obliquity of the ecliptic
    const eps = ((23.439291 - 0.0130042 * T) * Math.PI) / 180;

    // Convert to equatorial
    const sinDec = Math.sin(eps) * Math.sin(sunLon);
    const dec = Math.asin(sinDec);

    const y = Math.cos(eps) * Math.sin(sunLon);
    const x = Math.cos(sunLon);
    let ra = Math.atan2(y, x);
    if (ra < 0) ra += 2 * Math.PI;

    // Local sidereal time
    const gmst = this._getGMST(jd);
    const lst = gmst + (lonDeg * Math.PI) / 180;
    const ha = lst - ra;

    // Convert to horizontal
    const latRad = (latDeg * Math.PI) / 180;
    const sinAlt =
      Math.sin(latRad) * Math.sin(dec) +
      Math.cos(latRad) * Math.cos(dec) * Math.cos(ha);
    const altitude = Math.asin(sinAlt);

    const cosA =
      (Math.sin(dec) - Math.sin(latRad) * sinAlt) /
      (Math.cos(latRad) * Math.cos(altitude));
    let azimuth = Math.acos(Math.max(-1, Math.min(1, cosA)));
    if (Math.sin(ha) > 0) azimuth = 2 * Math.PI - azimuth;

    return {
      altitude,
      azimuth,
      declination: dec,
      rightAscension: ra,
      eclipticLon: sunLon,
    };
  }

  /**
   * Calculate Greenwich Mean Sidereal Time
   */
  _getGMST(jd) {
    const T = (jd - 2451545.0) / 36525;
    let gmst =
      280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T;
    gmst = this._normalizeAngle(gmst);
    return (gmst * Math.PI) / 180;
  }

  /**
   * Normalize angle to 0-360 degrees
   */
  _normalizeAngle(deg) {
    let result = deg % 360;
    if (result < 0) result += 360;
    return result;
  }

  _normalizeAngleRad(rad) {
    let result = rad % (2 * Math.PI);
    if (result < 0) result += 2 * Math.PI;
    return result;
  }

  _angleToSvgDeg(angleRad) {
    const deg = (angleRad * 180) / Math.PI;
    let svgDeg = 270 - deg;
    svgDeg = ((svgDeg % 360) + 360) % 360;
    return svgDeg;
  }

  /**
   * Calculate position angle of the bright limb
   * This determines where the illuminated edge of the Moon points
   */
  _calculatePositionAngle(moonPos, sunPos) {
    // Position angle is the angle from celestial north to the Sun,
    // measured eastward at the Moon's position
    const dRA = sunPos.rightAscension - moonPos.rightAscension;

    const y = Math.cos(sunPos.declination) * Math.sin(dRA);
    const x =
      Math.cos(moonPos.declination) * Math.sin(sunPos.declination) -
      Math.sin(moonPos.declination) *
        Math.cos(sunPos.declination) *
        Math.cos(dRA);

    return Math.atan2(y, x);
  }

  /**
   * Calculate parallactic angle
   * This is how much the Moon appears rotated due to observer's position
   */
  _calculateParallacticAngle(latDeg, altitude, azimuth) {
    const latRad = (latDeg * Math.PI) / 180;

    // Parallactic angle formula
    const y = Math.sin(azimuth);
    const x =
      Math.tan(latRad) * Math.cos(altitude) -
      Math.sin(altitude) * Math.cos(azimuth);

    return Math.atan2(y, x);
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

  /**
   * Render the Moon using a layered compositing model:
   *
   * Layer 1: Dark background circle
   * Layer 2: Moon texture (craters) - rotated by diskRotation (r)
   * Layer 3: Shadow mask - shaped by illumination (i), rotated by positionAngle (p)
   *
   * @param {Object} data - Phase data containing illumination, positionAngle, diskRotation
   */
  _renderMoonSvg(data) {
    const { illumination, positionAngle, diskRotation, phaseFraction } = data;
    const radius = 40;

    // Convert radians to degrees for SVG transforms
    const diskRotDeg = this._angleToSvgDeg(diskRotation);
    const limbAngleRad = positionAngle - diskRotation;
    const posAngleDeg = this._angleToSvgDeg(limbAngleRad);

    // Calculate the terminator (shadow edge) shape
    // The terminator is an ellipse whose x-radius depends on phase
    // At quarter phases (0.25, 0.75), it's a straight line (rx = 0)
    // At new/full (0, 0.5), it's a full circle (rx = radius)
    const phaseAngle = 2 * Math.PI * phaseFraction;
    const terminatorRx = Math.abs(radius * Math.cos(phaseAngle));

    // Build the illuminated portion path
    // This creates a path that represents the lit portion of the Moon
    const litPath = this._buildLitPath(radius, terminatorRx, phaseFraction);

    return `
<svg viewBox="-50 -50 100 100" role="img" aria-label="Moon phase">
  <defs>
    <!-- Moon surface gradient (lit side) -->
    <radialGradient id="moonLitSurface" cx="35%" cy="35%" r="70%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.98)" />
      <stop offset="55%" stop-color="rgba(235,235,235,0.92)" />
      <stop offset="100%" stop-color="rgba(200,200,200,0.85)" />
    </radialGradient>
    
    <!-- Moon dark side -->
    <radialGradient id="moonDarkSide" cx="35%" cy="35%" r="75%">
      <stop offset="0%" stop-color="rgba(40,40,55,0.95)" />
      <stop offset="100%" stop-color="rgba(10,10,18,0.98)" />
    </radialGradient>
    
    <!-- Subtle surface texture gradient -->
    <radialGradient id="moonTexture" cx="45%" cy="40%" r="60%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.15)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0.1)" />
    </radialGradient>
    
    <!-- Drop shadow and glow -->
    <filter id="moonGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.45)" />
      <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="rgba(255,255,255,0.08)" />
    </filter>
    
    <!-- Clip path for the moon disk -->
    <clipPath id="moonClip">
      <circle cx="0" cy="0" r="${radius}" />
    </clipPath>
  </defs>

  <g filter="url(#moonGlow)" transform="scale(-1 1)">
    <!-- Layer 1: Lit background (the illuminated portion) -->
    <circle cx="0" cy="0" r="${radius}" fill="url(#moonLitSurface)" />
    
    <!-- Layer 2: Moon texture (craters) - rotated by disk rotation (r) -->
    <g transform="rotate(${diskRotDeg})" clip-path="url(#moonClip)">
      <!-- Crater texture layer - these rotate with the Moon's libration -->
      <g opacity="0.22" fill="rgba(0,0,0,0.6)">
        <!-- Mare Imbrium region -->
        <circle cx="-12" cy="-14" r="8" />
        <circle cx="-18" cy="-8" r="4" />
        <!-- Mare Serenitatis -->
        <circle cx="8" cy="-12" r="6" />
        <!-- Mare Tranquillitatis -->
        <circle cx="12" cy="2" r="7" />
        <!-- Mare Crisium -->
        <circle cx="22" cy="-8" r="4" />
        <!-- Mare Fecunditatis -->
        <circle cx="16" cy="14" r="5" />
        <!-- Oceanus Procellarum -->
        <circle cx="-20" cy="4" r="6" />
        <circle cx="-14" cy="12" r="4" />
        <!-- Tycho region -->
        <circle cx="-4" cy="24" r="3" />
        <!-- Copernicus -->
        <circle cx="-8" cy="0" r="3" />
        <!-- Smaller features -->
        <circle cx="4" cy="18" r="2.5" />
        <circle cx="-6" cy="-24" r="2" />
        <circle cx="18" cy="-18" r="2" />
      </g>
      
      <!-- Surface texture overlay -->
      <circle cx="0" cy="0" r="${radius}" fill="url(#moonTexture)" opacity="0.3" />
    </g>
    
    <!-- Layer 3: Shadow portion - rotated by local bright-limb angle -->
    <g transform="rotate(${posAngleDeg})">
      <path d="${litPath}" fill="url(#moonDarkSide)" />
      
      <!-- Re-apply crater texture on lit portion for visibility -->
      <g clip-path="url(#litClip${Math.round(
        phaseFraction * 1000
      )})" opacity="0.15" fill="rgba(80,80,80,0.5)">
        <g transform="rotate(${diskRotDeg - posAngleDeg})">
          <circle cx="-12" cy="-14" r="8" />
          <circle cx="-18" cy="-8" r="4" />
          <circle cx="8" cy="-12" r="6" />
          <circle cx="12" cy="2" r="7" />
          <circle cx="22" cy="-8" r="4" />
          <circle cx="16" cy="14" r="5" />
          <circle cx="-20" cy="4" r="6" />
          <circle cx="-14" cy="12" r="4" />
          <circle cx="-4" cy="24" r="3" />
          <circle cx="-8" cy="0" r="3" />
          <circle cx="4" cy="18" r="2.5" />
          <circle cx="-6" cy="-24" r="2" />
          <circle cx="18" cy="-18" r="2" />
        </g>
      </g>
    </g>
    
    <!-- Subtle edge highlight -->
    <circle cx="0" cy="0" r="${radius}" 
            fill="none" 
            stroke="rgba(255,255,255,0.1)" 
            stroke-width="0.5" />
  </g>
</svg>
`;
  }

  /**
   * Build the SVG path for the illuminated portion of the Moon
   *
   * The lit portion is defined by:
   * - One arc following the limb (outer edge, always a semicircle)
   * - One arc following the terminator (inner edge, varies with phase)
   */
  _buildLitPath(radius, terminatorRx, phaseFraction) {
    const r = radius;
    const rx = Math.max(0.01, terminatorRx); // Prevent zero radius

    // Draw with a consistent base orientation (bright limb to +x).
    // The rotation is handled by the bright-limb position angle.
    const isCrescent = phaseFraction < 0.25 || phaseFraction > 0.75;
    const terminatorSweep = isCrescent ? 1 : 0;

    return `M 0 ${-r} A ${r} ${r} 0 0 1 0 ${r} A ${rx} ${r} 0 0 ${terminatorSweep} 0 ${-r} Z`;
  }
}
