# TODO

## General

- [] Make sure that when it's the last day of Ramadhan, the `Fasting times` says `Last day` instead `Today`
- [] Changes GB to EN.
- [] Add delete button directly beside the notes item list.
- [] Language button (EN/GB/ID) is way too large, let's make it compact.
- [] Mark fasting in the calendar.
- [] Add +/- buttons in the pocket quran Arabic and Translation sliders.
- [] Hide `Moments` component setting if DEBUG MODE is set to OFF
- [] Drag and dropping the pinned app items will trigger the browser blue highlight, fix this so it will not trigger it.
- [] Increase the custom background limits.

## Markdown Editor

- [x] Let's rework the Notes component (id:`notesCard`) to become a live WYSIWYG editor that can be toggled between preview and editing mode, make sure you can live edit in both modes. Let's copy `https://github.com/benweet/stackedit/` functionality.
- [x] Rework/rewrite all the buttons in the editor to complement to what is possible in markdown, including image. (let's just copy the navbar buttons of the StackEdit `https://github.com/benweet/stackedit/`)
- [x] Make sure that the notes live editor/preview can spawn horizontal scroll bar when there's embedded image/medi that is bigger than the lived editor size.
- [x] Redesign the notes selector to make sure the live editor/preview is able to use all the notesCard component's width. Instead of separating the component into two columns between the notes selector (left column) and the live editor/preview (right column), put the note selector on the top so that the whole component only have a single column (maximize width usage). Now the notes selector is horizontally oriented with beautiful previous and next buttons to navigate on the left and on the right of the element.
- [] Add basic keyboard shortcuts when hovering/using the live editor for all the common buttons like bold, italic, underline, headings, etc.

## Prayer Times

- [] Add (mins) to offest in Prayer Times setting.
- [] Make `Custom Fajr Angle` setting more compact, place `Custom Fajr Angle` and `Custom Isha Setting` in the same row.

## Enhancements & UI/UX

- [] Relocate the "Delete Note" button. Move it to be displayed on or next to the note's name.
