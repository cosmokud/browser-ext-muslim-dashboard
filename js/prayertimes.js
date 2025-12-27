/**
 * Prayer Times Manager
 * Handles prayer time calculations and display
 */

class PrayerTimesManager {
  constructor(storage) {
    this.storage = storage;
    this.prayTimes = new PrayTimes();
    this.times = {};
    this.location = null;
    this.countdownInterval = null;
    
    // Prayer elements
    this.prayerElements = {
      fajr: document.getElementById('fajrTime'),
      sunrise: document.getElementById('sunriseTime'),
      dhuhr: document.getElementById('dhuhrTime'),
      asr: document.getElementById('asrTime'),
      maghrib: document.getElementById('maghribTime'),
      isha: document.getElementById('ishaTime')
    };
    
    this.locationText = document.getElementById('locationText');
    this.nextPrayerName = document.getElementById('nextPrayerName');
    this.nextPrayerCountdown = document.getElementById('nextPrayerCountdown');
  }

  /**
   * Initialize prayer times
   */
  async init() {
    const settings = this.storage.getSettings();
    
    // Set calculation method
    this.prayTimes.setMethod(settings.calculationMethod);
    this.prayTimes.setAsrMethod(settings.asrMethod);
    
    // Set adjustments
    this.prayTimes.tune(settings.adjustments);
    
    // Get location
    await this.getLocation();
  }

