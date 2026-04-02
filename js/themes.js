/**
 * Theme Manager
 * Comprehensive theming system with dark/light modes, color palettes, and transparency controls.
 * Supports 10+ themes per mode with rainbow color spectrum coverage.
 */

class ThemeManager {
  // Default theme (Pure White - clean minimalist theme)
  static DEFAULT_THEME = "pureWhite";
  static DEFAULT_MODE = "dark";

  // Theme definitions with color palettes for both dark and light modes
  static THEMES = {
    // ═══════════════════════════════════════════════════════════════════════════
    // GREEN SPECTRUM
    // ═══════════════════════════════════════════════════════════════════════════
    emerald: {
      name: "Emerald",
      icon: "💎",
      description: "Classic Islamic green - the original glass theme",
      dark: {
        primary: "#1a5f4a",
        primaryLight: "#2d8a6e",
        primaryDark: "#0d3d2e",
        accent: "#d4af37",
        accentLight: "#e6c866",
        accentBlue: "#0066cc",
        settingsColor: "#0066aa",
        settingsLight: "#2b9bff",
        glassBg: "rgba(26, 95, 74, 0.35)",
        glassBgHover: "rgba(26, 95, 74, 0.45)",
        glassBorder: "rgba(45, 138, 110, 0.4)",
        textPrimary: "#ffffff",
        textSecondary: "rgba(255, 255, 255, 0.85)",
        textMuted: "rgba(255, 255, 255, 0.6)",
        bodyBg: "#1a1a2e",
      },
      light: {
        primary: "#2d8a6e",
        primaryLight: "#3da87f",
        primaryDark: "#1a5f4a",
        accent: "#b8941f",
        accentLight: "#d4af37",
        accentBlue: "#0077dd",
        settingsColor: "#0077bb",
        settingsLight: "#3ca8ff",
        glassBg: "rgba(45, 138, 110, 0.18)",
        glassBgHover: "rgba(45, 138, 110, 0.25)",
        glassBorder: "rgba(26, 95, 74, 0.3)",
        textPrimary: "#1a1a2e",
        textSecondary: "rgba(0, 0, 0, 0.75)",
        textMuted: "rgba(0, 0, 0, 0.55)",
        bodyBg: "#f0f4f3",
      },
    },

    forest: {
      name: "Forest",
      icon: "🌲",
      description: "Deep forest green with earthy tones",
      dark: {
        primary: "#2d5a3d",
        primaryLight: "#3d7a4d",
        primaryDark: "#1d3a2d",
        accent: "#c9a227",
        accentLight: "#dab847",
        accentBlue: "#4a90a4",
        settingsColor: "#4a7a8a",
        settingsLight: "#5aa0b0",
        glassBg: "rgba(45, 90, 61, 0.35)",
        glassBgHover: "rgba(45, 90, 61, 0.45)",
        glassBorder: "rgba(61, 122, 77, 0.4)",
        textPrimary: "#ffffff",
        textSecondary: "rgba(255, 255, 255, 0.85)",
        textMuted: "rgba(255, 255, 255, 0.6)",
        bodyBg: "#1a2520",
      },
      light: {
        primary: "#3d7a4d",
        primaryLight: "#4d9a5d",
        primaryDark: "#2d5a3d",
        accent: "#a88210",
        accentLight: "#c9a227",
        accentBlue: "#5aa0b4",
        settingsColor: "#5a8a9a",
        settingsLight: "#6ab0c0",
        glassBg: "rgba(61, 122, 77, 0.18)",
        glassBgHover: "rgba(61, 122, 77, 0.25)",
        glassBorder: "rgba(45, 90, 61, 0.3)",
        textPrimary: "#1a2520",
        textSecondary: "rgba(0, 0, 0, 0.75)",
        textMuted: "rgba(0, 0, 0, 0.55)",
        bodyBg: "#f2f5f0",
      },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // BLUE SPECTRUM
    // ═══════════════════════════════════════════════════════════════════════════
    ocean: {
      name: "Ocean",
      icon: "🌊",
      description: "Deep ocean blue with coral accents",
      dark: {
        primary: "#1a4a6a",
        primaryLight: "#2a6a8a",
        primaryDark: "#0d2a4a",
        accent: "#ff7f50",
        accentLight: "#ffa07a",
        accentBlue: "#3498db",
        settingsColor: "#2980b9",
        settingsLight: "#5dade2",
        glassBg: "rgba(26, 74, 106, 0.35)",
        glassBgHover: "rgba(26, 74, 106, 0.45)",
        glassBorder: "rgba(42, 106, 138, 0.4)",
        textPrimary: "#ffffff",
        textSecondary: "rgba(255, 255, 255, 0.85)",
        textMuted: "rgba(255, 255, 255, 0.6)",
        bodyBg: "#0d1b2a",
      },
      light: {
        primary: "#2980b9",
        primaryLight: "#3498db",
        primaryDark: "#1a5276",
        accent: "#e65c00",
        accentLight: "#ff7f50",
        accentBlue: "#5dade2",
        settingsColor: "#3498db",
        settingsLight: "#85c1e9",
        glassBg: "rgba(41, 128, 185, 0.18)",
        glassBgHover: "rgba(41, 128, 185, 0.25)",
        glassBorder: "rgba(26, 82, 118, 0.3)",
        textPrimary: "#0d1b2a",
        textSecondary: "rgba(0, 0, 0, 0.75)",
        textMuted: "rgba(0, 0, 0, 0.55)",
        bodyBg: "#e8f4fc",
      },
    },

    sapphire: {
      name: "Sapphire",
      icon: "💠",
      description: "Royal blue with silver highlights",
      dark: {
        primary: "#1e3a5f",
        primaryLight: "#2e5a8f",
        primaryDark: "#0e2a4f",
        accent: "#c0c0c0",
        accentLight: "#d8d8d8",
        accentBlue: "#4a90d9",
        settingsColor: "#4a80c9",
        settingsLight: "#6aa0e9",
        glassBg: "rgba(30, 58, 95, 0.35)",
        glassBgHover: "rgba(30, 58, 95, 0.45)",
        glassBorder: "rgba(46, 90, 143, 0.4)",
        textPrimary: "#ffffff",
        textSecondary: "rgba(255, 255, 255, 0.85)",
        textMuted: "rgba(255, 255, 255, 0.6)",
        bodyBg: "#0a1929",
      },
      light: {
        primary: "#2e5a8f",
        primaryLight: "#4a7ab0",
        primaryDark: "#1e3a5f",
        accent: "#808080",
        accentLight: "#a0a0a0",
        accentBlue: "#6aa0e9",
        settingsColor: "#5a90d9",
        settingsLight: "#8ab0f9",
        glassBg: "rgba(46, 90, 143, 0.18)",
        glassBgHover: "rgba(46, 90, 143, 0.25)",
        glassBorder: "rgba(30, 58, 95, 0.3)",
        textPrimary: "#0a1929",
        textSecondary: "rgba(0, 0, 0, 0.75)",
        textMuted: "rgba(0, 0, 0, 0.55)",
        bodyBg: "#eef4fa",
      },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // PURPLE SPECTRUM
    // ═══════════════════════════════════════════════════════════════════════════
    amethyst: {
      name: "Amethyst",
      icon: "🔮",
      description: "Rich purple with mystical vibes",
      dark: {
        primary: "#5a3d7a",
        primaryLight: "#7a5d9a",
        primaryDark: "#3a2d5a",
        accent: "#ffd700",
        accentLight: "#ffe44d",
        accentBlue: "#9b59b6",
        settingsColor: "#8e44ad",
        settingsLight: "#bb6bd9",
        glassBg: "rgba(90, 61, 122, 0.35)",
        glassBgHover: "rgba(90, 61, 122, 0.45)",
        glassBorder: "rgba(122, 93, 154, 0.4)",
        textPrimary: "#ffffff",
        textSecondary: "rgba(255, 255, 255, 0.85)",
        textMuted: "rgba(255, 255, 255, 0.6)",
        bodyBg: "#1a1225",
      },
      light: {
        primary: "#7a5d9a",
        primaryLight: "#9a7dba",
        primaryDark: "#5a3d7a",
        accent: "#c9a000",
        accentLight: "#e6b800",
        accentBlue: "#bb6bd9",
        settingsColor: "#9b59b6",
        settingsLight: "#d98be6",
        glassBg: "rgba(122, 93, 154, 0.18)",
        glassBgHover: "rgba(122, 93, 154, 0.25)",
        glassBorder: "rgba(90, 61, 122, 0.3)",
        textPrimary: "#1a1225",
        textSecondary: "rgba(0, 0, 0, 0.75)",
        textMuted: "rgba(0, 0, 0, 0.55)",
        bodyBg: "#f5f0fa",
      },
    },

    lavender: {
      name: "Lavender",
      icon: "💜",
      description: "Soft lavender with rose gold accents",
      dark: {
        primary: "#6b5b95",
        primaryLight: "#8b7bb5",
        primaryDark: "#4b3b75",
        accent: "#b76e79",
        accentLight: "#d78e99",
        accentBlue: "#7e57c2",
        settingsColor: "#6a4c93",
        settingsLight: "#9a7cc3",
        glassBg: "rgba(107, 91, 149, 0.35)",
        glassBgHover: "rgba(107, 91, 149, 0.45)",
        glassBorder: "rgba(139, 123, 181, 0.4)",
        textPrimary: "#ffffff",
        textSecondary: "rgba(255, 255, 255, 0.85)",
        textMuted: "rgba(255, 255, 255, 0.6)",
        bodyBg: "#1f1a2e",
      },
      light: {
        primary: "#8b7bb5",
        primaryLight: "#ab9bd5",
        primaryDark: "#6b5b95",
        accent: "#a05a65",
        accentLight: "#b76e79",
        accentBlue: "#9e77e2",
        settingsColor: "#8a6cb3",
        settingsLight: "#ba9ce3",
        glassBg: "rgba(139, 123, 181, 0.18)",
        glassBgHover: "rgba(139, 123, 181, 0.25)",
        glassBorder: "rgba(107, 91, 149, 0.3)",
        textPrimary: "#1f1a2e",
        textSecondary: "rgba(0, 0, 0, 0.75)",
        textMuted: "rgba(0, 0, 0, 0.55)",
        bodyBg: "#f8f5fc",
      },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // RED/PINK SPECTRUM
    // ═══════════════════════════════════════════════════════════════════════════
    ruby: {
      name: "Ruby",
      icon: "❤️",
      description: "Deep ruby red with warm undertones",
      dark: {
        primary: "#8b1a1a",
        primaryLight: "#ab3a3a",
        primaryDark: "#5b0a0a",
        accent: "#ffc107",
        accentLight: "#ffd54f",
        accentBlue: "#e57373",
        settingsColor: "#c62828",
        settingsLight: "#ef5350",
        glassBg: "rgba(139, 26, 26, 0.35)",
        glassBgHover: "rgba(139, 26, 26, 0.45)",
        glassBorder: "rgba(171, 58, 58, 0.4)",
        textPrimary: "#ffffff",
        textSecondary: "rgba(255, 255, 255, 0.85)",
        textMuted: "rgba(255, 255, 255, 0.6)",
        bodyBg: "#1a0f0f",
      },
      light: {
        primary: "#c62828",
        primaryLight: "#e53935",
        primaryDark: "#8b1a1a",
        accent: "#d4a000",
        accentLight: "#ffc107",
        accentBlue: "#ef9a9a",
        settingsColor: "#d32f2f",
        settingsLight: "#f44336",
        glassBg: "rgba(198, 40, 40, 0.18)",
        glassBgHover: "rgba(198, 40, 40, 0.25)",
        glassBorder: "rgba(139, 26, 26, 0.3)",
        textPrimary: "#1a0f0f",
        textSecondary: "rgba(0, 0, 0, 0.75)",
        textMuted: "rgba(0, 0, 0, 0.55)",
        bodyBg: "#fef5f5",
      },
    },

    rose: {
      name: "Rose",
      icon: "🌹",
      description: "Elegant rose with champagne highlights",
      dark: {
        primary: "#9c4a6d",
        primaryLight: "#bc6a8d",
        primaryDark: "#7c2a4d",
        accent: "#f7e7ce",
        accentLight: "#fff5e6",
        accentBlue: "#d4768c",
        settingsColor: "#b45a7a",
        settingsLight: "#d47a9a",
        glassBg: "rgba(156, 74, 109, 0.35)",
        glassBgHover: "rgba(156, 74, 109, 0.45)",
        glassBorder: "rgba(188, 106, 141, 0.4)",
        textPrimary: "#ffffff",
        textSecondary: "rgba(255, 255, 255, 0.85)",
        textMuted: "rgba(255, 255, 255, 0.6)",
        bodyBg: "#1f141a",
      },
      light: {
        primary: "#bc6a8d",
        primaryLight: "#dc8aad",
        primaryDark: "#9c4a6d",
        accent: "#c9a060",
        accentLight: "#d9b070",
        accentBlue: "#e496ac",
        settingsColor: "#c46a8a",
        settingsLight: "#e48aaa",
        glassBg: "rgba(188, 106, 141, 0.18)",
        glassBgHover: "rgba(188, 106, 141, 0.25)",
        glassBorder: "rgba(156, 74, 109, 0.3)",
        textPrimary: "#1f141a",
        textSecondary: "rgba(0, 0, 0, 0.75)",
        textMuted: "rgba(0, 0, 0, 0.55)",
        bodyBg: "#fdf5f8",
      },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // ORANGE/YELLOW SPECTRUM
    // ═══════════════════════════════════════════════════════════════════════════
    sunset: {
      name: "Sunset",
      icon: "🌅",
      description: "Warm sunset orange with golden glow",
      dark: {
        primary: "#c95a30",
        primaryLight: "#e97a50",
        primaryDark: "#a93a10",
        accent: "#ffd700",
        accentLight: "#ffe44d",
        accentBlue: "#ff8c42",
        settingsColor: "#d96820",
        settingsLight: "#f98840",
        glassBg: "rgba(201, 90, 48, 0.35)",
        glassBgHover: "rgba(201, 90, 48, 0.45)",
        glassBorder: "rgba(233, 122, 80, 0.4)",
        textPrimary: "#ffffff",
        textSecondary: "rgba(255, 255, 255, 0.85)",
        textMuted: "rgba(255, 255, 255, 0.6)",
        bodyBg: "#1a120d",
      },
      light: {
        primary: "#d96820",
        primaryLight: "#f98840",
        primaryDark: "#b94800",
        accent: "#c9a000",
        accentLight: "#e6b800",
        accentBlue: "#ffac62",
        settingsColor: "#e97830",
        settingsLight: "#ff9850",
        glassBg: "rgba(217, 104, 32, 0.18)",
        glassBgHover: "rgba(217, 104, 32, 0.25)",
        glassBorder: "rgba(185, 72, 0, 0.3)",
        textPrimary: "#1a120d",
        textSecondary: "rgba(0, 0, 0, 0.75)",
        textMuted: "rgba(0, 0, 0, 0.55)",
        bodyBg: "#fef8f0",
      },
    },

    amber: {
      name: "Amber",
      icon: "🍯",
      description: "Golden amber with honey tones",
      dark: {
        primary: "#a67c00",
        primaryLight: "#c69c20",
        primaryDark: "#866000",
        accent: "#e6ccb2",
        accentLight: "#f5dcc2",
        accentBlue: "#d4a373",
        settingsColor: "#b68c10",
        settingsLight: "#d6ac30",
        glassBg: "rgba(166, 124, 0, 0.35)",
        glassBgHover: "rgba(166, 124, 0, 0.45)",
        glassBorder: "rgba(198, 156, 32, 0.4)",
        textPrimary: "#ffffff",
        textSecondary: "rgba(255, 255, 255, 0.85)",
        textMuted: "rgba(255, 255, 255, 0.6)",
        bodyBg: "#1a1408",
      },
      light: {
        primary: "#b68c10",
        primaryLight: "#d6ac30",
        primaryDark: "#967c00",
        accent: "#8b6914",
        accentLight: "#a68524",
        accentBlue: "#e4b393",
        settingsColor: "#c69c20",
        settingsLight: "#e6bc40",
        glassBg: "rgba(182, 140, 16, 0.18)",
        glassBgHover: "rgba(182, 140, 16, 0.25)",
        glassBorder: "rgba(150, 124, 0, 0.3)",
        textPrimary: "#1a1408",
        textSecondary: "rgba(0, 0, 0, 0.75)",
        textMuted: "rgba(0, 0, 0, 0.55)",
        bodyBg: "#fdfaf0",
      },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // NEUTRAL/SPECIAL THEMES
    // ═══════════════════════════════════════════════════════════════════════════
    midnight: {
      name: "Midnight",
      icon: "🌙",
      description: "Deep midnight blue, perfect for night",
      dark: {
        primary: "#2c3e50",
        primaryLight: "#3c5e70",
        primaryDark: "#1c2e40",
        accent: "#f39c12",
        accentLight: "#f5b041",
        accentBlue: "#5499c7",
        settingsColor: "#3498db",
        settingsLight: "#5dade2",
        glassBg: "rgba(44, 62, 80, 0.35)",
        glassBgHover: "rgba(44, 62, 80, 0.45)",
        glassBorder: "rgba(60, 94, 112, 0.4)",
        textPrimary: "#ffffff",
        textSecondary: "rgba(255, 255, 255, 0.85)",
        textMuted: "rgba(255, 255, 255, 0.6)",
        bodyBg: "#0d1520",
      },
      light: {
        primary: "#34495e",
        primaryLight: "#5d6d7e",
        primaryDark: "#2c3e50",
        accent: "#d68910",
        accentLight: "#f39c12",
        accentBlue: "#7fb3d5",
        settingsColor: "#5499c7",
        settingsLight: "#85c1e9",
        glassBg: "rgba(52, 73, 94, 0.18)",
        glassBgHover: "rgba(52, 73, 94, 0.25)",
        glassBorder: "rgba(44, 62, 80, 0.3)",
        textPrimary: "#1c2833",
        textSecondary: "rgba(0, 0, 0, 0.75)",
        textMuted: "rgba(0, 0, 0, 0.55)",
        bodyBg: "#f2f4f4",
      },
    },

    slate: {
      name: "Slate",
      icon: "🪨",
      description: "Modern slate gray with teal accents",
      dark: {
        primary: "#475569",
        primaryLight: "#64748b",
        primaryDark: "#334155",
        accent: "#14b8a6",
        accentLight: "#2dd4bf",
        accentBlue: "#0ea5e9",
        settingsColor: "#0284c7",
        settingsLight: "#38bdf8",
        glassBg: "rgba(71, 85, 105, 0.35)",
        glassBgHover: "rgba(71, 85, 105, 0.45)",
        glassBorder: "rgba(100, 116, 139, 0.4)",
        textPrimary: "#ffffff",
        textSecondary: "rgba(255, 255, 255, 0.85)",
        textMuted: "rgba(255, 255, 255, 0.6)",
        bodyBg: "#0f172a",
      },
      light: {
        primary: "#64748b",
        primaryLight: "#94a3b8",
        primaryDark: "#475569",
        accent: "#0d9488",
        accentLight: "#14b8a6",
        accentBlue: "#38bdf8",
        settingsColor: "#0ea5e9",
        settingsLight: "#7dd3fc",
        glassBg: "rgba(100, 116, 139, 0.18)",
        glassBgHover: "rgba(100, 116, 139, 0.25)",
        glassBorder: "rgba(71, 85, 105, 0.3)",
        textPrimary: "#0f172a",
        textSecondary: "rgba(0, 0, 0, 0.75)",
        textMuted: "rgba(0, 0, 0, 0.55)",
        bodyBg: "#f8fafc",
      },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // CUSTOMIZABLE THEMES (Pure transparent glass with custom accent)
    // ═══════════════════════════════════════════════════════════════════════════
    pureWhite: {
      name: "Pure White",
      icon: "⬜",
      description: "Clean white glass with customizable accent",
      customizable: true,
      dark: {
        primary: "#ffffff",
        primaryLight: "#ffffff",
        primaryDark: "#e0e0e0",
        onPrimaryText: "#1a1a1a",
        accent: "#c4c4c4",
        accentBackground: "#6f6f6f",
        accentText: "#c4c4c4",
        accentLight: "#dfdfdf",
        accentBlue: "#a6a6a6",
        settingsColor: "#b0b0b0",
        settingsLight: "#d6d6d6",
        glassBg: "rgba(255, 255, 255, 0.12)",
        glassBgHover: "rgba(255, 255, 255, 0.18)",
        glassBorder: "rgba(255, 255, 255, 0.2)",
        textPrimary: "#ffffff",
        textSecondary: "rgba(255, 255, 255, 0.85)",
        textMuted: "rgba(255, 255, 255, 0.6)",
        bodyBg: "#000000",
      },
      light: {
        primary: "#424242",
        primaryLight: "#616161",
        primaryDark: "#212121",
        onPrimaryText: "#ffffff",
        accent: "#5f5f5f",
        accentBackground: "#5f5f5f",
        accentText: "#5f5f5f",
        accentLight: "#7a7a7a",
        accentBlue: "#494949",
        settingsColor: "#4f4f4f",
        settingsLight: "#7f7f7f",
        glassBg: "rgba(255, 255, 255, 0.65)",
        glassBgHover: "rgba(255, 255, 255, 0.75)",
        glassBorder: "rgba(0, 0, 0, 0.1)",
        textPrimary: "#212121",
        textSecondary: "rgba(0, 0, 0, 0.75)",
        textMuted: "rgba(0, 0, 0, 0.55)",
        bodyBg: "#fafafa",
      },
    },

    pureBlack: {
      name: "Pure Black",
      icon: "⬛",
      description: "Deep black glass with customizable accent",
      customizable: true,
      dark: {
        primary: "#212121",
        primaryLight: "#424242",
        primaryDark: "#000000",
        onPrimaryText: "#ffffff",
        accent: "#a0a0a0",
        accentBackground: "#a0a0a0",
        accentText: "#a0a0a0",
        accentLight: "#c0c0c0",
        accentBlue: "#7a7a7a",
        settingsColor: "#8a8a8a",
        settingsLight: "#b2b2b2",
        glassBg: "rgba(0, 0, 0, 0.45)",
        glassBgHover: "rgba(0, 0, 0, 0.55)",
        glassBorder: "rgba(255, 255, 255, 0.12)",
        textPrimary: "#ffffff",
        textSecondary: "rgba(255, 255, 255, 0.85)",
        textMuted: "rgba(255, 255, 255, 0.6)",
        bodyBg: "#000000",
      },
      light: {
        primary: "#9e9e9e",
        primaryLight: "#bdbdbd",
        primaryDark: "#757575",
        onPrimaryText: "#1a1a1a",
        accent: "#5c5c5c",
        accentBackground: "#5c5c5c",
        accentText: "#5c5c5c",
        accentLight: "#767676",
        accentBlue: "#464646",
        settingsColor: "#4c4c4c",
        settingsLight: "#7b7b7b",
        glassBg: "rgba(0, 0, 0, 0.08)",
        glassBgHover: "rgba(0, 0, 0, 0.12)",
        glassBorder: "rgba(0, 0, 0, 0.15)",
        textPrimary: "#212121",
        textSecondary: "rgba(0, 0, 0, 0.75)",
        textMuted: "rgba(0, 0, 0, 0.55)",
        bodyBg: "#f5f5f5",
      },
    },

    userTheme: {
      name: "User Theme",
      icon: "🧩",
      description: "Your fully custom palette with global font colors",
      customizable: true,
      dark: {
        primary: "#2f2f2f",
        primaryLight: "#4a4a4a",
        primaryDark: "#1a1a1a",
        onPrimaryText: "#ffffff",
        accent: "#8fc7ff",
        accentBackground: "#8fc7ff",
        accentText: "#8fc7ff",
        accentLight: "#b5dbff",
        accentBlue: "#7fbfff",
        settingsColor: "#8fc7ff",
        settingsLight: "#bfe1ff",
        glassBg: "rgba(255, 255, 255, 0.12)",
        glassBgHover: "rgba(255, 255, 255, 0.18)",
        glassBorder: "rgba(255, 255, 255, 0.2)",
        textPrimary: "#ffffff",
        textSecondary: "#d9d9d9",
        textMuted: "#9a9a9a",
        bodyBg: "#0f0f0f",
      },
      light: {
        primary: "#dcdcdc",
        primaryLight: "#efefef",
        primaryDark: "#c4c4c4",
        onPrimaryText: "#1a1a1a",
        accent: "#4f89c7",
        accentBackground: "#4f89c7",
        accentText: "#4f89c7",
        accentLight: "#74a8e0",
        accentBlue: "#3b76b7",
        settingsColor: "#4f89c7",
        settingsLight: "#78abe0",
        glassBg: "rgba(0, 0, 0, 0.08)",
        glassBgHover: "rgba(0, 0, 0, 0.12)",
        glassBorder: "rgba(0, 0, 0, 0.15)",
        textPrimary: "#1a1a1a",
        textSecondary: "#4d4d4d",
        textMuted: "#7a7a7a",
        bodyBg: "#f3f3f3",
      },
    },
  };

  constructor(storage) {
    this.storage = storage;
    this._currentTheme = ThemeManager.DEFAULT_THEME;
    this._currentMode = ThemeManager.DEFAULT_MODE;
    this._glassEnabled = true;
    this._glassOpacity = 35;
    // Legacy single-color accent override (kept for backward compatibility)
    this._customAccent = null;
    // New: per-theme per-mode palette overrides for customizable themes
    // Shape: { [themeId]: { dark: {primary, accentText, accentBackground, bodyBg, onPrimaryText}, light: {...} } }
    this._customPalettes = {};

    this.init();
  }

  init() {
    this.loadThemeSettings();
    this.applyTheme();
  }

  _isPureTheme(themeName) {
    return themeName === "pureWhite" || themeName === "pureBlack";
  }

  _isThemeWithCustomGlassTint(themeName) {
    return this._isPureTheme(themeName) || themeName === "userTheme";
  }

  _isThemeWithCustomTextPalette(themeName) {
    return themeName === "userTheme";
  }

  _getDefaultGlassTint(themeName, mode) {
    if (themeName === "pureBlack") return "#000000";
    if (themeName === "pureWhite") return "#ffffff";
    if (themeName === "userTheme") {
      return mode === "light" ? "#000000" : "#ffffff";
    }

    const fallback = ThemeManager.THEMES?.[themeName]?.[mode]?.primary;
    return this._normalizeHexColor(fallback) || "#ffffff";
  }

  _getDefaultPureThemePalette(themeName, mode) {
    const colorMode = mode === "light" ? "light" : "dark";
    const customTheme = ThemeManager.THEMES?.[themeName];
    if (!customTheme?.customizable) return null;

    const base = customTheme[colorMode];
    if (!base) return null;

    const defaultAccentBackground =
      this._normalizeHexColor(base.accentBackground || base.accent) ||
      "#d4af37";
    const defaultAccentText = this._resolveAccentTextColor(
      base.accentText || base.accent,
      defaultAccentBackground,
      colorMode,
    );

    const defaultPalette = {
      primary: base.primary,
      accent: defaultAccentText,
      accentText: defaultAccentText,
      accentBackground: defaultAccentBackground,
      bodyBg: base.bodyBg,
      onPrimaryText: this._resolveOnPrimaryText(
        base.onPrimaryText,
        base.primary,
      ),
      glassTint: this._getDefaultGlassTint(themeName, colorMode),
    };

    if (this._isThemeWithCustomTextPalette(themeName)) {
      defaultPalette.textPrimary = this._normalizeHexColor(base.textPrimary);
      defaultPalette.textSecondary = this._normalizeHexColor(
        base.textSecondary,
      );
      defaultPalette.textMuted = this._normalizeHexColor(base.textMuted);
    }

    return defaultPalette;
  }

  /**
   * Load theme settings from storage
   */
  loadThemeSettings() {
    const settings = this.storage.getSettings();
    const themeSettings = settings.theme || {};

    this._currentTheme = themeSettings.name || ThemeManager.DEFAULT_THEME;
    this._currentMode = themeSettings.mode || ThemeManager.DEFAULT_MODE;
    this._glassEnabled = themeSettings.glassEnabled !== false;
    this._glassOpacity = this._clampGlassOpacity(
      themeSettings.glassOpacity,
      35,
    );
    this._customAccent = themeSettings.customAccent || null;
    this._customPalettes = themeSettings.customPalettes || {};

    // Validate theme exists
    if (!ThemeManager.THEMES[this._currentTheme]) {
      this._currentTheme = ThemeManager.DEFAULT_THEME;
    }

    // Migrate legacy customAccent into palettes for the current theme (non-destructive)
    if (this._customAccent && !themeSettings.customPalettes) {
      const theme = ThemeManager.THEMES[this._currentTheme];
      if (theme?.customizable) {
        const baseDark = theme.dark;
        const baseLight = theme.light;
        const darkAccentBackground =
          this._normalizeHexColor(baseDark.accentBackground || baseDark.accent) ||
          "#d4af37";
        const lightAccentBackground =
          this._normalizeHexColor(
            baseLight.accentBackground || baseLight.accent,
          ) || "#d4af37";
        this._customPalettes[this._currentTheme] = {
          dark: {
            primary: baseDark.primary,
            accent: this._customAccent,
            accentText: this._customAccent,
            accentBackground: darkAccentBackground,
            bodyBg: baseDark.bodyBg,
          },
          light: {
            primary: baseLight.primary,
            accent: this._customAccent,
            accentText: this._customAccent,
            accentBackground: lightAccentBackground,
            bodyBg: baseLight.bodyBg,
          },
        };
      }
    }
  }

  /**
   * Save theme settings to storage
   */
  saveThemeSettings() {
    const settings = this.storage.getSettings();
    settings.theme = {
      name: this._currentTheme,
      mode: this._currentMode,
      glassEnabled: this._glassEnabled,
      glassOpacity: this._glassOpacity,
      customAccent: this._customAccent,
      customPalettes: this._customPalettes,
    };
    this.storage.saveSettings(settings);
  }

  /**
   * Get current theme name
   */
  getCurrentTheme() {
    return this._currentTheme;
  }

  /**
   * Get current mode (dark/light)
   */
  getCurrentMode() {
    return this._currentMode;
  }

  /**
   * Check if glass effect is enabled
   */
  isGlassEnabled() {
    return this._glassEnabled;
  }

  /**
   * Get current global glass opacity percentage
   */
  getGlassOpacity() {
    return this._glassOpacity;
  }

  /**
   * Set the active theme
   */
  setTheme(themeName, save = true) {
    if (!ThemeManager.THEMES[themeName]) {
      console.warn(`Theme "${themeName}" not found, using default`);
      themeName = ThemeManager.DEFAULT_THEME;
    }

    this._currentTheme = themeName;
    this.applyTheme();

    if (save) {
      this.saveThemeSettings();
    }
  }

  /**
   * Set the color mode (dark/light)
   */
  setMode(mode, save = true) {
    if (mode !== "dark" && mode !== "light") {
      mode = ThemeManager.DEFAULT_MODE;
    }

    this._currentMode = mode;
    this.applyTheme();

    if (save) {
      this.saveThemeSettings();
    }
  }

  /**
   * Toggle between dark and light mode
   */
  toggleMode(save = true) {
    this.setMode(this._currentMode === "dark" ? "light" : "dark", save);
  }

  /**
   * Enable or disable glass effect
   */
  setGlassEnabled(enabled, save = true) {
    this._glassEnabled = enabled;
    this.applyTheme();

    if (save) {
      this.saveThemeSettings();
    }
  }

  /**
   * Toggle glass effect
   */
  toggleGlass(save = true) {
    this.setGlassEnabled(!this._glassEnabled, save);
  }

  /**
   * Set global glass opacity percentage
   */
  setGlassOpacity(opacityPercent, save = true) {
    this._glassOpacity = this._clampGlassOpacity(
      opacityPercent,
      this._glassOpacity,
    );
    this.applyTheme();

    if (save) {
      this.saveThemeSettings();
    }
  }

  /**
   * Get all available themes
   */
  getThemes() {
    return Object.entries(ThemeManager.THEMES).map(([id, theme]) => ({
      id,
      name: theme.name,
      icon: theme.icon,
      description: theme.description,
      customizable: theme.customizable || false,
    }));
  }

  /**
   * Get theme colors for current mode
   */
  getThemeColors(themeName = null, mode = null) {
    const name = themeName || this._currentTheme;
    const colorMode = mode || this._currentMode;

    const theme = ThemeManager.THEMES[name];
    if (!theme) return null;

    // Clone to avoid mutating original
    const colors = { ...theme[colorMode] };

    // Apply palette overrides for customizable themes
    if (theme.customizable) {
      const isPureTheme = this._isPureTheme(name);
      const supportsCustomText = this._isThemeWithCustomTextPalette(name);
      const supportsCustomGlassTint = this._isThemeWithCustomGlassTint(name);
      let palette = this.getCustomPalette(name, colorMode);
      if (!palette) {
        palette = this._getDefaultPureThemePalette(name, colorMode);
      }

      if (palette) {
        if (palette.primary) {
          colors.primary = palette.primary;
          colors.primaryLight = this._lightenColor(palette.primary, 18);
          colors.primaryDark = this._darkenColor(palette.primary, 18);
        }
        if (Object.prototype.hasOwnProperty.call(palette, "onPrimaryText")) {
          colors.onPrimaryText = palette.onPrimaryText;
        } else {
          colors.onPrimaryText = null;
        }
        const accentText = this._normalizeHexColor(
          palette.accentText || palette.accent,
        );
        const accentBackground = this._normalizeHexColor(
          palette.accentBackground || palette.accent,
        );

        if (accentText) {
          colors.accent = accentText;
          colors.accentText = accentText;
          colors.accentLight = this._lightenColor(accentText, 18);
          colors.accentBlue = this._lightenColor(accentText, 10);
          colors.settingsColor = accentText;
          colors.settingsLight = this._lightenColor(accentText, 25);
        } else if (this._customAccent) {
          // Legacy fallback
          colors.accent = this._customAccent;
          colors.accentText = this._customAccent;
          colors.accentLight = this._lightenColor(this._customAccent, 20);
          colors.accentBlue = this._lightenColor(this._customAccent, 10);
          colors.settingsColor = this._customAccent;
          colors.settingsLight = this._lightenColor(this._customAccent, 25);
        }

        if (accentBackground) {
          colors.accentBackground = accentBackground;
        }

        if (palette.bodyBg) {
          colors.bodyBg = palette.bodyBg;

          const isDarkBg = this._isDarkColor(palette.bodyBg);
          const lightTextPrimary = isPureTheme ? "#1a1a1a" : "#1a1a2e";

          // Auto text contrast for body background, unless user explicitly overrides.
          if (!supportsCustomText) {
            colors.textPrimary = isDarkBg ? "#ffffff" : lightTextPrimary;
            colors.textSecondary = isDarkBg
              ? "rgba(255, 255, 255, 0.85)"
              : "rgba(0, 0, 0, 0.75)";
            colors.textMuted = isDarkBg
              ? "rgba(255, 255, 255, 0.6)"
              : "rgba(0, 0, 0, 0.55)";
          }
        }

        if (supportsCustomText) {
          const textPrimary = this._normalizeHexColor(palette.textPrimary);
          const textSecondary = this._normalizeHexColor(palette.textSecondary);
          const textMuted = this._normalizeHexColor(palette.textMuted);

          if (textPrimary) colors.textPrimary = textPrimary;
          if (textSecondary) colors.textSecondary = textSecondary;
          if (textMuted) colors.textMuted = textMuted;
        }
      } else if (this._customAccent) {
        // Backward compatible: accent-only override
        colors.accent = this._customAccent;
        colors.accentText = this._customAccent;
        colors.accentLight = this._lightenColor(this._customAccent, 20);
        colors.accentBlue = this._lightenColor(this._customAccent, 10);
        colors.settingsColor = this._customAccent;
        colors.settingsLight = this._lightenColor(this._customAccent, 25);
      }

      // Themes with explicit glass tint controls use one tint color for glass vars.
      if (supportsCustomGlassTint) {
        const defaultGlassTint = this._getDefaultGlassTint(name, colorMode);
        const glassTintHex = palette?.glassTint || defaultGlassTint;
        const tintRgb = this.hexToRgb(glassTintHex);
        if (tintRgb) {
          const base = theme[colorMode];
          const aBg =
            this._parseRgbaAlpha(base.glassBg) ??
            (colorMode === "light" ? 0.2 : 0.35);
          const aHover =
            this._parseRgbaAlpha(base.glassBgHover) ??
            (colorMode === "light" ? 0.28 : 0.45);
          const aBorder =
            this._parseRgbaAlpha(base.glassBorder) ??
            (colorMode === "light" ? 0.25 : 0.4);

          colors.glassBg = `rgba(${tintRgb.r}, ${tintRgb.g}, ${tintRgb.b}, ${aBg})`;
          colors.glassBgHover = `rgba(${tintRgb.r}, ${tintRgb.g}, ${tintRgb.b}, ${aHover})`;
          colors.glassBorder = `rgba(${tintRgb.r}, ${tintRgb.g}, ${tintRgb.b}, ${aBorder})`;
        }
      } else if (palette?.primary) {
        // Other customizable themes (future-proof): tint glass by primary while preserving base alpha values.
        const primaryRgb = this.hexToRgb(colors.primary);
        if (primaryRgb) {
          const base = theme[colorMode];
          const aBg =
            this._parseRgbaAlpha(base.glassBg) ??
            (colorMode === "light" ? 0.2 : 0.35);
          const aHover =
            this._parseRgbaAlpha(base.glassBgHover) ??
            (colorMode === "light" ? 0.28 : 0.45);
          const aBorder =
            this._parseRgbaAlpha(base.glassBorder) ??
            (colorMode === "light" ? 0.25 : 0.4);

          colors.glassBg = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${aBg})`;
          colors.glassBgHover = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${aHover})`;
          colors.glassBorder = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${aBorder})`;
        }
      }
    }

    colors.onPrimaryText = this._resolveOnPrimaryText(
      colors.onPrimaryText,
      colors.primary,
    );
    colors.accentBackground =
      this._normalizeHexColor(colors.accentBackground || colors.accent) ||
      "#d4af37";
    colors.accentText = this._resolveAccentTextColor(
      colors.accentText || colors.accent,
      colors.accentBackground,
      colorMode,
    );
    colors.accent = colors.accentText;

    return this._applyGlassOpacityToThemeColors(colors);
  }

  _clampGlassOpacity(value, fallback = 35) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(100, Math.max(0, Math.round(numeric)));
  }

  _getGlassOpacityAlphas(opacityPercent = this._glassOpacity) {
    const bgAlpha = this._clampGlassOpacity(opacityPercent, 35) / 100;
    const hoverRatio = 0.45 / 0.35;
    const borderRatio = 0.4 / 0.35;
    const clampAlpha = (alpha) => {
      const bounded = Math.min(1, Math.max(0, alpha));
      return Number(bounded.toFixed(3));
    };

    return {
      bg: clampAlpha(bgAlpha),
      hover: clampAlpha(bgAlpha * hoverRatio),
      border: clampAlpha(bgAlpha * borderRatio),
    };
  }

  _extractRgbChannels(value) {
    if (typeof value !== "string") return null;
    const match = value
      .replace(/\s+/g, "")
      .match(/^rgba?\((\d+),(\d+),(\d+)(?:,[0-9.]+)?\)$/i);
    if (!match) return null;

    return {
      r: Number(match[1]),
      g: Number(match[2]),
      b: Number(match[3]),
    };
  }

  _setColorAlpha(value, alpha) {
    const rgb = this._extractRgbChannels(value);
    if (!rgb) return value;
    const bounded = Math.min(1, Math.max(0, Number(alpha)));
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Number(bounded.toFixed(3))})`;
  }

  _normalizeHexColor(value) {
    if (typeof value !== "string") return null;
    const hex = value.trim().toLowerCase();
    if (/^#([a-f\d]{6})$/i.test(hex)) return hex;

    const short = /^#([a-f\d]{3})$/i.exec(hex);
    if (!short) return null;

    const [r, g, b] = short[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  _resolveOnPrimaryText(candidateHex, primaryHex) {
    const normalizedCandidate = this._normalizeHexColor(candidateHex);
    if (normalizedCandidate) return normalizedCandidate;

    const normalizedPrimary = this._normalizeHexColor(primaryHex) || "#1a5f4a";
    return this._isDarkColor(normalizedPrimary) ? "#ffffff" : "#1a1a1a";
  }

  _resolveAccentTextColor(candidateHex, accentBackgroundHex, mode = "dark") {
    const normalizedCandidate = this._normalizeHexColor(candidateHex);
    if (normalizedCandidate) return normalizedCandidate;

    const normalizedAccent =
      this._normalizeHexColor(accentBackgroundHex) || "#d4af37";
    const prefersLightText =
      this._isDarkColor(normalizedAccent) || mode === "dark";

    return prefersLightText
      ? this._lightenColor(normalizedAccent, 48)
      : this._darkenColor(normalizedAccent, 45);
  }

  _applyGlassOpacityToThemeColors(colors) {
    if (!colors || typeof colors !== "object") return colors;

    const alphas = this._getGlassOpacityAlphas();
    return {
      ...colors,
      glassBg: this._setColorAlpha(colors.glassBg, alphas.bg),
      glassBgHover: this._setColorAlpha(colors.glassBgHover, alphas.hover),
      glassBorder: this._setColorAlpha(colors.glassBorder, alphas.border),
    };
  }

  /**
   * Set custom accent color for customizable themes
   */
  setCustomAccent(hexColor, save = true) {
    this._customAccent = hexColor;

    // Also reflect in palette for the current theme/mode (for compatibility)
    if (this.isCurrentThemeCustomizable()) {
      const fallback = this._getDefaultPureThemePalette(
        this._currentTheme,
        this._currentMode,
      );
      const defaultPrimary =
        fallback?.primary ||
        ThemeManager.THEMES[this._currentTheme][this._currentMode].primary;
      const defaultBodyBg =
        fallback?.bodyBg ||
        ThemeManager.THEMES[this._currentTheme][this._currentMode].bodyBg;
      const defaultOnPrimaryText = this._resolveOnPrimaryText(
        fallback?.onPrimaryText ||
          ThemeManager.THEMES[this._currentTheme][this._currentMode]
            .onPrimaryText,
        defaultPrimary,
      );
      const defaultAccentBackground =
        fallback?.accentBackground ||
        ThemeManager.THEMES[this._currentTheme][this._currentMode]
          .accentBackground ||
        fallback?.accent ||
        ThemeManager.THEMES[this._currentTheme][this._currentMode].accent;
      const defaultAccentText = this._resolveAccentTextColor(
        hexColor,
        defaultAccentBackground,
        this._currentMode,
      );
      const current = this.getCustomPalette(
        this._currentTheme,
        this._currentMode,
      ) || {
        primary: defaultPrimary,
        accent: defaultAccentText,
        accentText: defaultAccentText,
        accentBackground: defaultAccentBackground,
        bodyBg: defaultBodyBg,
        onPrimaryText: defaultOnPrimaryText,
        ...(fallback?.glassTint ? { glassTint: fallback.glassTint } : {}),
        ...(fallback?.textPrimary ? { textPrimary: fallback.textPrimary } : {}),
        ...(fallback?.textSecondary
          ? { textSecondary: fallback.textSecondary }
          : {}),
        ...(fallback?.textMuted ? { textMuted: fallback.textMuted } : {}),
      };
      this.setCustomPalette(
        this._currentTheme,
        this._currentMode,
        {
          ...current,
          accent: defaultAccentText,
          accentText: defaultAccentText,
        },
        false,
      );
    }

    this.applyTheme();

    if (save) {
      this.saveThemeSettings();
    }
  }

  /**
   * Get current custom accent color
   */
  getCustomAccent() {
    return this._customAccent;
  }

  /**
   * Get palette override for a theme + mode.
   */
  getCustomPalette(themeName = null, mode = null) {
    const name = themeName || this._currentTheme;
    const colorMode = mode || this._currentMode;
    const entry = this._customPalettes?.[name]?.[colorMode];
    return entry ? { ...entry } : null;
  }

  /**
   * Get all custom palettes (for Settings UI persistence).
   */
  getCustomPalettes() {
    return JSON.parse(JSON.stringify(this._customPalettes || {}));
  }

  /**
   * Set palette override for a theme + mode.
   */
  setCustomPalette(themeName, mode, palette, save = true) {
    if (!ThemeManager.THEMES[themeName]) return;
    const theme = ThemeManager.THEMES[themeName];
    if (!theme?.customizable) return;

    const colorMode = mode === "light" ? "light" : "dark";

    const defaultBase = theme[colorMode];
    const primary = palette?.primary || defaultBase.primary;
    const onPrimaryText = this._resolveOnPrimaryText(
      palette?.onPrimaryText || defaultBase.onPrimaryText,
      primary,
    );
    const fallback = this._getDefaultPureThemePalette(themeName, colorMode);
    const supportsCustomText = this._isThemeWithCustomTextPalette(themeName);
    const accentBackground =
      this._normalizeHexColor(palette?.accentBackground || palette?.accent) ||
      this._normalizeHexColor(
        defaultBase.accentBackground || fallback?.accentBackground,
      ) ||
      this._normalizeHexColor(defaultBase.accent || fallback?.accent) ||
      "#d4af37";
    const accentText = this._resolveAccentTextColor(
      palette?.accentText ||
        palette?.accent ||
        defaultBase.accentText ||
        fallback?.accentText ||
        defaultBase.accent ||
        fallback?.accent,
      accentBackground,
      colorMode,
    );

    this._customPalettes ||= {};
    this._customPalettes[themeName] ||= { dark: {}, light: {} };

    this._customPalettes[themeName][colorMode] = {
      primary,
      accent: accentText,
      accentText,
      accentBackground,
      bodyBg: palette?.bodyBg || defaultBase.bodyBg,
      onPrimaryText,
      glassTint:
        this._normalizeHexColor(palette?.glassTint) ||
        fallback?.glassTint ||
        this._getDefaultGlassTint(themeName, colorMode),
      ...(supportsCustomText
        ? {
            textPrimary:
              this._normalizeHexColor(palette?.textPrimary) ||
              fallback?.textPrimary ||
              this._normalizeHexColor(defaultBase.textPrimary),
            textSecondary:
              this._normalizeHexColor(palette?.textSecondary) ||
              fallback?.textSecondary ||
              this._normalizeHexColor(defaultBase.textSecondary),
            textMuted:
              this._normalizeHexColor(palette?.textMuted) ||
              fallback?.textMuted ||
              this._normalizeHexColor(defaultBase.textMuted),
          }
        : {}),
    };

    if (this._currentTheme === themeName && this._currentMode === colorMode) {
      this.applyTheme();
    }

    if (save) {
      this.saveThemeSettings();
    }
  }

  /**
   * Check if current theme is customizable
   */
  isCurrentThemeCustomizable() {
    const theme = ThemeManager.THEMES[this._currentTheme];
    return theme?.customizable || false;
  }

  /**
   * Lighten a hex color by a percentage
   */
  _lightenColor(hex, percent) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;

    const lighten = (c) =>
      Math.min(255, Math.round(c + (255 - c) * (percent / 100)));
    const r = lighten(rgb.r);
    const g = lighten(rgb.g);
    const b = lighten(rgb.b);

    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  /**
   * Darken a hex color by a percentage
   */
  _darkenColor(hex, percent) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;

    const darken = (c) => Math.max(0, Math.round(c * (1 - percent / 100)));
    const r = darken(rgb.r);
    const g = darken(rgb.g);
    const b = darken(rgb.b);

    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  _isDarkColor(hex) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return false;
    // relative luminance approximation
    const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    return luminance < 0.5;
  }

  _parseRgbaAlpha(value) {
    if (typeof value !== "string") return null;
    const match = value
      .replace(/\s+/g, "")
      .match(/^rgba\((\d+),(\d+),(\d+),([0-9.]+)\)$/i);
    if (!match) return null;
    const alpha = Number(match[4]);
    return Number.isFinite(alpha) ? alpha : null;
  }

  /**
   * Mix two hex colors and return an opaque rgb() string.
   * @param {string} baseHex
   * @param {string} mixHex
   * @param {number} mixWeight 0..1 amount of mixHex
   */
  _mixHexToRgb(baseHex, mixHex, mixWeight) {
    const base = this.hexToRgb(baseHex);
    const mix = this.hexToRgb(mixHex);
    if (!base || !mix) return null;

    const w = Math.max(0, Math.min(1, Number(mixWeight)));
    const blend = (a, b) => Math.round(a * (1 - w) + b * w);

    return `rgb(${blend(base.r, mix.r)}, ${blend(base.g, mix.g)}, ${blend(
      base.b,
      mix.b,
    )})`;
  }

  /**
   * Apply current theme to the document
   */
  applyTheme() {
    const colors = this.getThemeColors();
    if (!colors) return;

    const root = document.documentElement;

    // Apply color variables
    root.style.setProperty("--primary-color", colors.primary);
    root.style.setProperty("--primary-light", colors.primaryLight);
    root.style.setProperty("--primary-dark", colors.primaryDark);
    const onPrimaryText = this._resolveOnPrimaryText(
      colors.onPrimaryText,
      colors.primary,
    );
    const accentBackground =
      this._normalizeHexColor(colors.accentBackground || colors.accent) ||
      "#d4af37";
    const accentText = this._resolveAccentTextColor(
      colors.accentText || colors.accent,
      accentBackground,
      this._currentMode,
    );
    root.style.setProperty("--on-primary-text", onPrimaryText);
    root.style.setProperty("--accent-gold", accentText);
    root.style.setProperty("--accent-bg", accentBackground);
    root.style.setProperty("--accent-text", accentText);
    root.style.setProperty("--accent-gold-light", colors.accentLight);
    root.style.setProperty("--accent-blue", colors.accentBlue);
    root.style.setProperty("--settings-color", colors.settingsColor);
    root.style.setProperty("--settings-light", colors.settingsLight);
    root.style.setProperty("--text-primary", colors.textPrimary);
    root.style.setProperty("--text-secondary", colors.textSecondary);
    root.style.setProperty("--text-muted", colors.textMuted);
    root.style.setProperty("--surface-base-bg", colors.bodyBg);

    // Apply glass effect or solid background
    if (this._glassEnabled) {
      root.style.setProperty("--glass-bg", colors.glassBg);
      root.style.setProperty("--glass-bg-hover", colors.glassBgHover);
      root.style.setProperty("--glass-border", colors.glassBorder);
      root.style.setProperty("--glass-shadow", "0 8px 32px rgba(0, 0, 0, 0.3)");
    } else {
      // Solid mode - NO transparency in the base surfaces.
      // We mix theme colors into the body background to get fully-opaque panel colors.
      const isLight = this._currentMode === "light";

      const bgMix = isLight ? 0.12 : 0.38;
      const bgHoverMix = isLight ? 0.18 : 0.48;
      const borderMix = isLight ? 0.25 : 0.58;

      const solidBg =
        this._mixHexToRgb(colors.bodyBg, colors.primary, bgMix) ||
        (isLight ? "rgb(255, 255, 255)" : "rgb(30, 30, 50)");
      const solidHover =
        this._mixHexToRgb(colors.bodyBg, colors.primary, bgHoverMix) ||
        (isLight ? "rgb(245, 245, 245)" : "rgb(40, 40, 60)");
      const solidBorder =
        this._mixHexToRgb(colors.bodyBg, colors.primaryLight, borderMix) ||
        (isLight ? "rgb(220, 220, 220)" : "rgb(90, 90, 110)");

      root.style.setProperty("--glass-bg", solidBg);
      root.style.setProperty("--glass-bg-hover", solidHover);
      root.style.setProperty("--glass-border", solidBorder);
      root.style.setProperty("--glass-shadow", "0 4px 20px rgba(0, 0, 0, 0.2)");
    }

    // Apply body background
    document.body.style.backgroundColor = colors.bodyBg;

    // Set data attributes for CSS hooks
    root.dataset.theme = this._currentTheme;
    root.dataset.themeMode = this._currentMode;
    root.dataset.glassEnabled = this._glassEnabled ? "true" : "false";

    // Settings shadow based on current settings color
    const settingsRgb = this.hexToRgb(colors.settingsColor);
    if (settingsRgb) {
      root.style.setProperty(
        "--settings-shadow",
        `0 4px 20px rgba(${settingsRgb.r}, ${settingsRgb.g}, ${settingsRgb.b}, 0.45)`,
      );
    }

    // Dispatch theme change event
    document.dispatchEvent(
      new CustomEvent("md:theme-change", {
        detail: {
          theme: this._currentTheme,
          mode: this._currentMode,
          glassEnabled: this._glassEnabled,
          glassOpacity: this._glassOpacity,
        },
      }),
    );
  }

  /**
   * Convert hex color to RGB object
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  /**
   * Get preview CSS for a theme (for theme picker UI)
   */
  getThemePreviewColors(themeName, mode) {
    const theme = ThemeManager.THEMES[themeName];
    if (!theme) return null;

    const colors = theme[mode];
    return {
      primary: colors.primary,
      accent: colors.accent,
      bodyBg: colors.bodyBg,
      textPrimary: colors.textPrimary,
    };
  }
}

// Export for use
window.ThemeManager = ThemeManager;
