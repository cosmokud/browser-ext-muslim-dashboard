/**
 * SettingsManager: per panel save handlers.
 * Part of the class declared in js/settings/index.js; load this after it.
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
})(SettingsManager.prototype, class {

  saveHeadingSettings(settings) {
    const greetingTypeRadio = document.querySelector(
      'input[name="greetingType"]:checked',
    );
    const useCustomGreeting = greetingTypeRadio?.value === "custom";

    settings.heading = settings.heading || {};
    settings.heading.useCustomGreeting = useCustomGreeting;
    settings.heading.customGreeting = this.customGreetingInput?.value || "";
    settings.heading.showGreeting = this.showGreeting?.checked ?? true;

    // Time-based greetings
    settings.heading.greetingTimeRanges = {
      morning: {
        start: 3,
        end: 12,
        text: this.greetingMorning?.value || "As-salamu alaykum, Good Morning",
      },
      afternoon: {
        start: 12,
        end: 15,
        text:
          this.greetingAfternoon?.value || "As-salamu alaykum, Good Afternoon",
      },
      evening: {
        start: 15,
        end: 18,
        text: this.greetingEvening?.value || "As-salamu alaykum, Good Evening",
      },
      night: {
        start: 18,
        end: 3,
        text: this.greetingNight?.value || "As-salamu alaykum, Good Night",
      },
    };

    // Clock settings
    settings.heading.showClock = this.showClock?.checked ?? true;
    const clockFormatRadio = document.querySelector(
      'input[name="clockFormat"]:checked',
    );
    settings.heading.clockFormat = clockFormatRadio?.value || "24h";
    settings.heading.showSeconds = this.showSeconds?.checked ?? true;
    settings.heading.showAmPm = this.showAmPm?.checked ?? true;
    settings.heading.showNextPrayer = this.showNextPrayer?.checked === true;
    const clockStyleRadio = document.querySelector(
      'input[name="clockStyle"]:checked',
    );
    const selectedClockStyle = clockStyleRadio?.value || "default";
    const clockSurfaceLocked =
      this.isClockSurfaceLockedByStyle(selectedClockStyle);

    settings.heading.clockStyle = selectedClockStyle;

    // Date settings
    settings.heading.showDate = this.showDate?.checked ?? true;
    settings.heading.showIslamicEvents =
      this.showIslamicEvents?.checked ?? true;
    settings.heading.dateFormat =
      this.dateFormatSelect?.value || "full-weekday";
    const dateCalendarRadio = document.querySelector(
      'input[name="dateCalendar"]:checked',
    );
    settings.heading.dateCalendar = dateCalendarRadio?.value || "hijri";

    settings.heading.wholeComponentSurfaceEnabled =
      this.headerWholeComponentSurfaceEnabled?.checked === true;
    settings.heading.greetingBackgroundEnabled =
      this.headerGreetingBgEnabled?.checked === true;
    settings.heading.dateBackgroundEnabled =
      this.headerDateBgEnabled?.checked === true;
    settings.heading.timeBackgroundEnabled = clockSurfaceLocked
      ? false
      : this.headerTimeBgEnabled?.checked === true;
    settings.heading.nextPrayerBackgroundEnabled =
      this.headerNextPrayerBgEnabled?.checked === true;
    settings.heading.compactWeatherBackgroundEnabled =
      this.headerCompactWeatherBgEnabled?.checked === true;

    settings.heading.greetingTextColor = this.getHeaderColorControlSaveValue(
      this.headerGreetingTextColor,
    );
    settings.heading.dateTextColor = this.getHeaderColorControlSaveValue(
      this.headerDateTextColor,
    );
    settings.heading.timeTextColor = this.getHeaderColorControlSaveValue(
      this.headerTimeTextColor,
    );
    settings.heading.nextPrayerTextColor = this.getHeaderColorControlSaveValue(
      this.headerNextPrayerTextColor,
    );
    settings.heading.compactWeatherTextColor =
      this.getHeaderColorControlSaveValue(this.headerCompactWeatherTextColor);

    settings.heading.greetingGlowEnabled =
      this.headerGreetingGlowEnabled?.checked === true;
    settings.heading.greetingGlowColor = settings.heading.greetingGlowEnabled
      ? this.getHeaderColorControlSaveValue(this.headerGreetingGlowColor)
      : "";
    settings.heading.greetingGlowOpacity = this.clampHeaderGlowOpacity(
      this.headerGreetingGlowOpacity?.value,
      72,
    );
    settings.heading.greetingGlowRadius = this.clampHeaderGlowRadius(
      this.headerGreetingGlowRadius?.value,
      14,
    );

    settings.heading.dateGlowEnabled =
      this.headerDateGlowEnabled?.checked === true;
    settings.heading.dateGlowColor = settings.heading.dateGlowEnabled
      ? this.getHeaderColorControlSaveValue(this.headerDateGlowColor)
      : "";
    settings.heading.dateGlowOpacity = this.clampHeaderGlowOpacity(
      this.headerDateGlowOpacity?.value,
      72,
    );
    settings.heading.dateGlowRadius = this.clampHeaderGlowRadius(
      this.headerDateGlowRadius?.value,
      14,
    );

    settings.heading.timeGlowEnabled =
      this.headerTimeGlowEnabled?.checked === true;
    settings.heading.timeGlowColor = settings.heading.timeGlowEnabled
      ? this.getHeaderColorControlSaveValue(this.headerTimeGlowColor)
      : "";
    settings.heading.timeGlowOpacity = this.clampHeaderGlowOpacity(
      this.headerTimeGlowOpacity?.value,
      72,
    );
    settings.heading.timeGlowRadius = this.clampHeaderGlowRadius(
      this.headerTimeGlowRadius?.value,
      14,
    );

    settings.heading.nextPrayerGlowEnabled =
      this.headerNextPrayerGlowEnabled?.checked === true;
    settings.heading.nextPrayerGlowColor = settings.heading
      .nextPrayerGlowEnabled
      ? this.getHeaderColorControlSaveValue(this.headerNextPrayerGlowColor)
      : "";
    settings.heading.nextPrayerGlowOpacity = this.clampHeaderGlowOpacity(
      this.headerNextPrayerGlowOpacity?.value,
      72,
    );
    settings.heading.nextPrayerGlowRadius = this.clampHeaderGlowRadius(
      this.headerNextPrayerGlowRadius?.value,
      14,
    );

    settings.heading.compactWeatherGlowEnabled =
      this.headerCompactWeatherGlowEnabled?.checked === true;
    settings.heading.compactWeatherGlowColor = settings.heading
      .compactWeatherGlowEnabled
      ? this.getHeaderColorControlSaveValue(
          this.headerCompactWeatherGlowColor,
        )
      : "";
    settings.heading.compactWeatherGlowOpacity = this.clampHeaderGlowOpacity(
      this.headerCompactWeatherGlowOpacity?.value,
      72,
    );
    settings.heading.compactWeatherGlowRadius = this.clampHeaderGlowRadius(
      this.headerCompactWeatherGlowRadius?.value,
      14,
    );
  }

  saveVisibilitySettings(settings) {
    settings.componentVisibility = {
      header: this.visibilityHeader?.checked ?? true,
      quickPins: this.visibilityQuickPins?.checked ?? true,
      searchBar: this.visibilitySearchBar?.checked ?? true,
      quotes: this.visibilityQuotes?.checked ?? true,
      prayerTimes: this.visibilityPrayerTimes?.checked ?? true,
      hijriCalendar: this.visibilityHijriCalendar?.checked ?? true,
      qiblaDirection: this.visibilityQiblaDirection?.checked ?? true,
      weather: this.visibilityWeather?.checked ?? true,
      lunarPhase: this.visibilityLunarPhase?.checked ?? true,
      fasting: this.visibilityFasting?.checked ?? true,
      flashcards: this.visibilityFlashcards?.checked ?? true,
      adhkar: this.visibilityAdhkar?.checked ?? true,
      hadith: this.visibilityHadith?.checked ?? true,
      todoList: this.visibilityTodoList?.checked ?? true,
      notes: this.visibilityNotes?.checked ?? true,
      pocketQuran: this.visibilityPocketQuran?.checked ?? true,
    };
  }

  saveWeatherSettings(settings) {
    const weatherUnitRadio = document.querySelector(
      'input[name="weatherUnit"]:checked',
    );
    settings.weatherUnit = weatherUnitRadio?.value || "celsius";

    const weatherLocationModeRadio = document.querySelector(
      'input[name="weatherLocationMode"]:checked',
    );
    settings.weatherLocationMode =
      weatherLocationModeRadio?.value || "dashboard";
    settings.weatherCity = this.weatherCityInput?.value || "";
    settings.weatherLatitude = this.weatherLatitudeInput?.value
      ? parseFloat(this.weatherLatitudeInput.value)
      : null;
    settings.weatherLongitude = this.weatherLongitudeInput?.value
      ? parseFloat(this.weatherLongitudeInput.value)
      : null;
  }

  saveFastingSettings(settings) {
    settings.fasting = settings.fasting || {};

    // Visibility toggles
    settings.fasting.visibility = {
      monday: this.fastingShowMonday?.checked ?? true,
      thursday: this.fastingShowThursday?.checked ?? true,
      ayyamAlBeed: this.fastingShowAyyamAlBeed?.checked ?? true,
      ashuraDays: this.fastingShowAshuraDays?.checked ?? true,
      dhuAlHijjah: this.fastingShowDhuAlHijjah?.checked ?? true,
      arafah: this.fastingShowArafah?.checked ?? true,
      ramadan: this.fastingShowRamadan?.checked ?? true,
    };

    settings.fasting.showRecommendations =
      this.fastingShowRecommendations?.checked ?? true;

    settings.fasting.hijriCalendar = SettingsRegistry.coerce(
      "fasting.hijriCalendar",
      this.fastingHijriCalendar?.value,
    );

    // Within days settings
    settings.fasting.dhuAlHijjahWithinDays = SettingsRegistry.coerce(
      "fasting.dhuAlHijjahWithinDays",
      parseInt(this.fastingDhuAlHijjahWithinDays?.value, 10),
    );
    settings.fasting.arafahWithinDays = SettingsRegistry.coerce(
      "fasting.arafahWithinDays",
      parseInt(this.fastingArafahWithinDays?.value, 10),
    );
    settings.fasting.ashuraWithinDays = SettingsRegistry.coerce(
      "fasting.ashuraWithinDays",
      parseInt(this.fastingAshuraWithinDays?.value, 10),
    );

    // Notification settings
    settings.fasting.notifications = {
      enabled: this.fastingNotificationsEnabled?.checked ?? false,
      minutesBefore: SettingsRegistry.coerce(
        "fasting.notifications.minutesBefore",
        parseInt(this.fastingNotificationMinutesBefore?.value, 10),
        ),
        notify: {
        monday: this.fastingNotifyMonday?.checked ?? true,
        thursday: this.fastingNotifyThursday?.checked ?? true,
        ayyamAlBeed: this.fastingNotifyAyyamAlBeed?.checked ?? true,
        ashuraDays: this.fastingNotifyAshuraDays?.checked ?? true,
        dhuAlHijjah: this.fastingNotifyDhuAlHijjah?.checked ?? true,
        arafah: this.fastingNotifyArafah?.checked ?? true,
        ramadan: this.fastingNotifyRamadan?.checked ?? true,
        },
        };
        
        // Trigger reschedule of fasting notifications
        try {
        if (
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        chrome.runtime.sendMessage
        ) {
        chrome.runtime.sendMessage({ type: "md_reschedule_fasting" });
        }
        } catch (e) {
        // ignore
        }
        }
});
