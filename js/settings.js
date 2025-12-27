/**
 * Settings Manager
 * Handles settings modal and configuration
 */

class SettingsManager {
  constructor(storage, prayerTimes, qibla, quotes, backgrounds) {
    this.storage = storage;
    this.prayerTimes = prayerTimes;
    this.qibla = qibla;
    this.quotes = quotes;
    this.backgrounds = backgrounds;
    
    // Modal elements
    this.modal = document.getElementById('settingsModal');
    this.settingsBtn = document.getElementById('settingsBtn');
    this.closeBtn = document.getElementById('settingsClose');
    this.saveBtn = document.getElementById('saveSettingsBtn');
    
    // Tabs
    this.tabs = document.querySelectorAll('.settings-tab');
    this.panels = document.querySelectorAll('.settings-panel');
    
    // Location elements
    this.locationMethodRadios = document.querySelectorAll('input[name="locationMethod"]');
    this.manualLocationFields = document.getElementById('manualLocationFields');
    this.cityInput = document.getElementById('cityInput');
    this.latitudeInput = document.getElementById('latitudeInput');
    this.longitudeInput = document.getElementById('longitudeInput');
    this.searchCityBtn = document.getElementById('searchCityBtn');
    
    // Prayer elements
    this.calculationMethod = document.getElementById('calculationMethod');
    this.asrMethod = document.getElementById('asrMethod');
    this.adjustmentInputs = {
      fajr: document.getElementById('adjustFajr'),
      sunrise: document.getElementById('adjustSunrise'),
      dhuhr: document.getElementById('adjustDhuhr'),
      asr: document.getElementById('adjustAsr'),
      maghrib: document.getElementById('adjustMaghrib'),
      isha: document.getElementById('adjustIsha')
    };
    
    // Quote elements
    this.useDefaultQuotes = document.getElementById('useDefaultQuotes');
    this.useUserQuotes = document.getElementById('useUserQuotes');
    this.newQuoteText = document.getElementById('newQuoteText');
    this.newQuoteSource = document.getElementById('newQuoteSource');
    this.addQuoteBtn = document.getElementById('addQuoteBtn');
    this.userQuotesList = document.getElementById('userQuotesList');
    
    // Background elements
    this.bgInterval = document.getElementById('bgInterval');
    this.bgCategory = document.getElementById('bgCategory');
    this.changeBackgroundBtn = document.getElementById('changeBackgroundBtn');
  }

  /**
   * Initialize settings
   */
  init() {
    this.loadSettings();
    this.setupEventListeners();
    this.renderUserQuotes();
  }

  /**
   * Load settings into form
   */
  loadSettings() {
    const settings = this.storage.getSettings();
    
    // Location settings
    document.querySelector(`input[name="locationMethod"][value="${settings.locationMethod}"]`).checked = true;
    this.toggleManualLocation(settings.locationMethod === 'manual');
    this.cityInput.value = settings.city || '';
    this.latitudeInput.value = settings.latitude || '';
    this.longitudeInput.value = settings.longitude || '';
    
    // Prayer settings
    this.calculationMethod.value = settings.calculationMethod;
    this.asrMethod.value = settings.asrMethod;
    
    for (let prayer in this.adjustmentInputs) {
      if (this.adjustmentInputs[prayer]) {
        this.adjustmentInputs[prayer].value = settings.adjustments[prayer] || 0;
      }
    }
    
    // Quote settings
    this.useDefaultQuotes.checked = settings.useDefaultQuotes;
    this.useUserQuotes.checked = settings.useUserQuotes;
    
    // Background settings
    this.bgInterval.value = settings.bgInterval;
    this.bgCategory.value = settings.bgCategory;
  }

  /**
   * Save settings
   */
  saveSettings() {
    const settings = this.storage.getSettings();
    
    // Location settings
    settings.locationMethod = document.querySelector('input[name="locationMethod"]:checked').value;
    settings.city = this.cityInput.value;
    settings.latitude = parseFloat(this.latitudeInput.value) || null;
    settings.longitude = parseFloat(this.longitudeInput.value) || null;
    
    // Prayer settings
    settings.calculationMethod = this.calculationMethod.value;
    settings.asrMethod = this.asrMethod.value;
    
    settings.adjustments = {};
    for (let prayer in this.adjustmentInputs) {
      if (this.adjustmentInputs[prayer]) {
        settings.adjustments[prayer] = parseInt(this.adjustmentInputs[prayer].value) || 0;
      }
    }
    
    // Quote settings
    settings.useDefaultQuotes = this.useDefaultQuotes.checked;
    settings.useUserQuotes = this.useUserQuotes.checked;
    
    // Background settings
    settings.bgInterval = parseInt(this.bgInterval.value);
    settings.bgCategory = this.bgCategory.value;
    
    // Save to storage
    this.storage.saveSettings(settings);
    
    // Apply changes
    this.applySettings(settings);
    
    // Show confirmation
    this.showToast('Settings saved successfully!', 'success');
    
    // Close modal
    this.closeModal();
  }