  /**
   * Get user location
   */
  async getLocation() {
    const settings = this.storage.getSettings();
    
    if (settings.locationMethod === 'manual' && settings.latitude && settings.longitude) {
      this.location = {
        latitude: settings.latitude,
        longitude: settings.longitude,
        city: settings.city || 'Custom Location'
      };
      this.updatePrayerTimes();
      return;
    }
    
    // Try to get from storage first
    const lastLocation = this.storage.getLastLocation();
    if (lastLocation) {
      this.location = lastLocation;
      this.updatePrayerTimes();
    }
    
    // Try to get current location
    if (navigator.geolocation) {
      this.locationText.textContent = 'Detecting...';
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            city: 'Current Location'
          };
          
          // Try to get city name
          this.reverseGeocode(position.coords.latitude, position.coords.longitude);
          
          // Save location
          this.storage.saveLastLocation(this.location);
          
          this.updatePrayerTimes();
        },
        (error) => {
          console.error('Geolocation error:', error);
          
          // Use default location (Mecca) if no location available
          if (!this.location) {
            this.location = {
              latitude: 21.4225,
              longitude: 39.8262,
              city: 'Mecca (Default)'
            };
            this.updatePrayerTimes();
          }
          
          this.locationText.textContent = this.location.city;
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 600000 // 10 minutes
        }
      );
    } else if (!this.location) {
      // Default to Mecca
      this.location = {
        latitude: 21.4225,
        longitude: 39.8262,
        city: 'Mecca (Default)'
      };
      this.updatePrayerTimes();
    }
  }

  /**
   * Reverse geocode to get city name
   */
  async reverseGeocode(lat, lng) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`
      );
      
      if (response.ok) {
        const data = await response.json();
        const city = data.address.city || 
                     data.address.town || 
                     data.address.village || 
                     data.address.county ||
                     data.address.state;
        
        if (city) {
          this.location.city = city;
          this.locationText.textContent = city;
          this.storage.saveLastLocation(this.location);
        }
      }
    } catch (e) {
      console.error('Reverse geocode error:', e);
    }
  }

  /**
   * Search city by name
   */
  async searchCity(cityName) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          return {
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
            city: data[0].display_name.split(',')[0]
          };
        }
      }
    } catch (e) {
      console.error('City search error:', e);
    }
    
    return null;
  }

  /**
   * Update prayer times
   */
  updatePrayerTimes() {
    if (!this.location) return;
    
    const date = new Date();
    
    // Get prayer times
    this.times = this.prayTimes.getTimes(
      date,
      [this.location.latitude, this.location.longitude],
      'auto',
      'auto',
      '24h'
    );
    
    // Update display
    this.displayPrayerTimes();
    
    // Update location text
    if (this.locationText) {
      this.locationText.textContent = this.location.city;
    }
    
    // Start countdown
    this.startCountdown();
    
    // Highlight current/next prayer
    this.highlightPrayer();
  }

  /**
   * Display prayer times
   */
  displayPrayerTimes() {
    const prayers = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
    
    prayers.forEach(prayer => {
      if (this.prayerElements[prayer]) {
        this.prayerElements[prayer].textContent = this.times[prayer] || '--:--';
      }
    });
  }

  /**
   * Highlight current and next prayer
   */
  highlightPrayer() {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const prayers = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const prayerTimes = prayers.map(prayer => {
      const timeStr = this.times[prayer];
      if (!timeStr || timeStr === '-----') return null;
      
      const [hours, minutes] = timeStr.split(':').map(Number);
      return { name: prayer, minutes: hours * 60 + minutes };
    }).filter(Boolean);
    
    // Remove existing highlights
    document.querySelectorAll('.prayer-item').forEach(item => {
      item.classList.remove('active', 'next');
    });
    
    // Find next prayer
    let nextPrayer = prayerTimes.find(p => p.minutes > currentTime);
    
    // If no prayer found today, next is fajr tomorrow
    if (!nextPrayer && prayerTimes.length > 0) {
      nextPrayer = prayerTimes[0];
    }
    
    // Highlight next prayer
    if (nextPrayer) {
      const nextPrayerItem = document.querySelector(`[data-prayer="${nextPrayer.name}"]`);
      if (nextPrayerItem) {
        nextPrayerItem.classList.add('next');
      }
      
      // Update next prayer display
      if (this.nextPrayerName) {
        this.nextPrayerName.textContent = this.capitalizeFirst(nextPrayer.name);
      }
    }
  }

  /**
   * Start countdown to next prayer
   */
  startCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    
    this.updateCountdown();
    this.countdownInterval = setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  /**
   * Update countdown display
   */
  updateCountdown() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentSeconds = now.getSeconds();
    
    const prayers = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const prayerTimes = prayers.map(prayer => {
      const timeStr = this.times[prayer];
      if (!timeStr || timeStr === '-----') return null;
      
      const [hours, minutes] = timeStr.split(':').map(Number);
      return { name: prayer, minutes: hours * 60 + minutes };
    }).filter(Boolean);
    
    // Find next prayer
    let nextPrayer = prayerTimes.find(p => p.minutes > currentMinutes);
    let isTomorrow = false;
    
    // If no prayer found today, next is fajr tomorrow
    if (!nextPrayer && prayerTimes.length > 0) {
      nextPrayer = prayerTimes[0];
      isTomorrow = true;
    }
    
    if (nextPrayer) {
      let diffMinutes;
      
      if (isTomorrow) {
        // Time until midnight + time from midnight to fajr
        diffMinutes = (24 * 60 - currentMinutes) + nextPrayer.minutes;
      } else {
        diffMinutes = nextPrayer.minutes - currentMinutes;
      }
      
      // Adjust for seconds
      let totalSeconds = diffMinutes * 60 - currentSeconds;
      if (totalSeconds < 0) totalSeconds = 0;
      
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      if (this.nextPrayerCountdown) {
        this.nextPrayerCountdown.textContent = 
          `${this.padZero(hours)}:${this.padZero(minutes)}:${this.padZero(seconds)}`;
      }
    }
    
    // Highlight current prayer (just passed)
    this.highlightPrayer();
  }

  /**
   * Set manual location
   */
  setManualLocation(latitude, longitude, city) {
    this.location = { latitude, longitude, city };
    this.storage.saveLastLocation(this.location);
    this.updatePrayerTimes();
  }

  /**
   * Update calculation settings
   */
  updateSettings(method, asrMethod, adjustments) {
    this.prayTimes.setMethod(method);
    this.prayTimes.setAsrMethod(asrMethod);
    this.prayTimes.tune(adjustments);
    this.updatePrayerTimes();
  }

  /**
   * Get current location
   */
  getLocation() {
    return this.location;
  }

  /**
   * Utility: Capitalize first letter
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Utility: Pad with zero
   */
  padZero(num) {
    return String(num).padStart(2, '0');
  }
}

// Export for use
window.PrayerTimesManager = PrayerTimesManager;
