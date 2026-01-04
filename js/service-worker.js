/*
 * MV3 Service Worker
 * Schedules prayer-time notifications using chrome.alarms + chrome.notifications.
 */

/* global PrayTimes */

importScripts("praytimes.js");

const RESCHEDULE_ALARM_NAME = "md_reschedule";
const PRAYER_ALARM_PREFIX = "md_prayer_";

const STORAGE_KEYS = {
  settings: "md_settings",
  lastLocation: "md_lastLocation",
};

const PRAYER_DEFS = [
  { key: "fajr", name: "Fajr" },
  { key: "sunrise", name: "Sunrise" },
  { key: "duha", name: "Duha" },
  { key: "dhuhr", name: "Dhuhr" },
  { key: "asr", name: "Asr" },
  { key: "maghrib", name: "Maghrib" },
  { key: "isha", name: "Isha" },
  { key: "midnight", name: "Midnight" },
  { key: "qiyam", name: "Qiyam" },
];

function storageGet(keys) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(keys, (result) => resolve(result || {}));
    } catch (e) {
      resolve({});
    }
  });
}

function storageSet(obj) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set(obj, () => resolve());
    } catch (e) {
      resolve();
    }
  });
}

function alarmsGetAll() {
  return new Promise((resolve) => {
    try {
      chrome.alarms.getAll((alarms) =>
        resolve(Array.isArray(alarms) ? alarms : [])
      );
    } catch (e) {
      resolve([]);
    }
  });
}

function alarmsClear(name) {
  return new Promise((resolve) => {
    try {
      chrome.alarms.clear(name, () => resolve());
    } catch (e) {
      resolve();
    }
  });
}