  /**
   * Apply settings to components
   */
  applySettings(settings) {
    // Update prayer times
    this.prayerTimes.updateSettings(
      settings.calculationMethod,
      settings.asrMethod,
      settings.adjustments
    );
    
    // Update location if manual
    if (settings.locationMethod === 'manual' && settings.latitude && settings.longitude) {
      this.prayerTimes.setManualLocation(
        settings.latitude,
        settings.longitude,
        settings.city
      );
      this.qibla.updateLocation(settings.latitude, settings.longitude);
    } else {
      this.prayerTimes.getLocation();
    }
    
    // Update background rotation
    this.backgrounds.updateInterval(settings.bgInterval);
  }

  /**
   * Toggle manual location fields
   */
  toggleManualLocation(show) {
    if (show) {
      this.manualLocationFields.classList.add('active');
    } else {
      this.manualLocationFields.classList.remove('active');
    }
  }

  /**
   * Search for city
   */
  async searchCity() {
    const cityName = this.cityInput.value.trim();
    if (!cityName) {
      this.showToast('Please enter a city name', 'error');
      return;
    }
    
    this.searchCityBtn.textContent = '🔍 Searching...';
    this.searchCityBtn.disabled = true;
    
    const result = await this.prayerTimes.searchCity(cityName);
    
    if (result) {
      this.cityInput.value = result.city;
      this.latitudeInput.value = result.latitude.toFixed(4);
      this.longitudeInput.value = result.longitude.toFixed(4);
      this.showToast(`Found: ${result.city}`, 'success');
    } else {
      this.showToast('City not found. Please try a different name.', 'error');
    }
    
    this.searchCityBtn.textContent = '🔍 Search City';
    this.searchCityBtn.disabled = false;
  }

  /**
   * Add user quote
   */
  addUserQuote() {
    const text = this.newQuoteText.value.trim();
    const source = this.newQuoteSource.value.trim();
    
    if (!text) {
      this.showToast('Please enter quote text', 'error');
      return;
    }
    
    if (!source) {
      this.showToast('Please enter quote source', 'error');
      return;
    }
    
    this.quotes.addUserQuote(text, source);
    this.newQuoteText.value = '';
    this.newQuoteSource.value = '';
    this.renderUserQuotes();
    this.showToast('Quote added!', 'success');
  }

  /**
   * Delete user quote
   */
  deleteUserQuote(id) {
    this.quotes.deleteUserQuote(id);
    this.renderUserQuotes();
    this.showToast('Quote deleted', 'info');
  }

  /**
   * Render user quotes list
   */
  renderUserQuotes() {
    const quotes = this.quotes.getUserQuotes();
    
    if (quotes.length === 0) {
      this.userQuotesList.innerHTML = `
        <div class="empty-state">
          <p>No custom quotes yet. Add one above!</p>
        </div>
      `;
      return;
    }
    
    this.userQuotesList.innerHTML = quotes.map(quote => `
      <div class="user-quote-item" data-id="${quote.id}">
        <div class="user-quote-content">
          <p class="user-quote-text">${this.escapeHtml(quote.text)}</p>
          <p class="user-quote-source">— ${this.escapeHtml(quote.source)}</p>
        </div>
        <button class="user-quote-delete" data-action="delete" title="Delete">×</button>
      </div>
    `).join('');
  }

  /**
   * Open modal
   */
  openModal() {
    this.loadSettings();
    this.renderUserQuotes();
    this.modal.classList.add('active');
  }

  /**
   * Close modal
   */
  closeModal() {
    this.modal.classList.remove('active');
  }

  /**
   * Switch tab
   */
  switchTab(tabName) {
    // Update tabs
    this.tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update panels
    this.panels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `${tabName}Panel`);
    });
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    // Create toast container if not exists
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
      <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Remove after delay
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Open/close modal
    this.settingsBtn.addEventListener('click', () => this.openModal());
    this.closeBtn.addEventListener('click', () => this.closeModal());
    this.saveBtn.addEventListener('click', () => this.saveSettings());
    
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });
    
    // Tabs
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });
    
    // Location method toggle
    this.locationMethodRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.toggleManualLocation(radio.value === 'manual');
      });
    });
    
    // Search city
    this.searchCityBtn.addEventListener('click', () => this.searchCity());
    
    // Add quote
    this.addQuoteBtn.addEventListener('click', () => this.addUserQuote());
    
    // Delete quote (event delegation)
    this.userQuotesList.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="delete"]')) {
        const quoteItem = e.target.closest('.user-quote-item');
        if (quoteItem) {
          this.deleteUserQuote(parseInt(quoteItem.dataset.id));
        }
      }
    });
    
    // Change background now
    this.changeBackgroundBtn.addEventListener('click', () => {
      const settings = this.storage.getSettings();
      settings.bgCategory = this.bgCategory.value;
      this.storage.saveSettings(settings);
      this.backgrounds.updateCategory(this.bgCategory.value);
      this.backgrounds.changeBackground();
      this.showToast('Background changed!', 'success');
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('active')) {
        this.closeModal();
      }
    });
  }
}

// Export for use
window.SettingsManager = SettingsManager;
