/**
 * Qibla Direction Manager
 * Calculates Qibla direction from user's location
 */

class QiblaManager {
  constructor(storage) {
    this.storage = storage;
    
    // Ka'bah coordinates
    this.kaabaLat = 21.4225;
    this.kaabaLng = 39.8262;
    
    // Elements
    this.compassInner = document.getElementById('compassInner');
    this.qiblaNeedle = document.getElementById('qiblaNeedle');
    this.qiblaDegree = document.getElementById('qiblaDegree');
    
    // Current state
    this.qiblaAngle = 0;
    this.deviceOrientation = 0;
    this.hasOrientation = false;
  }

  /**
   * Initialize Qibla
   */
  init(latitude, longitude) {
    this.calculateQibla(latitude, longitude);
    this.setupDeviceOrientation();
  }

  /**
   * Calculate Qibla direction
   * Uses the spherical law of cosines
   */
  calculateQibla(latitude, longitude) {
    const lat1 = this.toRadians(latitude);
    const lng1 = longitude;
    const lat2 = this.toRadians(this.kaabaLat);
    const lng2 = this.kaabaLng;

    // Calculate the bearing
    const dLng = this.toRadians(lng2 - lng1);
    
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - 
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    
    let bearing = Math.atan2(y, x);
    bearing = this.toDegrees(bearing);
    bearing = (bearing + 360) % 360;
    
    this.qiblaAngle = bearing;
    this.updateDisplay();
    
    return bearing;
  }

  /**
   * Setup device orientation for compass
   */
  setupDeviceOrientation() {
    // Check if device orientation is available
    if ('DeviceOrientationEvent' in window) {
      // iOS 13+ requires permission
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // Will need user interaction to request permission
        this.needsPermission = true;
      } else {
        this.addOrientationListener();
      }
    }
  }

  /**
   * Request device orientation permission (iOS)
   */
  async requestPermission() {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission === 'granted') {
        this.addOrientationListener();
        return true;
      }
    } catch (e) {
      console.error('Orientation permission error:', e);
    }
    return false;
  }

  /**
   * Add device orientation listener
   */
  addOrientationListener() {
    window.addEventListener('deviceorientationabsolute', (e) => {
      this.handleOrientation(e);
    }, true);

    window.addEventListener('deviceorientation', (e) => {
      // Fallback if absolute is not available
      if (!this.hasOrientation) {
        this.handleOrientation(e);
      }
    }, true);
  }

  /**
   * Handle device orientation change
   */
  handleOrientation(event) {
    let alpha = event.alpha; // Compass direction
    
    if (alpha === null) return;
    
    // For iOS, we need to adjust
    if (event.webkitCompassHeading) {
      alpha = event.webkitCompassHeading;
    } else {
      alpha = 360 - alpha;
    }
    
    this.hasOrientation = true;
    this.deviceOrientation = alpha;
    this.updateCompass();
  }

  /**
   * Update compass rotation
   */
  updateCompass() {
    if (this.compassInner) {
      // Rotate the compass to point north
      this.compassInner.style.transform = `translate(-50%, -50%) rotate(${-this.deviceOrientation}deg)`;
    }
  }

  /**
   * Update display
   */
  updateDisplay() {
    // Update the needle rotation
    if (this.qiblaNeedle) {
      this.qiblaNeedle.style.transform = `translate(-50%, -100%) rotate(${this.qiblaAngle}deg)`;
    }
    
    // Update the degree display
    if (this.qiblaDegree) {
      this.qiblaDegree.textContent = `${Math.round(this.qiblaAngle)}° ${this.getCardinalDirection(this.qiblaAngle)}`;
    }
  }

  /**
   * Get cardinal direction from angle
   */
  getCardinalDirection(angle) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(angle / 22.5) % 16;
    return directions[index];
  }

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert radians to degrees
   */
  toDegrees(radians) {
    return radians * (180 / Math.PI);
  }

  /**
   * Get Qibla angle
   */
  getQiblaAngle() {
    return this.qiblaAngle;
  }

  /**
   * Update location
   */
  updateLocation(latitude, longitude) {
    this.calculateQibla(latitude, longitude);
  }
}

// Export for use
window.QiblaManager = QiblaManager;
