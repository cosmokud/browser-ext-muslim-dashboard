# 🕌 Muslim Dashboard - Islamic New Tab Extension

A beautiful, interactive, and fully responsive Chrome/Edge browser extension that transforms your new tab page into a comprehensive Islamic dashboard.

## ✨ Features

### 🕋 Prayer Times

- **Automatic Location Detection**: Uses GPS to detect your location automatically
- **Manual City Search**: Enter any city name to get prayer times
- **Multiple Calculation Methods**:
  - Muslim World League (MWL)
  - ISNA (North America)
  - Egyptian General Authority
  - Umm Al-Qura (Makkah)
  - University of Islamic Sciences (Karachi)
  - Institute of Geophysics (Tehran)
  - Shia Ithna-Ashari (Jafari)
- **Asr Juristic Methods**: Standard (Shafi'i/Maliki/Hanbali) and Hanafi
- **Time Adjustments**: Fine-tune each prayer time by minutes
- **Next Prayer Countdown**: Real-time countdown to the next prayer

### 🧭 Qibla Direction

- Compass showing the direction of the Ka'bah from your location
- Degree display with cardinal direction
- Device orientation support for mobile devices

### 📅 Hijri Calendar

- Toggle between Hijri (Islamic) and Gregorian calendar
- Automatic Islamic date calculation
- Special Islamic event notifications
- Hijri date adjustment support

### ✅ To-Do List

- Full CRUD functionality (Create, Read, Update, Delete)
- Filter tasks: All, Active, Completed
- Persistent storage using browser localStorage
- Clear completed tasks with one click
- Beautiful animations

### 📖 Islamic Quotes

- 100+ quotes from Quran and authentic Hadith
- Random quote display with refresh button
- Add your own custom quotes
- Choose to display default quotes, custom quotes, or both
- Smooth fade transitions

### � Flashcards

- Two built-in read-only default sets are included: `Default` and `99 Names`.
- Import your own flashcards via CSV/JSON, export custom sets as JSON, create/edit sets (defaults are protected), and study or quiz yourself.

### �🖼️ Dynamic Backgrounds

- High-resolution nature backgrounds from Unsplash
- Multiple categories: Nature, Mosques, Landscapes, Mountains, Ocean, Forests, Sky
- Configurable rotation interval (15 min to daily)
- Smooth crossfade transitions

### ⚙️ Comprehensive Settings

- Location settings with auto-detect or manual entry
- Prayer calculation customization
- Quote source management
- Background preferences
- All settings persist across sessions

## 🚀 Installation

### Chrome

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `browser-ext-muslim-dashboard` folder
6. Open a new tab to see your Muslim Dashboard!

### Microsoft Edge

1. Download or clone this repository
2. Open Edge and go to `edge://extensions/`
3. Enable "Developer mode" (toggle in left sidebar)
4. Click "Load unpacked"
5. Select the `browser-ext-muslim-dashboard` folder
6. Open a new tab to see your Muslim Dashboard!

### Chrome Web Store Package

Use the packaging script instead of zipping the repository root.

1. Run `.\build-webstore.ps1` from the project root in PowerShell
2. Upload `dist/chrome-webstore.zip` to the Chrome Web Store
3. The package includes runtime assets only and excludes source-only files such as `sources/hisn.html`

## 📁 Project Structure

```
browser-ext-muslim-dashboard/
├── manifest.json          # Extension configuration
├── index.html             # Main dashboard HTML
├── css/
│   └── styles.css         # All styles with animations
├── js/
│   ├── app.js             # Main application orchestrator
│   ├── praytimes.js       # Prayer times calculation library
│   ├── prayertimes.js     # Prayer times manager
│   ├── hijri.js           # Hijri calendar converter
│   ├── qibla.js           # Qibla direction calculator
│   ├── quotes.js          # Quotes manager
│   ├── todo.js            # Todo list manager
│   ├── backgrounds.js     # Background rotation manager
│   ├── settings.js        # Settings modal manager
│   └── storage.js         # LocalStorage wrapper
├── data/
│   ├── quotes_default.json # 100+ default Islamic quotes
│   └── quotes_user.json   # User custom quotes
├── icons/
│   ├── icon.svg           # Vector icon
│   ├── icon16.png         # 16x16 icon
│   ├── icon32.png         # 32x32 icon
│   ├── icon48.png         # 48x48 icon
│   └── icon128.png        # 128x128 icon
└── README.md              # This file
```

## 🎨 Design Features

- **Glassmorphism UI**: Modern frosted glass effect with backdrop blur
- **Responsive Design**: Works on all screen sizes
- **Smooth Animations**: CSS animations for all interactions
- **Dark Theme**: Easy on the eyes for any time of day
- **Arabic Typography**: Proper Arabic font support

## 🔧 Customization

### Adding Custom Quotes

1. Click the settings button (⚙️) in the bottom right
2. Go to the "Quotes" tab
3. Enter your quote text and source
4. Click "Add Quote"

### Adjusting Prayer Times

1. Open Settings → Prayer tab
2. Select your preferred calculation method
3. Use the adjustment fields to fine-tune times (in minutes)
4. Click "Save Settings"

### Changing Background

1. Open Settings → Background tab
2. Choose your preferred category
3. Set rotation interval
4. Click "Change Background Now" for immediate change

## 🌐 API Credits

- **Background Images**: [Unsplash](https://unsplash.com/) (Free to use)
- **Geocoding**: [OpenStreetMap Nominatim](https://nominatim.org/)
- **Prayer Times Algorithm**: Based on [PrayTimes.org](https://praytimes.org/)

## 📜 Islamic Sources

The default quotes are sourced from:

- The Holy Quran
- Sahih Bukhari
- Sahih Muslim
- Sunan at-Tirmidhi
- Sunan Abu Dawud
- Sunan Ibn Majah
- Sunan an-Nasa'i
- Musnad Ahmad

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📃 License

This project is open source and available under the [MIT License](LICENSE).

## 🤲 Dua

May Allah accept this work and make it beneficial for the Ummah. Ameen.

---

**Made with ❤️ for the Muslim community worldwide**

_As-salamu alaykum wa Rahmatullahi wa Barakatuh_ 🌙
