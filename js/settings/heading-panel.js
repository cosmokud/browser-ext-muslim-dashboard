/**
 * SettingsManager: heading and visibility panel.
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

  loadHeadingSettings(settings) {
    const heading = settings.heading || {};

    const normalizeHeadingDateFormat = (format, legacyShowWeekday) => {
      const normalized = String(format || "").trim();
      const newValues = new Set([
        "full-weekday",
        "full",
        "medium-weekday",
        "medium",
        "short",
      ]);

      if (newValues.has(normalized)) return normalized;

      if (normalized === "full") {
        return legacyShowWeekday === false ? "full" : "full-weekday";
      }
      if (normalized === "long") {
        return "full";
      }
      if (normalized === "medium") {
        return legacyShowWeekday === false ? "medium" : "medium-weekday";
      }
      if (normalized === "short") {
        return "short";
      }

      return legacyShowWeekday === false ? "full" : "full-weekday";
    };

    // Greeting type
    const useCustom = heading.useCustomGreeting || false;
    const greetingRadio = document.querySelector(
      `input[name="greetingType"][value="${useCustom ? "custom" : "auto"}"]`,
    );
    if (greetingRadio) greetingRadio.checked = true;
    this.toggleCustomGreeting(useCustom);

    // Custom greeting text
    if (this.customGreetingInput) {
      this.customGreetingInput.value = heading.customGreeting || "";
    }

    // Time-based greetings
    const timeRanges = heading.greetingTimeRanges || {};
    if (this.greetingMorning)
      this.greetingMorning.value =
        timeRanges.morning?.text || "As-salamu alaykum, Good Morning";
    if (this.greetingAfternoon)
      this.greetingAfternoon.value =
        timeRanges.afternoon?.text || "As-salamu alaykum, Good Afternoon";
    if (this.greetingEvening)
      this.greetingEvening.value =
        timeRanges.evening?.text || "As-salamu alaykum, Good Evening";
    if (this.greetingNight)
      this.greetingNight.value =
        timeRanges.night?.text || "As-salamu alaykum, Good Night";

    // Clock settings
    if (this.showGreeting)
      this.showGreeting.checked = heading.showGreeting !== false;

    if (this.showClock) this.showClock.checked = heading.showClock !== false;
    this.toggleClockOptions(heading.showClock !== false);

    const clockFormat = heading.clockFormat || "24h";
    const clockFormatRadio = document.querySelector(
      `input[name="clockFormat"][value="${clockFormat}"]`,
    );
    if (clockFormatRadio) clockFormatRadio.checked = true;
    this.toggleAmPmOption(clockFormat === "12h");

    if (this.showSeconds)
      this.showSeconds.checked = heading.showSeconds !== false;
    if (this.showAmPm) this.showAmPm.checked = heading.showAmPm !== false;
    if (this.showNextPrayer)
      this.showNextPrayer.checked = heading.showNextPrayer === true;

    const clockStyle = heading.clockStyle || "default";
    const clockStyleRadio = document.querySelector(
      `input[name="clockStyle"][value="${clockStyle}"]`,
    );
    if (clockStyleRadio) clockStyleRadio.checked = true;

    // Date settings
    if (this.showDate) this.showDate.checked = heading.showDate !== false;
    if (this.showIslamicEvents)
      this.showIslamicEvents.checked = heading.showIslamicEvents !== false;
    if (this.dateFormatSelect) {
      const normalizedDateFormat = normalizeHeadingDateFormat(
        heading.dateFormat || "full",
        heading.showWeekday,
      );
      this.dateFormatSelect.value = normalizedDateFormat;
    }

    const dateCalendar = heading.dateCalendar || "hijri";
    const dateCalendarRadio = document.querySelector(
      `input[name="dateCalendar"][value="${dateCalendar}"]`,
    );
    if (dateCalendarRadio) dateCalendarRadio.checked = true;

    if (this.headerWholeComponentSurfaceEnabled) {
      this.headerWholeComponentSurfaceEnabled.checked =
        heading.wholeComponentSurfaceEnabled === true;
    }
    if (this.headerGreetingBgEnabled) {
      this.headerGreetingBgEnabled.checked =
        heading.greetingBackgroundEnabled === true;
    }
    if (this.headerDateBgEnabled) {
      this.headerDateBgEnabled.checked = heading.dateBackgroundEnabled === true;
    }
    if (this.headerTimeBgEnabled) {
      this.headerTimeBgEnabled.checked = heading.timeBackgroundEnabled === true;
    }
    if (this.headerNextPrayerBgEnabled) {
      this.headerNextPrayerBgEnabled.checked =
        heading.nextPrayerBackgroundEnabled === true;
    }
    if (this.headerCompactWeatherBgEnabled) {
      this.headerCompactWeatherBgEnabled.checked =
        heading.compactWeatherBackgroundEnabled === true;
    }

    this.syncClockSurfaceToggleState(clockStyle);

    this.getHeaderTextColorControlConfigs().forEach((config) => {
      this.loadHeaderColorControlValue(config, heading[config.settingKey]);
    });

    if (this.headerGreetingGlowEnabled) {
      this.headerGreetingGlowEnabled.checked =
        heading.greetingGlowEnabled === true;
    }
    if (this.headerGreetingGlowColor) {
      const fallback = this.getAutoHeaderGlowColor("#greeting");
      this.headerGreetingGlowColor.value = this.normalizeColorHex(
        heading.greetingGlowColor,
        fallback,
      );
    }
    if (this.headerGreetingGlowOpacity) {
      this.headerGreetingGlowOpacity.value = String(
        this.clampHeaderGlowOpacity(heading.greetingGlowOpacity, 72),
      );
    }
    if (this.headerGreetingGlowRadius) {
      this.headerGreetingGlowRadius.value = String(
        this.clampHeaderGlowRadius(heading.greetingGlowRadius, 14),
      );
    }

    if (this.headerDateGlowEnabled) {
      this.headerDateGlowEnabled.checked = heading.dateGlowEnabled === true;
    }
    if (this.headerDateGlowColor) {
      const fallback = this.getAutoHeaderGlowColor("#dateDisplay");
      this.headerDateGlowColor.value = this.normalizeColorHex(
        heading.dateGlowColor,
        fallback,
      );
    }
    if (this.headerDateGlowOpacity) {
      this.headerDateGlowOpacity.value = String(
        this.clampHeaderGlowOpacity(heading.dateGlowOpacity, 72),
      );
    }
    if (this.headerDateGlowRadius) {
      this.headerDateGlowRadius.value = String(
        this.clampHeaderGlowRadius(heading.dateGlowRadius, 14),
      );
    }

    if (this.headerTimeGlowEnabled) {
      this.headerTimeGlowEnabled.checked = heading.timeGlowEnabled === true;
    }
    if (this.headerTimeGlowColor) {
      const fallback = this.getAutoHeaderGlowColor("#currentTime");
      this.headerTimeGlowColor.value = this.normalizeColorHex(
        heading.timeGlowColor,
        fallback,
      );
    }
    if (this.headerTimeGlowOpacity) {
      this.headerTimeGlowOpacity.value = String(
        this.clampHeaderGlowOpacity(heading.timeGlowOpacity, 72),
      );
    }
    if (this.headerTimeGlowRadius) {
      this.headerTimeGlowRadius.value = String(
        this.clampHeaderGlowRadius(heading.timeGlowRadius, 14),
      );
    }

    if (this.headerNextPrayerGlowEnabled) {
      this.headerNextPrayerGlowEnabled.checked =
        heading.nextPrayerGlowEnabled === true;
    }
    if (this.headerNextPrayerGlowColor) {
      const fallback = this.getAutoHeaderGlowColor("#headerNextPrayer");
      this.headerNextPrayerGlowColor.value = this.normalizeColorHex(
        heading.nextPrayerGlowColor,
        fallback,
      );
    }
    if (this.headerNextPrayerGlowOpacity) {
      this.headerNextPrayerGlowOpacity.value = String(
        this.clampHeaderGlowOpacity(heading.nextPrayerGlowOpacity, 72),
      );
    }
    if (this.headerNextPrayerGlowRadius) {
      this.headerNextPrayerGlowRadius.value = String(
        this.clampHeaderGlowRadius(heading.nextPrayerGlowRadius, 14),
      );
    }

    if (this.headerCompactWeatherGlowEnabled) {
      this.headerCompactWeatherGlowEnabled.checked =
        heading.compactWeatherGlowEnabled === true;
    }
    if (this.headerCompactWeatherGlowColor) {
      const fallback = this.getAutoHeaderGlowColor(
        "#compactWeather .compact-weather-temp",
      );
      this.headerCompactWeatherGlowColor.value = this.normalizeColorHex(
        heading.compactWeatherGlowColor,
        fallback,
      );
    }
    if (this.headerCompactWeatherGlowOpacity) {
      this.headerCompactWeatherGlowOpacity.value = String(
        this.clampHeaderGlowOpacity(heading.compactWeatherGlowOpacity, 72),
      );
    }
    if (this.headerCompactWeatherGlowRadius) {
      this.headerCompactWeatherGlowRadius.value = String(
        this.clampHeaderGlowRadius(heading.compactWeatherGlowRadius, 14),
      );
    }

    this.getHeaderGlowControlConfigs().forEach((config) => {
      this.loadHeaderColorControlValue(config, heading[config.settingKey]);
    });

    this.updateHeaderGlowTuningUi();
    this.updateHeaderGlowColorLockState();

    this.updateHeaderSurfaceBackgroundsLockState();
  }

  loadVisibilitySettings(settings) {
    const visibility = settings.componentVisibility || {};
    const heading = settings.heading || {};

    if (this.visibilityHeader)
      this.visibilityHeader.checked = visibility.header !== false;
    if (this.visibilityQuickPins)
      this.visibilityQuickPins.checked = visibility.quickPins !== false;
    if (this.visibilitySearchBar)
      this.visibilitySearchBar.checked = visibility.searchBar !== false;
    if (this.visibilityQuotes)
      this.visibilityQuotes.checked = visibility.quotes !== false;
    if (this.visibilityPrayerTimes)
      this.visibilityPrayerTimes.checked = visibility.prayerTimes !== false;
    if (this.visibilityHijriCalendar)
      this.visibilityHijriCalendar.checked = visibility.hijriCalendar !== false;
    if (this.visibilityQiblaDirection)
      this.visibilityQiblaDirection.checked =
        visibility.qiblaDirection !== false;
    if (this.visibilityWeather)
      this.visibilityWeather.checked = visibility.weather !== false;
    if (this.visibilityLunarPhase)
      this.visibilityLunarPhase.checked = visibility.lunarPhase !== false;
    if (this.visibilityFasting)
      this.visibilityFasting.checked = visibility.fasting !== false;
    if (this.visibilityFlashcards)
      this.visibilityFlashcards.checked = visibility.flashcards !== false;
    if (this.visibilityAdhkar)
      this.visibilityAdhkar.checked = visibility.adhkar !== false;
    if (this.visibilityHadith)
      this.visibilityHadith.checked = visibility.hadith !== false;
    if (this.visibilityTodoList)
      this.visibilityTodoList.checked = visibility.todoList !== false;
    if (this.visibilityNotes)
      this.visibilityNotes.checked = visibility.notes !== false;
    if (this.visibilityPocketQuran)
      this.visibilityPocketQuran.checked = visibility.pocketQuran !== false;

    if (this.momentVisibilityPrayerTimes)
      this.momentVisibilityPrayerTimes.checked =
        visibility.prayerTimes !== false;
    if (this.momentVisibilityFasting)
      this.momentVisibilityFasting.checked = visibility.fasting !== false;
    if (this.momentVisibilityQuotes)
      this.momentVisibilityQuotes.checked = visibility.quotes !== false;
    if (this.momentVisibilityQuickPins)
      this.momentVisibilityQuickPins.checked = visibility.quickPins !== false;
    if (this.momentVisibilitySearchBar)
      this.momentVisibilitySearchBar.checked = visibility.searchBar !== false;
    if (this.momentVisibilityClock)
      this.momentVisibilityClock.checked = heading.showClock !== false;
  }
});
