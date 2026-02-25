/**
 * Icon Theme Manager
 * Provides three icon styles: emoji, colorful Lucide SVG, and monochrome Lucide SVG
 * Supports dynamic theming and automatic color adaptation
 */

class IconThemeManager {
  static ICON_THEMES = {
    emoji: {
      id: "emoji",
      name: "Emoji",
      description: "Classic emoji icons",
      icon: "😊",
    },
    colorful: {
      id: "colorful",
      name: "Colorful",
      description: "Vibrant Lucide icons",
      icon: "🎨",
    },
    monochrome: {
      id: "monochrome",
      name: "Monochrome",
      description: "Clean single-color icons",
      icon: "⬜",
    },
  };

  // Comprehensive emoji to Lucide icon mapping with colors
  static ICON_MAP = {
    // Prayer time icons
    "🌙": {
      name: "moon",
      colorful: "#6366f1",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
    },
    "🌅": {
      name: "sunrise",
      colorful: "#f97316",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/></svg>',
    },
    "🌄": {
      name: "sunrise",
      colorful: "#f59e0b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/></svg>',
    },
    "☀️": {
      name: "sun",
      colorful: "#eab308",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
    },
    "☀": {
      name: "sun",
      colorful: "#eab308",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
    },
    "🌤️": {
      name: "cloud-sun",
      colorful: "#38bdf8",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/></svg>',
    },
    "🌤": {
      name: "cloud-sun",
      colorful: "#38bdf8",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/></svg>',
    },
    "⛅": {
      name: "cloud",
      colorful: "#94a3b8",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>',
    },
    "🌇": {
      name: "sunset",
      colorful: "#fb923c",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/></svg>',
    },
    "🕛": {
      name: "clock-12",
      colorful: "#8b5cf6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12"/></svg>',
    },
    "🌃": {
      name: "moon-star",
      colorful: "#818cf8",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M19 3v4"/><path d="M21 5h-4"/></svg>',
    },

    // UI icons
    "🔎": {
      name: "search",
      colorful: "#3b82f6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    },
    "📷": {
      name: "camera",
      colorful: "#ec4899",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
    },
    "📖": {
      name: "book-open",
      colorful: "#10b981",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    },
    "📚": {
      name: "library",
      colorful: "#f59e0b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></svg>',
    },
    "📁": {
      name: "folder",
      colorful: "#f59e0b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>',
    },
    "📝": {
      name: "file-text",
      colorful: "#6366f1",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    },
    "📝️": {
      name: "file-text",
      colorful: "#6366f1",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    },
    "📍": {
      name: "map-pin",
      colorful: "#ef4444",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    },
    "🔒": {
      name: "lock",
      colorful: "#64748b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    },
    "🔗": {
      name: "link",
      colorful: "#0ea5e9",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    },
    "🗑": {
      name: "trash-2",
      colorful: "#ef4444",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
    },
    "🗑️": {
      name: "trash-2",
      colorful: "#ef4444",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
    },
    "✏️": {
      name: "pencil",
      colorful: "#f59e0b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',
    },
    "✏": {
      name: "pencil",
      colorful: "#f59e0b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',
    },
    "🎨": {
      name: "palette",
      colorful: "#a855f7",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/></svg>',
    },
    "⏳": {
      name: "hourglass",
      colorful: "#f59e0b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>',
    },
    "⏸": {
      name: "pause",
      colorful: "#64748b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
    },
    "▶": {
      name: "play",
      colorful: "#22c55e",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    },
    "❓": {
      name: "help-circle",
      colorful: "#8b5cf6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
    },
    "❮": {
      name: "chevron-left",
      colorful: "#64748b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    },
    "❯": {
      name: "chevron-right",
      colorful: "#64748b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    },
    "✨": {
      name: "sparkles",
      colorful: "#fbbf24",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>',
    },
    "⬜": {
      name: "square",
      colorful: "#94a3b8",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
    },
    "✅": {
      name: "check-circle",
      colorful: "#22c55e",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    },
    "✓": {
      name: "check",
      colorful: "#22c55e",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    },
    "✗": {
      name: "x",
      colorful: "#ef4444",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    },
    "☐": {
      name: "square",
      colorful: "#94a3b8",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
    },
    "☑": {
      name: "check-square",
      colorful: "#22c55e",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 12 2 2 4-4"/></svg>',
    },

    // Theme icons
    "💎": {
      name: "gem",
      colorful: "#10b981",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>',
    },
    "🌲": {
      name: "tree-pine",
      colorful: "#22c55e",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"/><path d="M12 22v-3"/></svg>',
    },
    "🌊": {
      name: "waves",
      colorful: "#0ea5e9",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>',
    },
    "💠": {
      name: "diamond",
      colorful: "#3b82f6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"/></svg>',
    },
    "🔮": {
      name: "circle-dot",
      colorful: "#a855f7",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/></svg>',
    },
    "💜": {
      name: "heart",
      colorful: "#a855f7",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
    },
    "❤️": {
      name: "heart",
      colorful: "#ef4444",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
    },
    "🌹": {
      name: "flower-2",
      colorful: "#f43f5e",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1"/><circle cx="12" cy="8" r="2"/><path d="M12 10v12"/><path d="M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z"/><path d="M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z"/></svg>',
    },
    "🍯": {
      name: "droplet",
      colorful: "#f59e0b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>',
    },
    "🪨": {
      name: "mountain",
      colorful: "#64748b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>',
    },
    "⬛": {
      name: "square",
      colorful: "#1e293b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>',
    },

    // Settings/Features icons
    "⚙️": {
      name: "settings",
      colorful: "#64748b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
    },
    "🏠": {
      name: "home",
      colorful: "#3b82f6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    },
    "🕌": {
      name: "landmark",
      colorful: "#10b981",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock-fading-icon lucide-clock-fading"><path d="M12 2a10 10 0 0 1 7.38 16.75"/><path d="M12 6v6l4 2"/><path d="M2.5 8.875a10 10 0 0 0-.5 3"/><path d="M2.83 16a10 10 0 0 0 2.43 3.4"/><path d="M4.636 5.235a10 10 0 0 1 .891-.857"/><path d="M8.644 21.42a10 10 0 0 0 7.631-.38"/></svg>',
    },
    "🧭": {
      name: "compass",
      colorful: "#f59e0b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
    },
    "📅": {
      name: "calendar",
      colorful: "#6366f1",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    },
    "🌦️": {
      name: "cloud-rain-wind",
      colorful: "#0ea5e9",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m9.2 22 3-7"/><path d="m9 13-3 7"/><path d="m17 13-3 7"/></svg>',
    },
    "🍽️": {
      name: "utensils",
      colorful: "#f97316",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>',
    },
    "✍️": {
      name: "pen-tool",
      colorful: "#ec4899",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',
    },
    "📋": {
      name: "clipboard-list",
      colorful: "#6366f1",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>',
    },
    "📓": {
      name: "book",
      colorful: "#8b5cf6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>',
    },

    // Additional misc icons
    "+": {
      name: "plus",
      colorful: "#22c55e",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
    },
    "✚": {
      name: "plus",
      colorful: "#22c55e",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
    },
    "×": {
      name: "x",
      colorful: "#ef4444",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    },
    "🔎︎": {
      name: "search",
      colorful: "#3b82f6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    },
    // Quote glyph intentionally kept as emoji (❝)

    // Weather icons
    "☁️": {
      name: "cloud",
      colorful: "#94a3b8",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>',
    },
    "☁": {
      name: "cloud",
      colorful: "#94a3b8",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>',
    },
    "🌫️": {
      name: "cloud-fog",
      colorful: "#9ca3af",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 17H7"/><path d="M17 21H9"/></svg>',
    },
    "🌫": {
      name: "cloud-fog",
      colorful: "#9ca3af",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 17H7"/><path d="M17 21H9"/></svg>',
    },
    "🌧️": {
      name: "cloud-rain",
      colorful: "#3b82f6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>',
    },
    "🌧": {
      name: "cloud-rain",
      colorful: "#3b82f6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>',
    },
    "🌨️": {
      name: "cloud-snow",
      colorful: "#60a5fa",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 15h.01"/><path d="M8 19h.01"/><path d="M12 17h.01"/><path d="M12 21h.01"/><path d="M16 15h.01"/><path d="M16 19h.01"/></svg>',
    },
    "🌨": {
      name: "cloud-snow",
      colorful: "#60a5fa",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 15h.01"/><path d="M8 19h.01"/><path d="M12 17h.01"/><path d="M12 21h.01"/><path d="M16 15h.01"/><path d="M16 19h.01"/></svg>',
    },
    "❄️": {
      name: "snowflake",
      colorful: "#93c5fd",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/></svg>',
    },
    "❄": {
      name: "snowflake",
      colorful: "#93c5fd",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/></svg>',
    },
    "⛈️": {
      name: "cloud-lightning",
      colorful: "#fbbf24",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/></svg>',
    },
    "⛈": {
      name: "cloud-lightning",
      colorful: "#fbbf24",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/></svg>',
    },
    "🌡️": {
      name: "thermometer",
      colorful: "#ef4444",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>',
    },
    "🌡": {
      name: "thermometer",
      colorful: "#ef4444",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>',
    },

    // Bookmark/Star icons
    "⭐": {
      name: "star-filled",
      colorful: "#fbbf24",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    },
    "☆": {
      name: "star",
      colorful: "#fbbf24",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    },
    "📑": {
      name: "bookmark",
      colorful: "#f59e0b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>',
    },

    // Arrow/Navigation icons
    "←": {
      name: "arrow-left",
      colorful: "#64748b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>',
    },
    "→": {
      name: "arrow-right",
      colorful: "#64748b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
    },

    // Status/Info icons
    "⚠️": {
      name: "alert-triangle",
      colorful: "#f59e0b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    },
    "⚠": {
      name: "alert-triangle",
      colorful: "#f59e0b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    },
    ℹ: {
      name: "info",
      colorful: "#3b82f6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    },
    "🔍": {
      name: "search",
      colorful: "#3b82f6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    },
    // Action icons
    "➕": {
      name: "plus-circle",
      colorful: "#22c55e",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>',
    },
    "➖": {
      name: "minus-circle",
      colorful: "#ef4444",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>',
    },
    "🔒": {
      name: "lock",
      colorful: "#6b7280",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    },
    "🔓": {
      name: "unlock",
      colorful: "#22c55e",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',
    },

    // Extra UI icons found in static HTML
    "☕": {
      name: "coffee",
      colorful: "#a16207",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v2"/><path d="M14 2v2"/><path d="M6 8h12"/><path d="M6 8v8a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V8"/><path d="M18 11h1a3 3 0 0 1 0 6h-1"/></svg>',
    },
    "☢": {
      name: "radiation",
      colorful: "#f59e0b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12v.01"/><path d="M14.5 9.5 16 8"/><path d="M9.5 9.5 8 8"/><path d="M14.5 14.5 16 16"/><path d="M9.5 14.5 8 16"/><path d="M20 12a8 8 0 1 1-16 0"/></svg>',
    },
    "☢️": {
      name: "radiation",
      colorful: "#f59e0b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12v.01"/><path d="M14.5 9.5 16 8"/><path d="M9.5 9.5 8 8"/><path d="M14.5 14.5 16 16"/><path d="M9.5 14.5 8 16"/><path d="M20 12a8 8 0 1 1-16 0"/></svg>',
    },
    "⛰": {
      name: "mountain",
      colorful: "#16a34a",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3Z"/></svg>',
    },
    "🌍": {
      name: "globe",
      colorful: "#3b82f6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/></svg>',
    },
    "🌐": {
      name: "globe",
      colorful: "#3b82f6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/></svg>',
    },
    "🌟": {
      name: "star",
      colorful: "#f59e0b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a1 1 0 0 0 .757.547l5.163.75a.53.53 0 0 1 .294.904l-3.736 3.64a1 1 0 0 0-.287.885l.882 5.142a.53.53 0 0 1-.771.56l-4.618-2.43a1 1 0 0 0-.93 0l-4.618 2.43a.53.53 0 0 1-.771-.56l.882-5.142a1 1 0 0 0-.287-.885L2.911 9.175a.53.53 0 0 1 .294-.904l5.163-.75a1 1 0 0 0 .757-.547l2.31-4.679Z"/></svg>',
    },
    "🐞": {
      name: "bug",
      colorful: "#ef4444",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3 3 0 0 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3c0 3.3-2.7 6-6 6Z"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.35 3 6.6 3 4"/><path d="M6 13H2"/><path d="M3 20c0-2.1 1.7-3.9 3.8-4"/><path d="M17.47 9C19.4 8.35 21 6.6 21 4"/><path d="M18 13h4"/><path d="M21 20c0-2.1-1.7-3.9-3.8-4"/></svg>',
    },
    "💝": {
      name: "heart",
      colorful: "#ef4444",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.63 0L12 5.37l-.79-.79a5.4 5.4 0 0 0-7.63 7.63L12 20.63l8.42-8.42a5.4 5.4 0 0 0 0-7.63z"/></svg>',
    },
    "💧": {
      name: "droplet",
      colorful: "#3b82f6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-4-7-13-7-13S5 11 5 15a7 7 0 0 0 7 7z"/></svg>',
    },
    "💨": {
      name: "wind",
      colorful: "#60a5fa",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 0-3.4 3.6H3"/><path d="M9.6 4.6A2.5 2.5 0 1 1 12 9H3"/><path d="M12.6 19.4A2.5 2.5 0 1 0 15 15H3"/></svg>',
    },
    "💬": {
      name: "message-circle",
      colorful: "#3b82f6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>',
    },
    "💾": {
      name: "save",
      colorful: "#6b7280",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z"/><path d="M17 21v-7H7v7"/><path d="M7 3v5h8"/></svg>',
    },
    "🎙": {
      name: "mic",
      colorful: "#a855f7",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="23"/><line x1="8" x2="16" y1="23" y2="23"/></svg>',
    },
    "🎙️": {
      name: "mic",
      colorful: "#a855f7",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="23"/><line x1="8" x2="16" y1="23" y2="23"/></svg>',
    },
    "📭": {
      name: "inbox",
      colorful: "#6b7280",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
    },
    "📁": {
      name: "folder",
      colorful: "#f59e0b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h5l2 3h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>',
    },
    "📇": {
      name: "contact",
      colorful: "#3b82f6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6"/><path d="M6 2h12a2 2 0 0 1 2 2v2H4V4a2 2 0 0 1 2-2Z"/><path d="M8 14a3 3 0 1 0 6 0"/><path d="M9 16h6"/></svg>',
    },
    "📌": {
      name: "pin",
      colorful: "#ef4444",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 2h6l1 7 3 3-7 2-7-2 3-3 1-7z"/></svg>',
    },
    "📜": {
      name: "scroll",
      colorful: "#a16207",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-library-big-icon lucide-library-big"><rect width="8" height="18" x="3" y="3" rx="1"/><path d="M7 3v18"/><path d="M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z"/></svg>',
    },
    "📤": {
      name: "upload",
      colorful: "#3b82f6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>',
    },
    "📥": {
      name: "download",
      colorful: "#3b82f6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
    },
    "📦": {
      name: "package",
      colorful: "#f59e0b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
    },
    "📿": {
      name: "sparkles",
      colorful: "#a855f7",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-a-icon lucide-book-a"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/><path d="m8 13 4-7 4 7"/><path d="M9.1 11h5.7"/></svg>',
    },
    "🔄": {
      name: "refresh-cw",
      colorful: "#3b82f6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9 9 0 0 0-6.3 2.6L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9 9 0 0 0 6.3-2.6L21 16"/><path d="M21 21v-5h-5"/></svg>',
    },
    "🔔": {
      name: "bell",
      colorful: "#f59e0b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A2 2 0 0 0 4 17h16a2 2 0 0 0 .738-1.674C19.744 13.327 18 11 18 8a6 6 0 1 0-12 0c0 3-1.744 5.327-2.738 7.326"/></svg>',
    },
    "🔖": {
      name: "bookmark",
      colorful: "#f59e0b",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    },
    "🔤": {
      name: "type",
      colorful: "#6b7280",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></svg>',
    },
    "🕋": {
      name: "kaaba",
      colorful: "#d4af37",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"> <path d="M2.69 6.45L12 9.35l9.31-2.91L12 3.54 2.69 6.45zm8.92-4.84c.25-.08.53-.08.78 0l10.45 3.27c.54.17.91.67.91 1.25v1.52l-11.56 3.61c-.13.04-.26.04-.39 0L.24 7.64V6.12c0-.57.37-1.08.92-1.25L11.61 1.61zm.98 10.89l11.17-3.49v1.9l-2.16.67c-.34.11-.53.47-.43.82.11.34.47.53.82.43l1.77-.55v5.6c0 .57-.37 1.08-.92 1.25l-10.45 3.27c-.25.08-.53.08-.78 0l-10.45-3.27c-.55-.17-.92-.68-.92-1.25v-5.6l1.76.55c.34.11.71-.09.82-.43.11-.34-.09-.71-.43-.82L.24 10.91V9.01l11.18 3.49c.38.12.79.12 1.17 0zm-7.57-.11c-.34-.11-.71.09-.82.43-.11.34.09.71.43.82l2.61.82c.34.11.71-.09.82-.43.11-.34-.09-.71-.43-.82l-2.61-.82zm14.37 1.25c.34-.11.53-.47.43-.82-.11-.34-.47-.53-.82-.43l-2.61.82c-.34.11-.53.47-.43.82.11.34.47.53.82.43l2.61-.82zm-9.15.39c-.34-.11-.71.09-.82.43-.11.34.09.71.43.82l1.57.49c.38.12.79.12 1.17 0l1.57-.49c.34-.11.53-.47.43-.82-.11-.34-.47-.53-.82-.43l-1.57.49c-.13.04-.26.04-.39 0l-1.57-.49z"/></svg>',
    },
    "🕐": {
      name: "clock",
      colorful: "#3b82f6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14.5 13.5"/></svg>',
    },
    "🖼": {
      name: "image",
      colorful: "#3b82f6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
    },
    "🖼️": {
      name: "image",
      colorful: "#3b82f6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
    },
    "🗺": {
      name: "map",
      colorful: "#3b82f6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-6l-6-2v6"/><path d="M9 21V7l-6-2v14"/><path d="M15 21l6-2V5l-6 2"/><path d="M15 5l-6 2"/></svg>',
    },
    "🗺️": {
      name: "map",
      colorful: "#3b82f6",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-6l-6-2v6"/><path d="M9 21V7l-6-2v14"/><path d="M15 21l6-2V5l-6 2"/><path d="M15 5l-6 2"/></svg>',
    },
    "🥗": {
      name: "utensils",
      colorful: "#22c55e",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h1v11"/><path d="M7 2v20"/><path d="M21 15V2h-3v13a3 3 0 0 1-3 3h-1v4"/></svg>',
    },
    "🧩": {
      name: "puzzle",
      colorful: "#a855f7",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.44 7.85a2 2 0 0 0-2.83 0l-.71.71V6a2 2 0 0 0-2-2h-2.56l.71-.71a2 2 0 1 0-2.83 0L7.44 4H5a2 2 0 0 0-2 2v2.56l.71-.71a2 2 0 1 1 2.83 2.83l-.71.71H3V16a2 2 0 0 0 2 2h2.56l-.71.71a2 2 0 1 0 2.83 0l.71-.71H14a2 2 0 0 0 2-2v-2.56l.71.71a2 2 0 1 0 2.83-2.83l-.71-.71V10a2 2 0 0 0 0-2.15Z"/></svg>',
    },
    "🧹": {
      name: "brush",
      colorful: "#6b7280",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11 8-8 4 4-8 8"/><path d="M21 7l-4-4"/><path d="M3 21c0-3 2-5 5-5 2 0 3 1 3 3 0 3-2 5-5 5-2 0-3-1-3-3Z"/></svg>',
    },
  };

  constructor(storage) {
    this.storage = storage;
    this._currentTheme = "emoji";
    this._isDarkMode = true;
    this.init();
  }

  init() {
    this.loadSettings();
    this.applyIconTheme();

    // Initial pass for static HTML emojis (cards, settings tabs, etc.)
    this._scheduleDomIconify();

    // Listen for theme mode changes
    document.addEventListener("md:theme-change", (e) => {
      this._isDarkMode = e.detail.mode === "dark";
      this.applyIconTheme();
    });
  }

  loadSettings() {
    const settings = this.storage.getSettings();
    this._currentTheme = settings.iconTheme || "colorful";
    this._isDarkMode = (settings.theme?.mode || "dark") === "dark";
  }

  saveSettings() {
    const settings = this.storage.getSettings();
    settings.iconTheme = this._currentTheme;
    this.storage.saveSettings(settings);
  }

  getCurrentTheme() {
    return this._currentTheme;
  }

  setTheme(themeId, save = true) {
    if (!IconThemeManager.ICON_THEMES[themeId]) {
      themeId = "emoji";
    }
    this._currentTheme = themeId;
    this.applyIconTheme();
    this.applyDomIconReplacements(document);
    if (save) {
      this.saveSettings();
    }
    // Dispatch event for components to update
    document.dispatchEvent(
      new CustomEvent("md:icon-theme-change", {
        detail: { theme: themeId },
      }),
    );
  }

  _scheduleDomIconify() {
    const run = () => {
      try {
        this.applyDomIconReplacements(document);
      } catch (e) {
        // ignore
      }
      this._setupDomObserver();
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run, { once: true });
    } else {
      run();
    }
  }

  _setupDomObserver() {
    if (this._domIconObserver) return;
    if (!document.body) return;

    this._domIconObserver = new MutationObserver((mutations) => {
      if (this._currentTheme === "emoji") return;
      for (const m of mutations) {
        for (const n of m.addedNodes) {
          if (n && n.nodeType === 1) {
            this.applyDomIconReplacements(n);
          }
        }
      }
    });

    this._domIconObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  applyDomIconReplacements(root = document) {
    if (!root || typeof root.querySelectorAll !== "function") return;

    // Icon-only containers
    const iconOnly = root.querySelectorAll(
      [
        ".card-icon",
        ".quote-icon",
        ".kaaba-icon",
        ".weather-icon",
        ".weather-detail-icon",
        ".prayer-settings-icon",
        ".visibility-icon",
        ".credits-icon",
        ".support-feedback-badge",
        ".delete-confirm-icon",
        ".theme-mode-icon",
        ".icon-theme-sample",
        ".mode-icon",
        ".card-blur-btn",
        ".blur-popup-title-icon",
        ".blur-glass-option-icon",
        ".pq-bookmark-empty-icon",
        ".auto-icon",
        ".calendar-nav-btn",
        ".search-bar-btn",
        ".search-bar-engine-arrow",
      ].join(","),
    );
    iconOnly.forEach((el) => this._applyIconOnlyElement(el));

    // Emoji + label text elements
    const textEls = root.querySelectorAll(
      [
        ".settings-tab",
        ".modal-title",
        ".setting-btn",
        ".modal-btn",
        ".delete-confirm-btn",
        ".theme-palette-mode-btn",
        ".blur-popup-title",
        ".blur-glass-option-title",
        ".pq-bookmark-modal-title",
      ].join(","),
    );
    textEls.forEach((el) => this._applyTextElement(el));
  }

  _applyIconOnlyElement(el) {
    if (!el || el.nodeType !== 1) return;

    // Keep the Emoji theme preview card showing emojis even when a Lucide theme
    // is active (so the user can still see what “Emoji” means).
    if (
      this._currentTheme !== "emoji" &&
      el.classList?.contains("icon-theme-sample") &&
      el.closest?.('.icon-theme-card[data-icon-theme="emoji"]')
    ) {
      const emoji = this._getOrStoreOriginalText(el);
      if (emoji) {
        el.textContent = emoji;
      }
      return;
    }

    const alreadyProcessed = !!(el.dataset && el.dataset.mdIconifyOriginal);
    if (!alreadyProcessed && el.children && el.children.length) return;

    const emoji = this._getOrStoreOriginalText(el);
    if (!emoji) return;

    const fontSize = parseFloat(getComputedStyle(el).fontSize);
    const size = Number.isFinite(fontSize)
      ? Math.max(12, Math.round(fontSize))
      : 24;

    if (this._currentTheme === "emoji") {
      el.textContent = emoji;
      return;
    }

    el.innerHTML = this.getIcon(emoji, { size });
  }

  _applyTextElement(el) {
    if (!el || el.nodeType !== 1) return;

    const alreadyProcessed = !!(el.dataset && el.dataset.mdIconifyOriginal);
    if (!alreadyProcessed && el.children && el.children.length) return;

    const original = this._getOrStoreOriginalText(el);
    if (!original) return;

    if (this._currentTheme === "emoji") {
      el.textContent = original;
      return;
    }

    // Settings tabs + modal titles should use smaller, inline icons.
    el.innerHTML = this.replaceEmojisInText(original, {
      size: 16,
      inline: true,
    });
  }

  _getOrStoreOriginalText(el) {
    if (el.dataset && el.dataset.mdIconifyOriginal) {
      return el.dataset.mdIconifyOriginal;
    }

    const text = String(el.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return "";

    if (el.dataset) {
      el.dataset.mdIconifyOriginal = text;
    }
    return text;
  }

  getThemes() {
    return Object.values(IconThemeManager.ICON_THEMES);
  }

  /**
   * Get icon for a given emoji/key
   * @param {string} emoji - The emoji or icon key
   * @param {object} options - Options for rendering
   * @returns {string} HTML string for the icon
   */
  getIcon(emoji, options = {}) {
    const {
      size = 24,
      className = "",
      inline = false,
      ariaHidden = true,
    } = options;

    if (this._currentTheme === "emoji") {
      return emoji;
    }

    const iconData = IconThemeManager.ICON_MAP[emoji];
    if (!iconData) {
      return emoji; // Fallback to emoji if no mapping
    }

    let color;
    if (this._currentTheme === "colorful") {
      color = iconData.colorful;
    } else {
      // Monochrome - use theme text color
      color = "currentColor";
    }

    // Parse SVG and update attributes
    const svgWithColor = iconData.svg
      .replace(/width="24"/g, `width="${size}"`)
      .replace(/height="24"/g, `height="${size}"`)
      .replace(/stroke="currentColor"/g, `stroke="${color}"`)
      .replace(/fill="currentColor"/g, `fill="${color}"`);

    const wrapperClass = `icon-theme-svg${className ? ` ${className}` : ""}${
      inline ? " icon-inline" : ""
    }`;
    const ariaAttr = ariaHidden ? 'aria-hidden="true"' : "";

    return `<span class="${wrapperClass}" ${ariaAttr} data-icon="${iconData.name}">${svgWithColor}</span>`;
  }

  /**
   * Get just the SVG element (for direct DOM insertion)
   * @param {string} emoji
   * @param {object} options
   * @returns {SVGElement|null}
   */
  getSVGElement(emoji, options = {}) {
    const { size = 24 } = options;

    const iconData = IconThemeManager.ICON_MAP[emoji];
    if (!iconData || this._currentTheme === "emoji") {
      return null;
    }

    let color;
    if (this._currentTheme === "colorful") {
      color = iconData.colorful;
    } else {
      color = "currentColor";
    }

    const temp = document.createElement("div");
    temp.innerHTML = iconData.svg;
    const svg = temp.querySelector("svg");

    if (svg) {
      svg.setAttribute("width", size);
      svg.setAttribute("height", size);
      if (color !== "currentColor") {
        svg.setAttribute("stroke", color);
        if (svg.querySelector('[fill="currentColor"]')) {
          svg.querySelectorAll('[fill="currentColor"]').forEach((el) => {
            el.setAttribute("fill", color);
          });
        }
      }
    }

    return svg;
  }

  /**
   * Replace emoji in text with icons
   * @param {string} text - Text containing emojis
   * @param {object} options - Icon options
   * @returns {string} Text with icons
   */
  replaceEmojisInText(text, options = {}) {
    if (this._currentTheme === "emoji") {
      return text;
    }

    let result = text;
    for (const emoji of Object.keys(IconThemeManager.ICON_MAP)) {
      if (result.includes(emoji)) {
        result = result.replace(
          new RegExp(this._escapeRegex(emoji), "g"),
          this.getIcon(emoji, { ...options, inline: true }),
        );
      }
    }
    return result;
  }

  _escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Apply icon theme CSS variables
   */
  applyIconTheme() {
    const root = document.documentElement;
    root.dataset.iconTheme = this._currentTheme;

    // Update CSS variable for monochrome icon color
    if (this._currentTheme === "monochrome") {
      root.style.setProperty("--icon-mono-color", "var(--text-primary)");
    }
  }

  /**
   * Check if an emoji has a Lucide mapping
   * @param {string} emoji
   * @returns {boolean}
   */
  hasMapping(emoji) {
    return IconThemeManager.ICON_MAP.hasOwnProperty(emoji);
  }

  /**
   * Get all available icon mappings
   * @returns {object}
   */
  getMappings() {
    return IconThemeManager.ICON_MAP;
  }
}

// Export for use
window.IconThemeManager = IconThemeManager;
