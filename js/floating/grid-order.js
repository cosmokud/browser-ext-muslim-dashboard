/**
 * FloatingModeManager: grid position ordering for reinsertion.
 * Part of the class declared in js/floating/index.js; load this after it.
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
})(FloatingModeManager.prototype, class {

  _getGridPositionOrder(key) {
    const orderMap = {
      quotes: 50,
      prayerTimes: 100,
      fasting: 110,
      hijriCalendar: 120,
      flashcards: 200,
      adhkar: 210,
      hadith: 300,
      todoList: 400,
      qiblaDirection: 410,
      lunarPhase: 420,
    };
    return orderMap[key] ?? 500;
  }

  _findInsertReferenceByOrder(parent, targetOrder) {
    if (!parent) return null;

    const cardIdToKey = {
      quoteSection: "quotes",
      prayerTimesCard: "prayerTimes",
      calendarCard: "hijriCalendar",
      fastingCard: "fasting",
      adhkarCard: "adhkar",
      hadithCard: "hadith",
      qiblaCard: "qiblaDirection",
      lunarPhaseCard: "lunarPhase",
      flashcardCard: "flashcards",
      todoCard: "todoList",
    };

    const children = Array.from(parent.children);
    for (const child of children) {
      const childKey = cardIdToKey[child.id];
      if (childKey) {
        const childOrder = this._getGridPositionOrder(childKey);
        if (childOrder > targetOrder) {
          return child;
        }
      }
    }
    return null;
  }
});
