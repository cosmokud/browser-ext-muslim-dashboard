# Glossary

Domain terms as this codebase uses them. Architecture vocabulary is not repeated
here; see the codebase-design glossary.

## Islamic day

The civil day a Hijri date is read from: the device's **local calendar date**,
never a UTC day. The day turns at local midnight. All surfaces read it from
`js/islamic-day.js`, so the calendar, the fasting card, the header date, the
popup and the service worker cannot disagree about which day it is.

## Hijri adjustment

The user's ±days correction (`hijriAdjustment`) applied to the calendar date
before conversion, not to the converted date. Applied once, inside
`js/islamic-day.js`; callers pass a settings snapshot and ask for a day.

## Calculator configuration

The settings that configure prayer-time calculation: method, custom Fajr/Isha
angles, Asr method, high-latitude method, midnight method, Duha offset, and
tune offsets. Applied once, inside `js/islamic-day.js`. The calculation itself
stays in `js/praytimes.js`.

## Fasting day

A day that calls for a fast: Ramadan, Arafah, the first nine days of Dhu
al-Hijjah, Tasu'a, Ashura, Ayyam al-Beed (13th–15th, Ramadan excepted), Monday,
Thursday. Precedence is Ramadan first, weekdays last. One predicate lives in
`js/islamic-day.js`; surfaces keep their own visibility preference
(`fasting.visibility` for the card, `fasting.notifications.notify` for alerts).

## Prohibited fast day

A day on which fasting is not observed: Eid al-Fitr (1 Shawwal), Eid al-Adha
(10 Dhu al-Hijjah), and the Days of Tashreeq (11–13 Dhu al-Hijjah). Never a
fasting day: the predicate returns no fast for it, whatever else the day would
have matched. The calendar's day dots, the fasting card and its window search
all read the one predicate in `js/islamic-day.js`; none of them keeps its own
list of the three.

## Surface opacity

The resting transparency level applied to dashboard cards, their nested
sub-surfaces, borders, and backdrop blur. At `0%`, resting fills, borders, and
blur disappear completely while active, semantic, hover, and focus indicators
remain visible.

## Glass opacity

The transparency level governing chrome glass surfaces — modal inner controls,
the FAB menu, toasts, and the popup shell — independently of dashboard card
surface opacity.

## Modal opacity

The background opacity shared by all overlays — modals, confirmation dialogs,
context menus, dropdowns, and floating popovers — independently of dashboard
card opacity.

## Accent opacity

The opacity level governing all primary buttons, active, selected, and pressed
states, range slider fills, and checked toggles uniformly across the dashboard,
modals, and popup, with `0%` rendering fills fully transparent and `100%` fully
solid.

## Surface tier

One of the ordered visual roles inside a card or overlay (panel, inset,
control, border, highlight), each scaling from the local surface opacity and
adapting to the active light or dark theme mode.

## Theme token

A canonical color, RGB channel, or surface value derived from the active theme
and mode so the dashboard, popup, and feature panels never diverge on palette
or status colors.