function alarmsCreate(name, alarmInfo) {
  try {
    chrome.alarms.create(name, alarmInfo);
  } catch (e) {
    // ignore
  }
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function toISODateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseTimeToDate(timeStr, baseDate) {
  if (!timeStr || timeStr === "-----") return null;

  const match = String(timeStr).match(/(\d+):(\d+)/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  const normalized = String(timeStr).toUpperCase();
  const hasAM = normalized.includes("AM");
  const hasPM = normalized.includes("PM");

  if (hasPM && hours !== 12) hours += 12;
  if (hasAM && hours === 12) hours = 0;

  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    hours,
    minutes,
    0,
    0
  );
}

function configurePrayTimes(prayTimes, settings) {
  prayTimes.setMethod(settings.calculationMethod || "MWL");

  if (settings.calculationMethod === "Custom") {
    prayTimes.setFajrAngle(settings.customFajrAngle ?? 18);
    prayTimes.setIshaAngle(
      settings.customIshaAngle ?? 17,
      settings.customIshaMinutes ?? false
    );
  }

  prayTimes.setAsrMethod(settings.asrMethod || "Standard");
  prayTimes.setHighLatMethod(settings.highLatMethod || "None");
  prayTimes.setMidnightMethod(settings.midnightMethod || "Standard");
  prayTimes.setDuhaOffset(settings.duhaOffset ?? 20);

  if (settings.adjustments && typeof settings.adjustments === "object") {
    prayTimes.tune(settings.adjustments);
  }
}

function pickLocation(settings, lastLocation) {
  if (
    settings.locationMethod === "manual" &&
    Number.isFinite(Number(settings.latitude)) &&
    Number.isFinite(Number(settings.longitude))
  ) {
    return {
      latitude: Number(settings.latitude),
      longitude: Number(settings.longitude),
      city: settings.city || "Custom Location",
    };
  }

  if (
    lastLocation &&
    Number.isFinite(Number(lastLocation.latitude)) &&
    Number.isFinite(Number(lastLocation.longitude))
  ) {
    return {
      latitude: Number(lastLocation.latitude),
      longitude: Number(lastLocation.longitude),
      city: lastLocation.city || "Last Location",
    };
  }

  // Default: Mecca
  return { latitude: 21.4225, longitude: 39.8262, city: "Mecca (Default)" };
}

async function clearPrayerAlarms() {
  const alarms = await alarmsGetAll();
  const toClear = alarms
    .map((a) => a && a.name)
    .filter(
      (name) => typeof name === "string" && name.startsWith(PRAYER_ALARM_PREFIX)
    );

  for (const name of toClear) {
    // eslint-disable-next-line no-await-in-loop
    await alarmsClear(name);
  }
}

function scheduleDailyRescheduleAlarm(now = new Date()) {
  const next = new Date(now);
  next.setDate(now.getDate() + 1);
  next.setHours(0, 5, 0, 0); // 00:05 local time
  alarmsCreate(RESCHEDULE_ALARM_NAME, { when: next.getTime() });
}

function getPrayerNotificationsSettings(settings) {
  const pn =
    settings.prayerNotifications &&
    typeof settings.prayerNotifications === "object"
      ? settings.prayerNotifications
      : {};

  const defaultBeforeMinutes = clampNumber(pn.beforeMinutes, 0, 180, 10);
  const defaultAfterMinutes = clampNumber(pn.afterMinutes, 0, 180, 0);

  const perPrayerRaw =
    pn.perPrayer && typeof pn.perPrayer === "object" ? pn.perPrayer : null;

  const perPrayer = perPrayerRaw ? {} : null;
  if (perPrayerRaw) {
    for (const def of PRAYER_DEFS) {
      const entry = perPrayerRaw[def.key];

      // Legacy shape: boolean per prayer.
      if (typeof entry === "boolean") {
        perPrayer[def.key] = {
          enabled: entry === true,
          beforeMinutes: defaultBeforeMinutes,
          afterMinutes: defaultAfterMinutes,
          atTimeEnabled: true,
        };
        continue;
      }

      // New shape: object per prayer.
      if (entry && typeof entry === "object") {
        perPrayer[def.key] = {
          enabled: entry.enabled === true,
          beforeMinutes: clampNumber(
            entry.beforeMinutes,
            0,
            180,
            defaultBeforeMinutes
          ),
          afterMinutes: clampNumber(
            entry.afterMinutes,
            0,
            180,
            defaultAfterMinutes
          ),
          atTimeEnabled: true,
        };
      }
    }
  }

  return {
    enabled: Boolean(pn.enabled),
    defaultBeforeMinutes,
    defaultAfterMinutes,
    // at-time notification always on when enabled
    atTimeEnabled: true,
    perPrayer,
  };
}

function getPrayerNotificationConfig(prayerKey, settings, pn) {
  if (!pn.enabled) return null;

  // If user explicitly configured perPrayer, use it.
  if (pn.perPrayer) {
    const cfg = pn.perPrayer[prayerKey];
    if (!cfg || cfg.enabled !== true) return null;
    return cfg;
  }

  // Fallback: notify for visible prayers, using defaults.
  const vis =
    settings.prayerVisibility && typeof settings.prayerVisibility === "object"
      ? settings.prayerVisibility
      : {};
  if (vis[prayerKey] !== true) return null;

  return {
    enabled: true,
    beforeMinutes: pn.defaultBeforeMinutes,
    afterMinutes: pn.defaultAfterMinutes,
    atTimeEnabled: true,
  };
}

async function schedulePrayerNotifications() {
  const {
    [STORAGE_KEYS.settings]: settingsRaw,
    [STORAGE_KEYS.lastLocation]: lastLocationRaw,
  } = await storageGet([STORAGE_KEYS.settings, STORAGE_KEYS.lastLocation]);

  const settings =
    settingsRaw && typeof settingsRaw === "object" ? settingsRaw : {};
  const lastLocation =
    lastLocationRaw && typeof lastLocationRaw === "object"
      ? lastLocationRaw
      : null;

  const pn = getPrayerNotificationsSettings(settings);

  // Always clear existing alarms so we don't duplicate.
  await clearPrayerAlarms();

  // Keep the daily rescheduler alive.
  scheduleDailyRescheduleAlarm(new Date());

  if (!pn.enabled) return;

  const location = pickLocation(settings, lastLocation);
  const prayTimes = new PrayTimes();
  configurePrayTimes(prayTimes, settings);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const timeFormat = settings.timeFormat || "24h";

  const times = prayTimes.getTimes(
    today,
    [location.latitude, location.longitude],
    "auto",
    "auto",
    timeFormat
  );

  // Store a small cache for debugging/visibility.
  await storageSet({
    md_prayerTimes_cache: {
      date: toISODateKey(today),
      location,
      timeFormat,
      times,
      scheduledAt: Date.now(),
    },
  });

  for (const def of PRAYER_DEFS) {
    const cfg = getPrayerNotificationConfig(def.key, settings, pn);
    if (!cfg) continue;

    const baseTimeStr = times[def.key];
    const baseDate = parseTimeToDate(baseTimeStr, today);
    if (!baseDate) continue;

    // Base (at-time)
    if (pn.atTimeEnabled && cfg.atTimeEnabled) {
      const when = baseDate.getTime();
      if (when > Date.now() + 1000) {
        alarmsCreate(`${PRAYER_ALARM_PREFIX}${def.key}_at`, { when });
      }
    }

    // Before
    if (cfg.beforeMinutes > 0) {
      const when = baseDate.getTime() - cfg.beforeMinutes * 60 * 1000;
      if (when > Date.now() + 1000) {
        alarmsCreate(`${PRAYER_ALARM_PREFIX}${def.key}_before`, { when });
      }
    }

    // After
    if (cfg.afterMinutes > 0) {
      const when = baseDate.getTime() + cfg.afterMinutes * 60 * 1000;
      if (when > Date.now() + 1000) {
        alarmsCreate(`${PRAYER_ALARM_PREFIX}${def.key}_after`, { when });
      }
    }
  }
}

function getPrayerName(prayerKey) {
  return PRAYER_DEFS.find((p) => p.key === prayerKey)?.name || prayerKey;
}

function showPrayerNotification(prayerKey, kind) {
  const titleBase = `${getPrayerName(prayerKey)}${kind === "at" ? "" : ""}`;

  let message = "";
  if (kind === "before") message = "Upcoming prayer time";
  else if (kind === "after") message = "Prayer reminder";
  else message = "It’s time to pray";

  const notificationId = `${PRAYER_ALARM_PREFIX}${prayerKey}_${kind}_${Date.now()}`;

  const iconUrl =
    typeof chrome !== "undefined" && chrome.runtime?.getURL
      ? chrome.runtime.getURL("icons/icon128.png")
      : "icons/icon128.png";

  try {
    chrome.notifications.create(
      notificationId,
      {
        type: "basic",
        iconUrl,
        title: titleBase,
        message,
        priority: 1,
      },
      () => {
        const err = chrome.runtime?.lastError;
        if (err) {
          // Best-effort debugging aid.
          storageSet({
            md_prayerNotifications_lastError: {
              at: Date.now(),
              message: err.message || String(err),
              prayerKey,
              kind,
            },
          });
        }
      }
    );
  } catch (e) {
    storageSet({
      md_prayerNotifications_lastError: {
        at: Date.now(),
        message: e?.message || String(e),
        prayerKey,
        kind,
      },
    });
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  const name = alarm?.name;
  if (name === RESCHEDULE_ALARM_NAME) {
    schedulePrayerNotifications();
    return;
  }

  if (typeof name !== "string" || !name.startsWith(PRAYER_ALARM_PREFIX)) return;

  const tail = name.slice(PRAYER_ALARM_PREFIX.length);
  const parts = tail.split("_");
  const prayerKey = parts[0];
  const kind = parts[1] || "at";

  showPrayerNotification(prayerKey, kind);
});

chrome.runtime.onInstalled.addListener(() => {
  schedulePrayerNotifications();
});

chrome.runtime.onStartup?.addListener?.(() => {
  schedulePrayerNotifications();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;

  if (changes[STORAGE_KEYS.settings] || changes[STORAGE_KEYS.lastLocation]) {
    schedulePrayerNotifications();
  }
});
