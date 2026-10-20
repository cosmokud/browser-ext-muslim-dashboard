/**
 * Weather Manager
 * Fetches and displays weather information using Open-Meteo API (free, no API key required)
 * Supports temperature units, location-based weather, and auto-refresh
 */

class WeatherManager extends BaseManager {

  constructor(storage) {
    super();
    this.storage = storage;
    this.weatherCard = document.getElementById("weatherCard");
    this.weatherContent = this.weatherCard?.querySelector(".weather-content");
    this.weatherIcon = document.getElementById("weatherIcon");
    this.weatherTemp = document.getElementById("weatherTemp");
    this.weatherDesc = document.getElementById("weatherDesc");
    this.weatherLocation = document.getElementById("weatherLocation");
    this.weatherFeelsLike = document.getElementById("weatherFeelsLike");
    this.weatherHumidity = document.getElementById("weatherHumidity");
    this.weatherWind = document.getElementById("weatherWind");
    this.weatherDetails = this.weatherCard?.querySelector(".weather-details");
    this.weatherRefreshBtn = document.getElementById("weatherRefreshBtn");

    this.weatherForecast = document.getElementById("weatherForecast");
    this.weatherChart = document.getElementById("weatherChart");
    this.weatherChartLegend = document.getElementById("weatherChartLegend");
    this.weatherChartTabs = document.querySelectorAll(
      "#weatherCard .weather-chart-tab[data-metric]",
    );

    this.weatherChartWrap = this.weatherChart?.closest(".weather-chart-wrap");
    this.weatherChartTooltip = null;
    this._chartBars = null;
    this._chartLayout = null;
    this._chartRaf = null;
    this._chartAnim = null;
    this._chartHoverIndex = -1;
    this._chartVisibilityObserver = null;
    this._chartInViewport = true;

    this.currentWeather = null;
    this.dailyForecast = null;
    this.hourlyForecast = null;
    this.lastFetch = null;
    this.refreshInterval = null;

    this._resizeTimer = null;
    this._forecastResizeTimer = null; // used for debouncing forecast layout recalcs
    this._weatherCardResizeTimer = null;
    this._responsiveSyncTimer = null;
    this._responsiveSyncRaf1 = null;
    this._responsiveSyncRaf2 = null;
    this._responsiveSyncFrameRaf = null;
    this._responsiveSyncFrameIncludeChart = false;
    this._weatherResizeObserver = null;
    this._weatherContentResizeObserver = null;
    this._weatherMainContainerResizeObserver = null;
    this._weatherCardMutationObserver = null;
    this._weatherLayoutSyncEvents = [
      "md:layout-live-resize",
      "md:settings-applied",
      "md:visibility-changed",
    ];
    this._externalLayoutSyncHandler = (event) => {
      this.handleExternalLayoutLiveResize(event?.detail || {});
    };
    this._weatherCardContentWidth = 0;
    this.selectedForecastIndex = 0;
    this.selectedMetric = "temperature";

    // Reflow handler for chart resize
    this._onResize = () => {
      if (this._resizeTimer) window.clearTimeout(this._resizeTimer);
      this._resizeTimer = window.setTimeout(() => {
        this.queueResponsiveLayoutSyncFrame({ includeChart: false });
        this.scheduleResponsiveLayoutSync({
          includeChart: true,
          settlePass: true,
          debounceMs: 0,
        });
      }, 90);
    };

    // Debounced handler to update forecast flex layout on viewport changes
    this._onForecastResize = () => {
      if (this._forecastResizeTimer)
        window.clearTimeout(this._forecastResizeTimer);
      this._forecastResizeTimer = window.setTimeout(() => {
        this.queueResponsiveLayoutSyncFrame({ includeChart: false });
        this.scheduleResponsiveLayoutSync({
          includeChart: false,
          settlePass: true,
          debounceMs: 0,
        });
      }, 60);
    };

    this._onWeatherCardResize = () => {
      if (this._weatherCardResizeTimer)
        window.clearTimeout(this._weatherCardResizeTimer);
      this._weatherCardResizeTimer = window.setTimeout(() => {
        this.queueResponsiveLayoutSyncFrame({ includeChart: false });
        this.scheduleResponsiveLayoutSync({
          includeChart: true,
          settlePass: true,
          debounceMs: 0,
        });
      }, 40);
    };

    // Listen for resize to update forecast layout (keeps last-row spreading correct)
    window.addEventListener("resize", this._onForecastResize);

    // Listen for icon theme changes
    document.addEventListener("md:icon-theme-change", () => {
      this._refreshWeatherIcons();
    });

    // Keep chart animation behavior in sync with performance mode.
    document.addEventListener("md:performance-mode-change", () => {
      if (this._chartRaf) {
        cancelAnimationFrame(this._chartRaf);
        this._chartRaf = null;
      }
      this._chartAnim = null;
      this.renderHourlyChart();
    });

    // Keep chart animation behavior in sync with highest visual fidelity mode.
    document.addEventListener("md:highest-visual-fidelity-change", () => {
      if (this._chartRaf) {
        cancelAnimationFrame(this._chartRaf);
        this._chartRaf = null;
      }
      this._chartAnim = null;
      this.renderHourlyChart();
    });

    // Weather code to icon/description mapping (WMO codes)
    this.weatherCodes = {
      0: { icon: "☀️", desc: "Clear sky" },
      1: { icon: "🌤️", desc: "Mainly clear" },
      2: { icon: "⛅", desc: "Partly cloudy" },
      3: { icon: "☁️", desc: "Overcast" },
      45: { icon: "🌫️", desc: "Foggy" },
      48: { icon: "🌫️", desc: "Depositing rime fog" },
      51: { icon: "🌧️", desc: "Light drizzle" },
      53: { icon: "🌧️", desc: "Moderate drizzle" },
      55: { icon: "🌧️", desc: "Dense drizzle" },
      56: { icon: "🌧️", desc: "Light freezing drizzle" },
      57: { icon: "🌧️", desc: "Dense freezing drizzle" },
      61: { icon: "🌧️", desc: "Slight rain" },
      63: { icon: "🌧️", desc: "Moderate rain" },
      65: { icon: "🌧️", desc: "Heavy rain" },
      66: { icon: "🌧️", desc: "Light freezing rain" },
      67: { icon: "🌧️", desc: "Heavy freezing rain" },
      71: { icon: "🌨️", desc: "Slight snow" },
      73: { icon: "🌨️", desc: "Moderate snow" },
      75: { icon: "❄️", desc: "Heavy snow" },
      77: { icon: "🌨️", desc: "Snow grains" },
      80: { icon: "🌦️", desc: "Slight rain showers" },
      81: { icon: "🌦️", desc: "Moderate rain showers" },
      82: { icon: "⛈️", desc: "Violent rain showers" },
      85: { icon: "🌨️", desc: "Slight snow showers" },
      86: { icon: "🌨️", desc: "Heavy snow showers" },
      95: { icon: "⛈️", desc: "Thunderstorm" },
      96: { icon: "⛈️", desc: "Thunderstorm with slight hail" },
      99: { icon: "⛈️", desc: "Thunderstorm with heavy hail" },
    };
  }
}

window.WeatherManager = WeatherManager;
