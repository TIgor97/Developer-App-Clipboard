# App Clipboard

A Chrome Extension (Manifest V3) for fast, reliable copying of developer notes, URLs, and presets. It provides a compact, modern popup UI optimized for daily dev workflows, with one‑click copy, quick search, tags, and import/export.

## Highlights

- **Instant copy** of notes with one click.
- **Search + tag filtering** for quick access.
- **Favorites & archiving** to keep the list clean.
- **Copy presets** (tag bundles with format selection).
- **Copy formats**: content only, title + content, links only, JSON.
- **Bulk actions**: copy filtered notes or just links.
- **Import/Export** JSON for backup or sharing.
- **Restore defaults** to reseed common notes and presets.
- **Swagger shortcut** with editable URL.
- **Keyboard shortcuts** for power users.

## UI Overview

The popup is designed to be compact (similar to Google Calendar extension size) with a readable 11px type size. It includes:

- Header with app title + **New** note button
- Search input
- Action controls (copy format, bulk copy, archived toggle, links copy)
- Swagger quick action (open/edit)
- Import / Export / Restore defaults
- Tag filter chips
- Preset list (click to copy, Edit/Delete actions)
- Notes list with per‑note actions
- Footer with note count and attribution

## Data Model

- **Note**: title, content, categories (tags), favorite, archived, updatedAt
- **Category**: derived from note tags (many‑to‑many)
- **Preset**: named bundle of tags and copy format

Data is stored locally using `chrome.storage.local` under the key:

```
appClipboardData
```

## Features in Detail

### Notes
- Create, edit, duplicate, archive, delete
- Favorite notes for quick filtering
- Click a note card to copy content immediately
- Link detection turns URLs into clickable links

### Presets
- Click a preset to copy matching notes
- Edit presets via modal (name, tags, format)
- Delete presets when no longer needed

### Filters
- Tag chips (All + Favorites + dynamic tags)
- Search by title, content, or tags
- Archived toggle (show/hide archived notes)

### Copy Options
- **Content only**
- **Title + Content**
- **Links only** (extracted URLs)
- **JSON**

### Import / Export
- Export full app data as JSON
- Import JSON (merges defaults and imported data)

### Restore Defaults
Reseeds the extension with the original useful notes and presets.

### Swagger Shortcut
- **Edit Swagger** sets the URL
- **Open Swagger** opens the saved URL in a new tab

## Keyboard Shortcuts

- **Ctrl/Cmd + N**: New note
- **Ctrl/Cmd + S**: Save note (when editor open)
- **Ctrl/Cmd + F**: Focus search
- **Ctrl/Cmd + K**: Focus and select search
- **Esc**: Close editor

## Install (Developer Mode)

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select the `App Clipboard` folder.
5. Pin the extension for quick access.

## Project Structure

```
App Clipboard/
├─ icons/
├─ manifest.json
├─ popup.html
├─ popup.css
└─ popup.js
```

## Permissions

- **storage** – to persist notes locally
- **clipboardWrite** – to copy content to clipboard

## Attribution

Made by Igor Trifunovic 2026
