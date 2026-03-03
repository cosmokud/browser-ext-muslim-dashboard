// Global runtime flags for the dashboard.
//
// Debug tab is only shown when this flag is true.
// Set to true for local development/troubleshooting.
//
// NOTE: We intentionally attach to globalThis so all scripts can read it.
globalThis.ENABLE_DEBUG_MODE = false;
